import json
import logging
import os
import re
import time

import httpx

log = logging.getLogger("ai")

PROVIDERS = {
    "groq": ("https://api.groq.com/openai/v1", "llama-3.3-70b-versatile", True),
    "cerebras": ("https://api.cerebras.ai/v1", "llama-3.3-70b", True),
    "openrouter": ("https://openrouter.ai/api/v1", "meta-llama/llama-3.3-70b-instruct:free", False),
}
PAUSED: dict[str, float] = {}

HIDDEN = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\u200b-\u200f\u202a-\u202e]")
REDACT = [
    (re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+"), "[EMAIL]"),
    (re.compile(r"(?:https?://|www\.)\S+", re.IGNORECASE), "[LINK]"),
    (re.compile(r"(?<!\d)(?:\+?251|0)[\s-]?[79](?:[\s-]?\d){8}(?!\d)"), "[PHONE]"),
    (re.compile(r"(?<!\d)(?:TEST-)?\d{12}(?:\d{4})?(?!\d)", re.IGNORECASE), "[ID]"),
    (re.compile(r"\b(?:Ato|W/ro|Dr|Mr|Mrs|Ms|Eng|Prof)\.?\s+[A-Z][\w'-]+(?:\s+[A-Z][\w'-]+)?"), "[NAME]"),
    (re.compile(r"(?:አቶ|ወ/ሮ|ዶ/ር)\s+[\u1200-\u137F]+"), "[NAME]"),
    (re.compile(r"</?\s*case_data\s*>", re.IGNORECASE), ""),
]


def scrub(text: str) -> str:
    text = HIDDEN.sub("", text)
    for pattern, replacement in REDACT:
        text = pattern.sub(replacement, text)
    return text


def configured() -> list[str]:
    order = os.getenv("AI_PROVIDER_ORDER", "groq,cerebras,openrouter").split(",")
    return [n.strip() for n in order if n.strip() in PROVIDERS and os.getenv(f"{n.strip().upper()}_API_KEY")]


def _call(name: str, system: str, user: str) -> str:
    base, default_model, json_mode = PROVIDERS[name]
    body = {"model": os.getenv(f"AI_{name.upper()}_MODEL", default_model), "temperature": 0.2,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    key = os.environ[f"{name.upper()}_API_KEY"]
    reply = httpx.post(f"{base}/chat/completions", json=body, timeout=15, headers={"Authorization": f"Bearer {key}"})
    reply.raise_for_status()
    return reply.json()["choices"][0]["message"]["content"]


def ask(schema, system: str, user: str, check=None):
    for name in configured():
        if PAUSED.get(name, 0) > time.time():
            continue
        try:
            raw = _call(name, system, user)
            result = schema.model_validate(json.loads(re.search(r"\{.*\}", raw, re.DOTALL).group(0)))
            if check is None or check(result):
                return result, name
        except Exception as exc:  # noqa: BLE001 any provider failure means try the next one
            PAUSED[name] = time.time() + 60
            log.warning("provider %s failed: %s", name, type(exc).__name__)
    return None