"""Circuit breaker, one per provider.

Without it, a dead provider costs a full timeout on every request. With it, after a few
failures we skip that provider for a cooldown and go straight to the next one, then let one
trial request through to see if it recovered.
"""
from __future__ import annotations

import time
from collections.abc import Callable


class CircuitBreaker:
    def __init__(self, failures: int = 3, cooldown_s: float = 60.0,
                 clock: Callable[[], float] = time.monotonic) -> None:
        self.threshold = failures
        self.cooldown_s = cooldown_s
        self._clock = clock
        self._fails = 0
        self._open_until: float | None = None
        self._trial = False

    @property
    def state(self) -> str:
        if self._open_until is None:
            return "closed"
        return "open" if self._clock() < self._open_until else "half_open"

    def allow(self) -> bool:
        if self._open_until is None:
            return True
        if self._clock() < self._open_until:
            return False
        if self._trial:  # one trial at a time while half-open
            return False
        self._trial = True
        return True

    def success(self) -> None:
        self._fails = 0
        self._open_until = None
        self._trial = False

    def failure(self, open_for: float | None = None) -> None:
        """open_for: open immediately for that many seconds (rate limited, bad key)."""
        self._trial = False
        self._fails += 1
        if open_for is not None:
            self._open_until = self._clock() + min(open_for, 600.0)
        elif self._open_until is not None or self._fails >= self.threshold:
            self._open_until = self._clock() + self.cooldown_s
