"""Groq, Cerebras and OpenRouter all speak the OpenAI chat-completions format,
so one class covers all three."""
from __future__ import annotations

import httpx

from .base import Provider, ProviderError, ProviderResult, retry_after_seconds


class OpenAICompatProvider(Provider):
    def __init__(self, *, name: str, base_url: str, api_key: str, model: str,
                 client: httpx.AsyncClient, json_mode: bool = True) -> None:
        self.name = name
        self.model = model
        self._url = base_url.rstrip("/") + "/chat/completions"
        self._key = api_key
        self._client = client
        # Some free models reject response_format. We parse leniently either way.
        self._json_mode = json_mode

    async def generate(self, system: str, user: str, *, temperature: float,
                       timeout: float) -> ProviderResult:
        payload: dict = {
            "model": self.model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "temperature": temperature,
            "max_tokens": 1200,
        }
        if self._json_mode:
            payload["response_format"] = {"type": "json_object"}
        try:
            r = await self._client.post(
                self._url, json=payload, timeout=timeout,
                headers={"Authorization": f"Bearer {self._key}"},
            )
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
            text = r.json()["choices"][0]["message"]["content"]
        except (ValueError, KeyError, IndexError, TypeError):
            raise ProviderError("bad_response") from None
        if not isinstance(text, str) or not text.strip():
            raise ProviderError("bad_response")
        return ProviderResult(text=text, model=self.model)
