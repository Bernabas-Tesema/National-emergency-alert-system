"""Settings, read from environment variables (and an optional .env file).

Everything that can differ between your laptop, the demo machine and a server lives
here, so no other file reads os.environ directly.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_prefix="AI_", extra="ignore", populate_by_name=True
    )

    # --- runtime -----------------------------------------------------------
    env: Literal["dev", "prod"] = "dev"
    # live    = providers first, then demo cache, then rules  (normal)
    # demo    = demo cache first, then providers, then rules  (showcase day)
    # offline = demo cache, then rules, never touch the network
    mode: Literal["live", "demo", "offline"] = "live"
    # "synthetic" = only fake data is sent. "real" = refuse providers whose free tier
    # trains on prompts (Gemini free). Flip this if the project ever sees real data.
    data_class: Literal["synthetic", "real"] = "synthetic"
    log_level: str = "INFO"

    # --- who may call us ---------------------------------------------------
    # Comma separated, so keys can be rotated without downtime (old,new).
    service_keys: SecretStr = SecretStr("")

    # --- limits ------------------------------------------------------------
    max_body_bytes: int = 64 * 1024
    rate_limit_per_min: int = 120
    failed_auth_per_min: int = 10
    max_concurrency: int = 4  # parallel provider calls, protects free-tier rate limits

    # --- LLM chain ---------------------------------------------------------
    provider_order: str = "groq,cerebras,gemini,openrouter"
    request_timeout_s: float = 20.0
    temperature: float = 0.2
    breaker_failures: int = 3
    breaker_cooldown_s: float = 60.0
    low_confidence_threshold: float = 0.5

    groq_api_key: SecretStr | None = Field(default=None, validation_alias="GROQ_API_KEY")
    cerebras_api_key: SecretStr | None = Field(default=None, validation_alias="CEREBRAS_API_KEY")
    gemini_api_key: SecretStr | None = Field(default=None, validation_alias="GEMINI_API_KEY")
    openrouter_api_key: SecretStr | None = Field(default=None, validation_alias="OPENROUTER_API_KEY")

    # Model ids change often on free tiers. Check each dashboard before demo day.
    groq_model: str = "llama-3.3-70b-versatile"
    cerebras_model: str = "llama-3.3-70b"
    gemini_model: str = "gemini-flash-latest"
    openrouter_model: str = "meta-llama/llama-3.3-70b-instruct:free"

    # --- content -----------------------------------------------------------
    prompt_version: str = "v1"
    data_dir: Path = ROOT / "data"
    prompts_dir: Path = ROOT / "app" / "prompts"

    @property
    def service_key_list(self) -> list[str]:
        return [k.strip() for k in self.service_keys.get_secret_value().split(",") if k.strip()]

    @property
    def provider_list(self) -> list[str]:
        return [p.strip().lower() for p in self.provider_order.split(",") if p.strip()]

    def validate_runtime(self) -> None:
        """Fail at startup, loudly, rather than run half-configured."""
        keys = self.service_key_list
        if not keys:
            raise RuntimeError("AI_SERVICE_KEYS is empty. Generate one: openssl rand -hex 32")
        if any(len(k) < 16 for k in keys):
            raise RuntimeError("Every key in AI_SERVICE_KEYS must be at least 16 characters")


@lru_cache
def get_settings() -> Settings:
    return Settings()
