"""Shared test helpers. Nothing here touches the network: tests run in offline mode or with fake providers."""
from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from app.config import ROOT, Settings
from app.core.breaker import CircuitBreaker
from app.core.demo_cache import DemoCache
from app.core.engine import Engine
from app.core.llm_client import LLMClient
from app.core.prompts import Prompts
from app.core.providers.base import Provider, ProviderResult
from app.core.regions import Regions
from app.main import create_app

KEY = "test-key-0123456789abcdef"
DATA = ROOT / "data"


def make_settings(**kw) -> Settings:
    base = {"service_keys": KEY, "mode": "offline"}
    base.update(kw)
    return Settings(_env_file=None, **base)


def demo_cases() -> dict[str, dict]:
    raw = json.loads((DATA / "demo_cases.json").read_text(encoding="utf-8"))
    return {c["case_id"]: c for c in raw["cases"]}


class FakeProvider(Provider):
    """Scripted provider. Replies are dicts (sent as JSON), strings (sent raw) or exceptions (raised).
    The last reply repeats once the script runs out."""

    def __init__(self, name: str, replies: list) -> None:
        self.name = name
        self.model = f"{name}-model"
        self.replies = list(replies)
        self.calls: list[tuple[str, str]] = []

    async def generate(self, system, user, *, temperature, timeout):
        self.calls.append((system, user))
        r = self.replies.pop(0) if len(self.replies) > 1 else self.replies[0]
        if isinstance(r, Exception):
            raise r
        return ProviderResult(text=r if isinstance(r, str) else json.dumps(r), model=self.model)


def make_engine(providers: list[Provider] | None = None, mode: str = "live") -> Engine:
    settings = make_settings(mode=mode)
    regions = Regions(DATA)
    llm = LLMClient(providers=providers or [], breakers={p.name: CircuitBreaker(3, 60) for p in providers or []})
    return Engine(settings=settings, llm=llm, cache=DemoCache.load(DATA / "demo_cache.json"),
                  regions=regions, prompts=Prompts(settings.prompts_dir, "v1", regions.ids))


@pytest.fixture
def client():
    with TestClient(create_app(make_settings())) as c:
        yield c


@pytest.fixture
def auth() -> dict[str, str]:
    return {"X-Service-Key": KEY}


@pytest.fixture
def flood() -> dict:
    return demo_cases()["DEMO-FLOOD-001"]
