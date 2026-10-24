import hmac
import json
import os
from pathlib import Path

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException

from . import llm, prompts, rules
from .schemas import CHANNEL, TASKS, Case, ItemSet

DEV = os.getenv("AI_ENV", "dev") == "dev"
MODES = {"live": ("llm", "cache", "rules"), "demo": ("cache", "llm", "rules"), "offline": ("cache", "rules")}

cache_file = Path(__file__).parent.parent / "data" / "demo_cache.json"
raw_cache = json.loads(cache_file.read_text(encoding="utf-8")) if cache_file.is_file() else {}
CACHE = {task: {key: TASKS[task].model_validate(value) for key, value in items.items()}
         for task, items in raw_cache.items() if task in TASKS}


def check_key(x_service_key: str | None = Header(None)):
    expected = os.getenv("AI_SERVICE_KEY", "")
    if not expected or not x_service_key or not hmac.compare_digest(x_service_key.encode(), expected.encode()):
        raise HTTPException(401, "Invalid service key")


def reply(data, source: str, provider: str | None) -> dict:
    out = data.model_dump()
    if "channel_severity" in out:
        out["channel_severity"] = CHANNEL[data.severity]
    warnings = ["Rule-based fallback: AI unavailable. Check manually."] if source == "rules" else []
    return {"suggestion": True, "source": source, "provider": provider, "confidence": data.confidence,
            "low_confidence": data.confidence < 0.5, "warnings": warnings, "data": out}


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
    return (f"category hint: {case.category}\nsender severity: {case.suggested_severity}\n"
            f"region: {case.region}\nreport: {case.description}")


def set_text(body: ItemSet) -> str:
    return "\n".join(f"{i.id} | {i.category} | {i.severity} | {i.age_minutes} min | {i.description}"
                     for i in body.items)


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


app = FastAPI(title="AI Analytics Service", docs_url="/docs" if DEV else None, redoc_url=None,
              openapi_url="/openapi.json" if DEV else None)
router = APIRouter(prefix="/ai", dependencies=[Depends(check_key)])


@app.get("/ai/health")
def health():
    return {"status": "ok", "mode": os.getenv("AI_MODE", "live"), "providers": len(llm.configured())}


@router.post("/triage")
def triage(case: Case):
    out = run("triage", case.case_id, case_text(case), lambda: rules.triage(case))
    data = out["data"]
    if case.suggested_severity and CHANNEL[case.suggested_severity] != data["channel_severity"]:
        out["warnings"].append(f"AI rates this '{data['severity']}' but the sender suggested "
                               f"'{case.suggested_severity}'. A person should check.")
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


app.include_router(router)