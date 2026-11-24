"""Shared OTP / login-challenge store (works across Gunicorn workers via Django cache)."""

from __future__ import annotations

from typing import Any

from django.conf import settings
from django.core.cache import cache

PHONE_OTP_PREFIX = "ethio:phone_otp:"
STAFF_CHALLENGE_PREFIX = "ethio:staff_otp:"


def _ttl_seconds() -> int:
    return max(60, int(getattr(settings, "OTP_MINUTES", 5)) * 60)


def set_phone_otp(phone: str, otp: str) -> None:
    cache.set(f"{PHONE_OTP_PREFIX}{phone}", otp, timeout=_ttl_seconds())


def get_phone_otp(phone: str) -> str | None:
    value = cache.get(f"{PHONE_OTP_PREFIX}{phone}")
    return value if isinstance(value, str) else None


def clear_phone_otp(phone: str) -> None:
    cache.delete(f"{PHONE_OTP_PREFIX}{phone}")


def set_staff_challenge(challenge_id: str, payload: dict[str, Any]) -> None:
    cache.set(f"{STAFF_CHALLENGE_PREFIX}{challenge_id}", payload, timeout=_ttl_seconds())


def get_staff_challenge(challenge_id: str) -> dict[str, Any] | None:
    value = cache.get(f"{STAFF_CHALLENGE_PREFIX}{challenge_id}")
    return value if isinstance(value, dict) else None


def clear_staff_challenge(challenge_id: str) -> None:
    cache.delete(f"{STAFF_CHALLENGE_PREFIX}{challenge_id}")
