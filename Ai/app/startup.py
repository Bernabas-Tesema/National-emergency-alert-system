"""Production startup checks for the AI service."""

from __future__ import annotations

import logging
import os
import sys

log = logging.getLogger("ai.startup")

_WEAK_KEYS = {
    "",
    "change-me",
    "change-me-use-a-long-random-value",
    "ethioalert-ai-local-dev-key",
}


def is_prod() -> bool:
    return os.getenv("AI_ENV", "dev").strip().lower() in {"prod", "production"}


def validate_environment() -> None:
    if not is_prod():
        return

    errors: list[str] = []
    key = (os.getenv("AI_SERVICE_KEY") or "").strip()
    if key in _WEAK_KEYS or len(key) < 24:
        errors.append("AI_SERVICE_KEY must be a strong secret (24+ chars), not a local default")

    mode = os.getenv("AI_MODE", "live").strip().lower()
    if mode not in {"live", "demo", "offline"}:
        errors.append("AI_MODE must be live, demo, or offline")

    providers = []
    for name in ("GROQ", "OPENROUTER", "CEREBRAS"):
        if (os.getenv(f"{name}_API_KEY") or "").strip():
            providers.append(name.lower())

    if mode == "live" and not providers:
        errors.append("AI_MODE=live requires at least one of GROQ_API_KEY, OPENROUTER_API_KEY, CEREBRAS_API_KEY")

    if errors:
        for err in errors:
            log.error("startup check failed: %s", err)
        print("AI production startup failed:", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        raise SystemExit(1)

    log.info("production checks ok (mode=%s providers=%s)", mode, ",".join(providers) or "none")
