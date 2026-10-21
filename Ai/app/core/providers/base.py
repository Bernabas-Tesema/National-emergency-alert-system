"""What every provider looks like from the outside.

Errors carry only a *kind*, never the response body: a provider can echo our prompt back,
and the prompt may contain case text we don't want in logs.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Literal

ErrorKind = Literal["rate_limited", "timeout", "auth", "server", "bad_response", "network"]


class ProviderError(Exception):
    def __init__(self, kind: ErrorKind, retry_after: float | None = None) -> None:
        super().__init__(kind)
        self.kind = kind
        self.retry_after = retry_after


@dataclass
class ProviderResult:
    text: str
    model: str


class Provider(ABC):
    name: str
    model: str
    # Free tiers that may train on prompts. Refused when AI_DATA_CLASS=real.
    free_tier_trains: bool = False

    @abstractmethod
    async def generate(self, system: str, user: str, *, temperature: float,
                       timeout: float) -> ProviderResult: ...


def retry_after_seconds(value: str | None) -> float | None:
    """Retry-After is usually whole seconds. Ignore HTTP-date form, we just use the cooldown."""
    try:
        return max(0.0, float(value)) if value is not None else None
    except ValueError:
        return None
