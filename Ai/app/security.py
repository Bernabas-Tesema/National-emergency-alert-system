"""Service-to-service auth and rate limiting.

Only the backend calls this service. It proves who it is with a shared secret in the
X-Service-Key header. This is not a user login: the user's identity and role are checked
by the backend before it ever calls us.
"""
from __future__ import annotations

import hashlib
import hmac
import time
from collections import defaultdict, deque

from fastapi import Header, HTTPException, Request, status


class RateLimiter:
    """Sliding one-minute window, in memory. Fine for one process; use Redis if we ever scale out."""

    def __init__(self, per_minute: int) -> None:
        self.per_minute = per_minute
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        q = self._hits[key]
        while q and now - q[0] > 60:
            q.popleft()
        if len(q) >= self.per_minute:
            return False
        q.append(now)
        return True


def _key_matches(candidate: str, valid: list[str]) -> bool:
    # Compare against every key without stopping early so timing doesn't reveal which matched.
    ok = False
    for k in valid:
        ok |= hmac.compare_digest(candidate.encode(), k.encode())
    return ok


async def require_service_key(
    request: Request, x_service_key: str | None = Header(default=None)
) -> None:
    valid = request.app.state.settings.service_key_list
    if x_service_key and _key_matches(x_service_key, valid):
        return
    # Wrong or missing key. Count it per client address so guessing is slow.
    ip = request.client.host if request.client else "unknown"
    if not request.app.state.auth_fail_limiter.allow(ip):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many failed attempts",
                            headers={"Retry-After": "60"})
    # One generic message: never say whether a key was missing or merely wrong.
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or missing service key")


async def rate_limit(request: Request, x_service_key: str | None = Header(default=None)) -> None:
    bucket = hashlib.sha256((x_service_key or "anon").encode()).hexdigest()[:12]
    if not request.app.state.limiter.allow(bucket):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Rate limit exceeded",
                            headers={"Retry-After": "10"})
