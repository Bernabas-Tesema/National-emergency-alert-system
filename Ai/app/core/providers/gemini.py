"""Google Gemini (AI Studio). Different request shape from the OpenAI-style providers.

The key goes in a header, not the URL, so it never ends up in an access log.
"""
from __future__ import annotations

import httpx

from .base import Provider, ProviderError, ProviderResult, retry_after_seconds

_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiProvider(Provider):
    name = "gemini"
    # Google's free tier may use prompts to improve its products. Synthetic data only.
    free_tier_trains = True

    def __init__(self, *, api_key: str, model: str, client: httpx.AsyncClient) -> None:
        self.model = model
        self._url = f"{_BASE}/{model}:generateContent"
        self._key = api_key
        self._client = client

    async def generate(self, system: str, user: str, *, temperature: float,
                       timeout: float) -> ProviderResult:
        payload = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": {
                "temperature": temperature,
                "responseMimeType": "application/json",
                "maxOutputTokens": 1200,
            },
        }
        try:
            r = await self._client.post(self._url, json=payload, timeout=timeout,
                                        headers={"x-goog-api-key": self._key})
        except httpx.TimeoutException:
            raise ProviderError("timeout") from None
        except httpx.TransportError:
            raise ProviderError("network") from None

        if r.status_code == 429:
            raise ProviderError("rate_limited", retry_after_seconds(r.headers.get("retry-after")))
        if r.status_code in (401, 403):
            raise ProviderError("auth")
        if r.status_code >= 500:
            raise ProviderError("server")
        if r.status_code >= 400:
            raise ProviderError("bad_response")
        try:
            text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
        except (ValueError, KeyError, IndexError, TypeError):
            # Blocked by a safety filter or empty candidate list.
            raise ProviderError("bad_response") from None
        if not isinstance(text, str) or not text.strip():
            raise ProviderError("bad_response")
        return ProviderResult(text=text, model=self.model)
