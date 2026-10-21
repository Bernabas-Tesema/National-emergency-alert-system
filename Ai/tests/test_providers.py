"""Provider adapters, tested against a fake HTTP transport. No network, no real keys."""
import json

import httpx
import pytest

from app.core.providers.base import ProviderError
from app.core.providers.gemini import GeminiProvider
from app.core.providers.openai_compat import OpenAICompatProvider

SECRET = "sk-super-secret-value"


def make(handler, cls="openai"):
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    if cls == "gemini":
        return GeminiProvider(api_key=SECRET, model="gem-1", client=client)
    return OpenAICompatProvider(name="groq", base_url="https://x.test/v1", api_key=SECRET, model="m-1", client=client)


async def gen(p):
    return await p.generate("sys", "usr", temperature=0.2, timeout=5)


async def test_openai_request_shape_and_parse():
    seen = {}

    def handler(req: httpx.Request):
        seen["auth"] = req.headers["authorization"]
        seen["url"] = str(req.url)
        seen["body"] = req.read().decode()
        return httpx.Response(200, json={"choices": [{"message": {"content": '{"ok": true}'}}]})

    res = await gen(make(handler))
    assert res.text == '{"ok": true}' and res.model == "m-1"
    assert seen["auth"] == f"Bearer {SECRET}" and seen["url"] == "https://x.test/v1/chat/completions"
    body = json.loads(seen["body"])
    assert body["response_format"] == {"type": "json_object"} and body["messages"][0]["role"] == "system"


@pytest.mark.parametrize("status,kind", [(429, "rate_limited"), (401, "auth"), (403, "auth"),
                                         (500, "server"), (503, "server"), (400, "bad_response")])
async def test_openai_status_mapping(status, kind):
    with pytest.raises(ProviderError) as e:
        await gen(make(lambda r: httpx.Response(status, text=f"echo of prompt and {SECRET}")))
    assert e.value.kind == kind
    assert SECRET not in str(e.value)  # errors never carry body or key


async def test_retry_after_is_read():
    with pytest.raises(ProviderError) as e:
        await gen(make(lambda r: httpx.Response(429, headers={"retry-after": "7"})))
    assert e.value.retry_after == 7.0


@pytest.mark.parametrize("body", [{"nope": 1}, {"choices": []}, {"choices": [{"message": {"content": ""}}]}])
async def test_openai_garbage_body(body):
    with pytest.raises(ProviderError) as e:
        await gen(make(lambda r: httpx.Response(200, json=body)))
    assert e.value.kind == "bad_response"


async def test_timeout_and_network_errors_are_mapped():
    def boom_timeout(r):
        raise httpx.ReadTimeout("slow")

    def boom_net(r):
        raise httpx.ConnectError("down")

    with pytest.raises(ProviderError) as e1:
        await gen(make(boom_timeout))
    with pytest.raises(ProviderError) as e2:
        await gen(make(boom_net))
    assert (e1.value.kind, e2.value.kind) == ("timeout", "network")


async def test_gemini_key_in_header_not_url():
    seen = {}

    def handler(req: httpx.Request):
        seen["url"], seen["key"] = str(req.url), req.headers["x-goog-api-key"]
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": "{}"}]}}]})

    res = await gen(make(handler, "gemini"))
    assert res.text == "{}" and seen["key"] == SECRET and SECRET not in seen["url"]


async def test_gemini_blocked_response_is_bad_response():
    with pytest.raises(ProviderError) as e:
        await gen(make(lambda r: httpx.Response(200, json={"promptFeedback": {"blockReason": "SAFETY"}}), "gemini"))
    assert e.value.kind == "bad_response"
