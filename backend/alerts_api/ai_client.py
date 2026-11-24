"""Server-side calls from Django admin to the EthioAlert AI service."""

from __future__ import annotations

import httpx
from django.conf import settings


class AiServiceError(Exception):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


def call_ai(path: str, payload: dict, timeout: float = 25.0) -> dict:
    base = settings.AI_SERVICE_URL.rstrip("/")
    headers = {
        "Content-Type": "application/json",
        "X-Service-Key": settings.AI_SERVICE_KEY,
    }
    try:
        with httpx.Client(timeout=timeout) as client:
            reply = client.post(f"{base}{path}", json=payload, headers=headers)
    except httpx.HTTPError as exc:
        raise AiServiceError(f"AI service unreachable: {exc.__class__.__name__}") from exc

    try:
        data = reply.json()
    except Exception:  # noqa: BLE001
        data = {"detail": (reply.text or "")[:500]}

    if reply.status_code >= 400:
        detail = data.get("detail") if isinstance(data, dict) else None
        raise AiServiceError(str(detail or f"AI error HTTP {reply.status_code}"), reply.status_code)
    if not isinstance(data, dict):
        raise AiServiceError("AI returned an unexpected payload.")
    return data


def health() -> dict:
    base = settings.AI_SERVICE_URL.rstrip("/")
    try:
        with httpx.Client(timeout=8.0) as client:
            reply = client.get(f"{base}/ai/health")
            return reply.json()
    except Exception as exc:  # noqa: BLE001
        raise AiServiceError(f"AI health check failed: {exc.__class__.__name__}") from exc
