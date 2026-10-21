"""Build the list of providers that are actually usable right now."""
from __future__ import annotations

import logging

import httpx

from ...config import Settings
from .base import Provider
from .gemini import GeminiProvider
from .openai_compat import OpenAICompatProvider

log = logging.getLogger("ai.providers")

_OPENAI_STYLE = {
    # name: (base url, settings attr for key, settings attr for model, json_mode)
    "groq": ("https://api.groq.com/openai/v1", "groq_api_key", "groq_model", True),
    "cerebras": ("https://api.cerebras.ai/v1", "cerebras_api_key", "cerebras_model", True),
    "openrouter": ("https://openrouter.ai/api/v1", "openrouter_api_key", "openrouter_model", False),
}


def build_providers(settings: Settings, client: httpx.AsyncClient) -> list[Provider]:
    providers: list[Provider] = []
    for name in settings.provider_list:
        if name == "gemini":
            key = settings.gemini_api_key
            p: Provider | None = (
                GeminiProvider(api_key=key.get_secret_value(), model=settings.gemini_model, client=client)
                if key else None
            )
        elif name in _OPENAI_STYLE:
            base, key_attr, model_attr, json_mode = _OPENAI_STYLE[name]
            key = getattr(settings, key_attr)
            p = (
                OpenAICompatProvider(name=name, base_url=base, api_key=key.get_secret_value(),
                                     model=getattr(settings, model_attr), client=client,
                                     json_mode=json_mode)
                if key else None
            )
        else:
            log.warning("unknown provider in AI_PROVIDER_ORDER: %s", name)
            continue
        if p is None:
            log.info("provider %s skipped: no API key", name)
            continue
        if settings.data_class == "real" and p.free_tier_trains:
            log.warning("provider %s skipped: its free tier may train on prompts and data_class=real", name)
            continue
        providers.append(p)
    return providers
