import hmac
import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from . import llm, prompts, rules
from .schemas import CHANNEL, TASKS, AssistRequest, Case, ItemSet
from .startup import is_prod, validate_environment

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
log = logging.getLogger("ai")

DEV = not is_prod()
MODES = {"live": ("llm", "cache", "rules"), "demo": ("cache", "llm", "rules"), "offline": ("cache", "rules")}

cache_file = Path(__file__).parent.parent / "data" / "demo_cache.json"
raw_cache = json.loads(cache_file.read_text(encoding="utf-8")) if cache_file.is_file() else {}
CACHE = {
    task: {key: TASKS[task].model_validate(value) for key, value in items.items()}
    for task, items in raw_cache.items()
    if task in TASKS
}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    validate_environment()
    log.info(
        "EthioAlert AI ready env=%s mode=%s providers=%s",
        os.getenv("AI_ENV", "dev"),
        os.getenv("AI_MODE", "live"),
        ",".join(llm.configured()) or "none",
    )
    yield


def check_key(x_service_key: str | None = Header(None)):
    expected = (os.getenv("AI_SERVICE_KEY") or "").strip().lstrip("\ufeff")
    provided = (x_service_key or "").strip().lstrip("\ufeff")
    if not expected or not provided or not hmac.compare_digest(provided.encode(), expected.encode()):
        raise HTTPException(401, "Invalid service key")


def reply(data, source: str, provider: str | None) -> dict:
    out = data.model_dump()
    if "channel_severity" in out:
        out["channel_severity"] = CHANNEL[data.severity]
    warnings = ["Rule-based fallback: AI unavailable. Check manually."] if source == "rules" else []
    return {
        "suggestion": True,
        "source": source,
        "provider": provider,
        "confidence": data.confidence,
        "low_confidence": data.confidence < 0.5,
        "warnings": warnings,
        "data": out,
    }


def run(task: str, key: str | None, text: str, fallback, check=None) -> dict:
    for step in MODES.get(os.getenv("AI_MODE", "live"), MODES["live"]):
        if step == "cache" and key and key in CACHE.get(task, {}):
            return reply(CACHE[task][key], "cache", None)
        if step == "llm":
            got = llm.ask(TASKS[task], prompts.SYSTEM, prompts.user_message(task, llm.scrub(text)), check)
            if got:
                return reply(got[0], "llm", got[1])
    return reply(fallback(), "rules", None)


def case_text(case: Case) -> str:
    return (
        f"category hint: {case.category}\nsender severity: {case.suggested_severity}\n"
        f"region: {case.region}\nreport: {case.description}"
    )


def set_text(body: ItemSet) -> str:
    return "\n".join(
        f"{i.id} | {i.category} | {i.severity} | {i.age_minutes} min | {i.description}"
        for i in body.items
    )


def rank_is_valid(body: ItemSet):
    ids = sorted(i.id for i in body.items)

    def check(result) -> bool:
        if sorted(r.id for r in result.ranking) != ids:
            return False
        result.ranking.sort(key=lambda r: r.rank)
        for n, r in enumerate(result.ranking, 1):
            r.rank = n
        return True

    return check


app = FastAPI(
    title="EthioAlert AI Analytics Service",
    docs_url="/docs" if DEV else None,
    redoc_url=None,
    openapi_url="/openapi.json" if DEV else None,
    lifespan=lifespan,
)

_allowed_hosts = [h.strip() for h in os.getenv("AI_ALLOWED_HOSTS", "*").split(",") if h.strip()]
if _allowed_hosts != ["*"]:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=_allowed_hosts)

_cors = [o.strip() for o in os.getenv("AI_CORS_ORIGINS", "").split(",") if o.strip()]
if _cors:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Service-Key"],
    )

router = APIRouter(prefix="/ai", dependencies=[Depends(check_key)])


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("X-Frame-Options", "DENY")
    if not DEV:
        response.headers.setdefault("Cache-Control", "no-store")
    return response


@app.exception_handler(Exception)
async def unhandled_exception(_request: Request, exc: Exception):
    log.exception("unhandled error: %s", exc.__class__.__name__)
    detail = str(exc) if DEV else "Internal server error"
    return JSONResponse(status_code=500, content={"detail": detail})


@app.get("/ai/health")
def health():
    return {
        "status": "ok",
        "service": "ethioalert-ai",
        "env": os.getenv("AI_ENV", "dev"),
        "mode": os.getenv("AI_MODE", "live"),
        "providers": llm.configured(),
    }


@router.post("/triage")
def triage(case: Case):
    out = run("triage", case.case_id, case_text(case), lambda: rules.triage(case))
    data = out["data"]
    if case.suggested_severity and CHANNEL[case.suggested_severity] != data["channel_severity"]:
        out["warnings"].append(
            f"AI rates this '{data['severity']}' but the sender suggested "
            f"'{case.suggested_severity}'. A person should check."
        )
    return out


@router.post("/draft")
def draft(case: Case):
    return run("draft", case.case_id, case_text(case), lambda: rules.draft(case))


@router.post("/summary")
def summary(body: ItemSet):
    return run("summary", body.set_id, set_text(body), lambda: rules.summary(body))


@router.post("/rank")
def rank(body: ItemSet):
    return run("rank", body.set_id, set_text(body), lambda: rules.rank(body), rank_is_valid(body))


@router.post("/assist")
def assist(body: AssistRequest):
    """Role-aware EthioAlert AI chat (suggestions only)."""
    system = prompts.assist_system(body.role)
    user = llm.scrub(body.message)
    if body.context:
        user = f"Context:\n{llm.scrub(body.context)}\n\nQuestion:\n{user}"
    got = llm.ask_text(system, user)
    if got:
        text, provider = got
        return {"suggestion": True, "source": "llm", "provider": provider, "reply": text, "role": body.role}
    role = (body.role or "ADMINISTRATOR").upper()
    if role == "CITIZEN":
        fallback = (
            "EAi is temporarily offline. If you are in danger, move to safety and call local responders. "
            "You can still send an EthioAlert SOS from the app for urgent help."
        )
    else:
        fallback = (
            "AI providers are unreachable. Continue with human judgment: verify facts, escalate critical "
            "life-safety cases first, and do not delay response waiting for suggestions."
        )
    return {"suggestion": True, "source": "rules", "provider": None, "reply": fallback, "role": role}


app.include_router(router)
