"""HTTP layer: thin on purpose. Parse, authenticate, call the engine, return the envelope."""
from __future__ import annotations

import time

from fastapi import APIRouter, Depends, Request

from ..core.schemas import (
    AreaOut,
    CaseIn,
    DraftIn,
    DraftOut,
    Envelope,
    RankIn,
    RankOut,
    ResourcesOut,
    SummaryIn,
    SummaryOut,
    TriageOut,
)
from ..security import rate_limit, require_service_key

public = APIRouter(prefix="/ai/v1", tags=["health"])
router = APIRouter(prefix="/ai/v1", dependencies=[Depends(require_service_key), Depends(rate_limit)])

VERSION = "1.0.0"


def _engine(request: Request):
    return request.app.state.engine


def _rid(request: Request) -> str:
    return request.state.request_id


@public.get("/health")
async def health() -> dict:
    """Open on purpose (load balancers and Docker need it). Says nothing about config."""
    return {"status": "ok", "version": VERSION}


@router.get("/health/providers", tags=["health"])
async def health_providers(request: Request) -> dict:
    """For you on demo day: which provider is live, which are tripped, how fast, how often cache was used."""
    app = request.app.state
    llm = app.engine.llm
    providers = []
    for p in (llm.providers if llm else []):
        st, br = llm.stats[p.name], llm.breakers[p.name]
        providers.append({
            "name": p.name, "model": p.model, "breaker": br.state, "ok": st.ok, "failed": st.failed,
            "last_error": st.last_error, "last_latency_ms": st.last_latency_ms,
            "seconds_since_last_ok": None if st.last_ok_at is None else int(time.time() - st.last_ok_at),
        })
    return {
        "mode": app.settings.mode, "prompt_version": app.engine.prompts.version,
        "data_class": app.settings.data_class, "providers": providers,
        "demo_cache_entries": len(app.engine.cache), "answers_by_source": app.engine.stats,
    }


@router.post("/triage", response_model=Envelope[TriageOut])
async def triage(body: CaseIn, request: Request):
    return await _engine(request).triage(body, _rid(request))


@router.post("/summary", response_model=Envelope[SummaryOut])
async def summary(body: SummaryIn, request: Request):
    return await _engine(request).summary(body, _rid(request))


@router.post("/rank", response_model=Envelope[RankOut])
async def rank(body: RankIn, request: Request):
    return await _engine(request).rank(body, _rid(request))


@router.post("/area", response_model=Envelope[AreaOut])
async def area(body: CaseIn, request: Request):
    return await _engine(request).area(body, _rid(request))


@router.post("/draft", response_model=Envelope[DraftOut])
async def draft(body: DraftIn, request: Request):
    return await _engine(request).draft(body, _rid(request))


@router.post("/resources", response_model=Envelope[ResourcesOut])
async def resources(body: CaseIn, request: Request):
    return await _engine(request).resources(body, _rid(request))
