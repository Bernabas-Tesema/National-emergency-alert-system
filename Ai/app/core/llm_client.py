"""Talks to the provider chain and returns a validated object, or raises.

What it guarantees to the caller: if complete() returns, the data already matches the
schema. Everything else (retries, failover, breakers) stays inside.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from dataclasses import dataclass, field
from typing import Generic, TypeVar

from pydantic import BaseModel, ValidationError

from .breaker import CircuitBreaker
from .providers.base import Provider, ProviderError

T = TypeVar("T", bound=BaseModel)
log = logging.getLogger("ai.llm")


class AllProvidersFailed(Exception):
    def __init__(self, attempts: list[tuple[str, str]]) -> None:
        self.attempts = attempts
        super().__init__(", ".join(f"{p}:{k}" for p, k in attempts) or "no providers configured")


@dataclass
class LLMResult(Generic[T]):
    data: T
    provider: str
    model: str
    latency_ms: int


@dataclass
class ProviderStats:
    ok: int = 0
    failed: int = 0
    last_error: str | None = None
    last_ok_at: float | None = None
    last_latency_ms: int | None = None


def extract_json(text: str) -> dict:
    """Models like to wrap JSON in ```fences``` or add a sentence. Pull out the first object."""
    s = text.strip()
    if s.startswith("```"):
        s = re.sub(r"^```[a-zA-Z]*\s*|\s*```$", "", s).strip()
    start = s.find("{")
    if start < 0:
        raise ValueError("no JSON object found")
    depth, in_str, esc = 0, False, False
    for i in range(start, len(s)):
        c = s[i]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
        elif c == '"':
            in_str = True
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return json.loads(s[start:i + 1])
    raise ValueError("unterminated JSON object")


def short_error(e: Exception) -> str:
    """Field paths and messages only. Never the offending value, it may be case text."""
    if isinstance(e, ValidationError):
        return "; ".join(f"{'.'.join(str(p) for p in x['loc'])}: {x['msg']}" for x in e.errors()[:3])
    return str(e)[:120]


@dataclass
class LLMClient:
    providers: list[Provider]
    breakers: dict[str, CircuitBreaker]
    timeout: float = 20.0
    temperature: float = 0.2
    cooldown_s: float = 60.0
    max_concurrency: int = 4
    stats: dict[str, ProviderStats] = field(init=False)
    _sem: asyncio.Semaphore = field(init=False)

    def __post_init__(self) -> None:
        self.stats = {p.name: ProviderStats() for p in self.providers}
        self._sem = asyncio.Semaphore(self.max_concurrency)

    @property
    def has_providers(self) -> bool:
        return bool(self.providers)

    async def complete(self, *, system: str, user: str, schema: type[T]) -> LLMResult[T]:
        attempts: list[tuple[str, str]] = []
        for p in self.providers:
            breaker, st = self.breakers[p.name], self.stats[p.name]
            if not breaker.allow():
                attempts.append((p.name, "circuit_open"))
                continue
            t0 = time.monotonic()
            try:
                data, model = await self._ask(p, system, user, schema)
            except ProviderError as e:
                st.failed += 1
                st.last_error = e.kind
                if e.kind == "rate_limited":
                    breaker.failure(open_for=e.retry_after or self.cooldown_s)
                elif e.kind == "auth":  # bad key: stop hammering it
                    breaker.failure(open_for=self.cooldown_s * 10)
                else:
                    breaker.failure()
                attempts.append((p.name, e.kind))
                log.warning("provider_failed", extra={"ctx": {"provider": p.name, "kind": e.kind}})
                continue
            ms = int((time.monotonic() - t0) * 1000)
            breaker.success()
            st.ok += 1
            st.last_ok_at = time.time()
            st.last_latency_ms = ms
            return LLMResult(data=data, provider=p.name, model=model, latency_ms=ms)
        raise AllProvidersFailed(attempts)

    async def _ask(self, p: Provider, system: str, user: str, schema: type[T]) -> tuple[T, str]:
        """One provider, up to two tries: the second tells the model what was wrong."""
        hint = ""
        for _ in range(2):
            try:
                async with self._sem:
                    res = await asyncio.wait_for(
                        p.generate(system, user + hint, temperature=self.temperature,
                                   timeout=self.timeout),
                        timeout=self.timeout + 2,
                    )
            except TimeoutError:
                raise ProviderError("timeout") from None
            try:
                return schema.model_validate(extract_json(res.text)), res.model
            except ValueError as e:  # includes JSONDecodeError and pydantic ValidationError
                hint = ("\n\nYour previous reply was rejected: " + short_error(e)
                        + ". Reply again with only the corrected JSON object.")
        raise ProviderError("bad_response")
