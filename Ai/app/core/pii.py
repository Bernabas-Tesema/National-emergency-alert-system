"""Strip personal data from text before it leaves this server.

Honest limits: regex can't recognise every name. This is the second line of defence.
The first one is that the backend only sends incident fields, never citizen records,
and that free providers only ever see synthetic data (see AI_DATA_CLASS).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

# Control characters, zero-width and bidi override characters. The last group is used to
# hide text from reviewers or to flip how it renders, so we drop them.
_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]")
# Someone writing our own delimiter inside a report to try to close the data block early.
_TAGS = re.compile(r"</?\s*case_data\s*>", re.IGNORECASE)

_EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
_URL = re.compile(r"(?:https?://|www\.)\S+", re.IGNORECASE)
# Ethiopian mobiles: +251 9xxxxxxxx, 09xxxxxxxx, 07xxxxxxxx (spaces or dashes allowed)
_PHONE_ET = re.compile(r"(?<!\d)(?:\+?251|0)[\s-]?[79](?:[\s-]?\d){8}(?!\d)")
_PHONE_INTL = re.compile(r"(?<!\d)\+\d{1,3}[\s-]?\d(?:[\s-]?\d){6,11}(?!\d)")
# Fayda FIN is 12 digits, FCN is 16. Also catches our TEST- prefixed fake ones.
_ID = re.compile(r"(?<!\d)(?:TEST-)?\d{12}(?:\d{4})?(?!\d)", re.IGNORECASE)
_NAME_LATIN = re.compile(
    r"(?i:\b(?:ato|w/ro\.?|weizero|woizero|dr\.?|mr\.?|mrs\.?|ms\.?|eng\.?|prof\.?)\s+)"
    r"[A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+){0,2}"
)
_NAME_AMHARIC = re.compile(r"(?:አቶ|ወ/ሮ|ወ/ሪት|ዶ/ር)\s+[\u1200-\u137F]+(?:\s+[\u1200-\u137F]+)?")
_COORDS = re.compile(r"(-?\d{1,3}\.\d{4,})\s*,\s*(-?\d{1,3}\.\d{4,})")


@dataclass
class Scrubbed:
    text: str
    counts: dict[str, int] = field(default_factory=dict)


def clean(text: str) -> str:
    """Make untrusted text safe to embed: no control chars, no fake delimiters."""
    text = _CONTROL.sub("", text)
    text = _TAGS.sub("[tag removed]", text)
    return re.sub(r"[ \t]+", " ", text).strip()


def scrub(text: str | None, extra_terms: tuple[str, ...] = ()) -> Scrubbed:
    if not text:
        return Scrubbed("", {})
    counts: dict[str, int] = {}

    def sub(pattern: re.Pattern[str], repl: str, label: str, s: str) -> str:
        s, n = pattern.subn(repl, s)
        if n:
            counts[label] = counts.get(label, 0) + n
        return s

    s = clean(text)
    for term in extra_terms:  # e.g. the reporter's name, if the backend knows it
        if term.strip():
            s = sub(re.compile(re.escape(term.strip()), re.IGNORECASE), "[NAME]", "name", s)
    s = sub(_EMAIL, "[EMAIL]", "email", s)
    s = sub(_URL, "[LINK]", "link", s)
    s = sub(_PHONE_ET, "[PHONE]", "phone", s)  # before IDs: 251911234567 is a phone
    s = sub(_PHONE_INTL, "[PHONE]", "phone", s)
    s = sub(_ID, "[ID]", "id", s)
    s = sub(_NAME_LATIN, "[NAME]", "name", s)
    s = sub(_NAME_AMHARIC, "[NAME]", "name", s)

    def coarsen(m: re.Match[str]) -> str:
        # 3 decimals is roughly 110 m. Enough for "which woreda", not enough to find a doorstep.
        counts["coords"] = counts.get("coords", 0) + 1
        return f"{round(float(m.group(1)), 3)}, {round(float(m.group(2)), 3)}"

    s = _COORDS.sub(coarsen, s)
    return Scrubbed(s, counts)


def merge_counts(*parts: dict[str, int]) -> dict[str, int]:
    out: dict[str, int] = {}
    for p in parts:
        for k, v in p.items():
            out[k] = out.get(k, 0) + v
    return out
