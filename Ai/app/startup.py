"""Production startup checks for the AI service."""

from __future__ import annotations

import logging
import os

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
    """Fail fast with a clear message (Render shows this as uvicorn exit code 3)."""
    if not is_prod():
        log.info("AI_ENV=%s — skipping production secret checks", os.getenv("AI_ENV", "dev"))
        return

    errors: list[str] = []
    key = (os.getenv("AI_SERVICE_KEY") or "").strip()
    if key in _WEAK_KEYS or len(key) < 24:
        errors.append(
            "Set AI_SERVICE_KEY in Render → Environment to a strong secret (24+ chars). "
            "Do not leave it empty or use the local default."
        )

    mode = os.getenv("AI_MODE", "live").strip().lower()
    if mode not in {"live", "demo", "offline"}:
        errors.append("AI_MODE must be live, demo, or offline")

    providers = []
    for name in ("GROQ", "OPENROUTER", "CEREBRAS"):
        if (os.getenv(f"{name}_API_KEY") or "").strip():
            providers.append(name.lower())

    if mode == "live" and not providers:
        errors.append(
            "AI_MODE=live needs at least one LLM key in Render → Environment: "
            "GROQ_API_KEY and/or OPENROUTER_API_KEY and/or CEREBRAS_API_KEY"
        )

    if errors:
        message = "EthioAlert AI refused to start (production checks failed):\n" + "\n".join(
            f"  - {err}" for err in errors
        )
        log.error(message)
        # RuntimeError (not SystemExit) so uvicorn/Render logs the full reason.
        raise RuntimeError(message)

    log.info("production checks ok (mode=%s providers=%s)", mode, ",".join(providers) or "none")
