"""App factory. Start with:  uvicorn app.main:create_app --factory --port 8088

Not exposed to the internet and not called by the apps: only the backend talks to this.
No CORS middleware on purpose, since browsers must never call it directly.
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import Settings, get_settings
from .core.breaker import CircuitBreaker
from .core.demo_cache import DemoCache
from .core.engine import Engine
from .core.llm_client import LLMClient
from .core.prompts import Prompts
from .core.providers import build_providers
from .core.regions import Regions
from .routes.ai import VERSION, public, router
from .security import RateLimiter


class JsonFormatter(logging.Formatter):
    """One JSON object per line. We log ids, timings and outcomes, never case text or prompts."""

    def format(self, record: logging.LogRecord) -> str:
        d = {"t": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created)),
             "level": record.levelname, "logger": record.name, "msg": record.getMessage()}
        d.update(getattr(record, "ctx", {}))
        return json.dumps(d, ensure_ascii=False)


def _setup_logging(level: str) -> None:
    h = logging.StreamHandler()
    h.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers[:] = [h]
    root.setLevel(level.upper())
    logging.getLogger("httpx").setLevel(logging.WARNING)  # httpx logs full URLs at INFO


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    settings.validate_runtime()
    _setup_logging(settings.log_level)
    log = logging.getLogger("ai.app")

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        regions = Regions(settings.data_dir)
        prompts = Prompts(settings.prompts_dir, settings.prompt_version, regions.ids)
        cache = DemoCache.load(settings.data_dir / "demo_cache.json")
        client = httpx.AsyncClient(follow_redirects=False)
        providers = [] if settings.mode == "offline" else build_providers(settings, client)
        llm = LLMClient(
            providers=providers,
            breakers={p.name: CircuitBreaker(settings.breaker_failures, settings.breaker_cooldown_s)
                      for p in providers},
            timeout=settings.request_timeout_s, temperature=settings.temperature,
            cooldown_s=settings.breaker_cooldown_s, max_concurrency=settings.max_concurrency,
        )
        app.state.engine = Engine(settings=settings, llm=llm, cache=cache, regions=regions, prompts=prompts)
        log.info("started", extra={"ctx": {"mode": settings.mode, "providers": [p.name for p in providers],
                                           "cache_entries": len(cache), "prompt": prompts.version}})
        yield
        await client.aclose()

    app = FastAPI(
        title="AI Analytics Service", version=VERSION, lifespan=lifespan,
        # API docs only in dev. In prod they'd just be a map for an attacker.
        docs_url="/docs" if settings.env == "dev" else None,
        redoc_url=None, openapi_url="/openapi.json" if settings.env == "dev" else None,
    )
    app.state.settings = settings
    app.state.limiter = RateLimiter(settings.rate_limit_per_min)
    app.state.auth_fail_limiter = RateLimiter(settings.failed_auth_per_min)

    @app.middleware("http")
    async def guard(request: Request, call_next):
        rid = uuid.uuid4().hex[:12]
        request.state.request_id = rid
        cl = request.headers.get("content-length")
        if cl and cl.isdigit() and int(cl) > settings.max_body_bytes:
            return _error(413, "payload_too_large", "Request body too large", rid)
        t0 = time.monotonic()
        resp = await call_next(request)
        resp.headers["X-Request-ID"] = rid
        resp.headers["Cache-Control"] = "no-store"
        resp.headers["X-Content-Type-Options"] = "nosniff"
        log.info("request", extra={"ctx": {"rid": rid, "method": request.method, "path": request.url.path,
                                           "status": resp.status_code,
                                           "ms": int((time.monotonic() - t0) * 1000)}})
        return resp

    def _error(status: int, code: str, message: str, rid: str, headers: dict | None = None):
        return JSONResponse({"error": {"code": code, "message": message, "request_id": rid}},
                            status_code=status, headers=headers)

    @app.exception_handler(StarletteHTTPException)
    async def http_error(request: Request, exc: StarletteHTTPException):
        return _error(exc.status_code, f"http_{exc.status_code}", str(exc.detail),
                      getattr(request.state, "request_id", "-"), getattr(exc, "headers", None))

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        # Field path + message only. FastAPI's default echoes the submitted value back,
        # which could be case text or a phone number.
        problems = [{"field": ".".join(str(p) for p in e["loc"] if p != "body"), "message": e["msg"]}
                    for e in exc.errors()]
        rid = getattr(request.state, "request_id", "-")
        return JSONResponse({"error": {"code": "validation_error", "message": "Invalid request",
                                       "request_id": rid, "problems": problems}}, status_code=422)

    @app.exception_handler(Exception)
    async def unexpected(request: Request, exc: Exception):
        rid = getattr(request.state, "request_id", "-")
        log.error("unhandled_error", extra={"ctx": {"rid": rid, "type": type(exc).__name__}})
        return _error(500, "internal_error", "Internal error", rid)

    app.include_router(public)
    app.include_router(router)
    return app
