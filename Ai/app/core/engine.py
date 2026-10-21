"""The six AI features. One shared pipeline, six small wrappers.

Pipeline for every request:
    scrub personal data -> pick sources in mode order (llm / cache / rules)
    -> validate -> apply business guards -> wrap in the envelope

The engine never talks to the database, never sends anything, and never decides anything.
Everything it returns is a suggestion for a person to confirm.
"""
from __future__ import annotations

import json
import logging
import re
import time
from collections.abc import Callable
from dataclasses import dataclass, field

from pydantic import BaseModel

from . import rules
from .demo_cache import DemoCache
from .llm_client import AllProvidersFailed, LLMClient
from .pii import clean, merge_counts, scrub
from .prompts import Prompts
from .regions import Regions
from .schemas import (
    SEVERITY_TO_CHANNEL,
    AreaOut,
    CaseBrief,
    CaseIn,
    DraftIn,
    DraftOut,
    Envelope,
    RankIn,
    RankOut,
    ResourcesOut,
    SummaryIn,
    SummaryOut,
    TriageOut,
)

log = logging.getLogger("ai.engine")

_MODE_ORDER = {
    "live": ("llm", "cache", "rules"),
    "demo": ("cache", "llm", "rules"),
    "offline": ("cache", "rules"),
}


class GuardFailure(Exception):
    """The model answered in valid JSON but the answer breaks a business rule. Try the next source."""


@dataclass
class Outcome:
    data: BaseModel
    source: str
    provider: str | None = None
    model: str | None = None
    warnings: list[str] = field(default_factory=list)


def _payload_case(case: CaseIn) -> tuple[dict, dict[str, int]]:
    d_scrub, l_scrub = scrub(case.description), scrub(case.location_text)
    desc, loc = d_scrub.text, l_scrub.text
    c1, c2 = d_scrub.counts, l_scrub.counts
    payload = {
        "kind": case.kind,
        "source_org": clean(case.source_org) if case.source_org else None,
        "category_given": case.category,
        "suggested_severity": case.suggested_severity,
        "description": desc,
        "location_text": loc or None,
        "woredas": case.woredas,
        "language": case.language,
    }
    return payload, merge_counts(c1, c2)


def _payload_brief(item: CaseBrief, age: int | None = None) -> tuple[dict, dict[str, int]]:
    s = scrub(item.description)
    desc, counts = s.text, s.counts
    d = {"id": item.id, "kind": item.kind, "category": item.category, "severity": item.severity,
         "description": desc, "woredas": item.woredas}
    if age is not None:
        d["age_minutes"] = age
    return d, counts


class Engine:
    def __init__(self, *, settings, llm: LLMClient | None, cache: DemoCache, regions: Regions,
                 prompts: Prompts) -> None:
        self.settings = settings
        self.llm = llm
        self.cache = cache
        self.regions = regions
        self.prompts = prompts
        self.stats = {"llm": 0, "cache": 0, "rules": 0}

    # ───────────────────── shared pipeline ─────────────────────
    async def _run(
        self, task: str, schema: type[BaseModel], key: str | None, payload: dict,
        fallback: Callable[[], BaseModel],
        post: Callable[[BaseModel, list[str]], BaseModel] | None = None,
    ) -> tuple[Outcome, int]:
        t0 = time.monotonic()
        warnings: list[str] = []

        def finish(out: Outcome) -> tuple[Outcome, int]:
            return out, int((time.monotonic() - t0) * 1000)

        for step in _MODE_ORDER[self.settings.mode]:
            try:
                if step == "cache":
                    hit = self.cache.get(task, key) if key else None
                    if hit is not None:
                        data = post(hit, warnings) if post else hit
                        return finish(Outcome(data, "cache", warnings=warnings + ["Pre-checked demo answer (cached)."]))
                elif step == "llm":
                    if self.llm is None or not self.llm.has_providers:
                        warnings.append("No AI provider configured; used fallback.")
                        continue
                    user = "<case_data>\n" + json.dumps(payload, ensure_ascii=False) + "\n</case_data>"
                    res = await self.llm.complete(system=self.prompts.system(task), user=user, schema=schema)
                    data = post(res.data, warnings) if post else res.data
                    return finish(Outcome(data, "llm", res.provider, res.model, warnings))
                else:  # rules never fails: it's the floor
                    data = fallback()
                    data = post(data, warnings) if post else data
                    note = "Rule-based fallback used. Low confidence."
                    return finish(Outcome(data, "rules", warnings=warnings + [note]))
            except AllProvidersFailed as e:
                warnings.append("AI providers unavailable; used fallback.")
                log.warning("all_providers_failed", extra={"ctx": {"task": task, "attempts": str(e)}})
            except GuardFailure as e:
                warnings.append(f"AI answer rejected by a safety check ({e}); used fallback.")
        raise RuntimeError("unreachable: rules step always returns")

    def _wrap(self, out: Outcome, rid: str, ms: int, pii: dict[str, int]) -> Envelope:
        data = out.data
        conf = float(getattr(data, "confidence", 0.0))
        warnings = list(out.warnings)
        n = sum(pii.values())
        if n:
            warnings.insert(0, f"Personal data redacted before AI processing ({n} items).")
        self.stats[out.source] += 1
        return Envelope[type(data)](
            request_id=rid, source=out.source, provider=out.provider, model=out.model,
            cached=out.source == "cache", latency_ms=ms, prompt_version=self.prompts.version,
            confidence=conf, low_confidence=conf < self.settings.low_confidence_threshold,
            reasons=list(getattr(data, "reasons", [])), warnings=warnings, data=data,
        )

    # ───────────────────── 1. triage ─────────────────────
    async def triage(self, case: CaseIn, rid: str) -> Envelope:
        payload, pii = _payload_case(case)

        def post(d: TriageOut, warnings: list[str]) -> TriageOut:
            d.channel_severity = SEVERITY_TO_CHANNEL[d.severity]
            if case.suggested_severity and case.suggested_severity != d.channel_severity:
                warnings.append(f"AI rates this '{d.channel_severity}' but the sender suggested "
                                f"'{case.suggested_severity}'. A person should check which is right.")
            if case.category not in ("other", d.category):
                warnings.append(f"AI category '{d.category}' differs from the sender's '{case.category}'.")
            return d

        out, ms = await self._run("triage", TriageOut, case.case_id, payload,
                                  lambda: rules.triage(case), post)
        return self._wrap(out, rid, ms, pii)

    # ───────────────────── 2. summary ─────────────────────
    async def summary(self, body: SummaryIn, rid: str) -> Envelope:
        if body.case is not None:
            case_payload, pii = _payload_case(body.case)
            payload = {"scope": "case", "case": case_payload}
            key, fallback = body.case.case_id, (lambda: rules.summary_case(body.case))
        else:
            parts = [_payload_brief(i) for i in body.cases or []]
            pii = merge_counts(*[c for _, c in parts])
            payload = {"scope": "set", "label": clean(body.scope_label or "all open items"),
                       "items": [p for p, _ in parts]}
            key, fallback = body.set_id, (lambda: rules.summary_set(body.cases or [], body.scope_label))
        out, ms = await self._run("summary", SummaryOut, key, payload, fallback)
        return self._wrap(out, rid, ms, pii)

    # ───────────────────── 3. rank ─────────────────────
    async def rank(self, body: RankIn, rid: str) -> Envelope:
        parts = [_payload_brief(i, i.age_minutes) for i in body.items]
        pii = merge_counts(*[c for _, c in parts])
        payload = {"items": [p for p, _ in parts]}
        want = sorted(i.id for i in body.items)

        def post(d: RankOut, warnings: list[str]) -> RankOut:
            if sorted(r.id for r in d.ranking) != want:
                raise GuardFailure("ranking does not list exactly the items we sent")
            ordered = sorted(d.ranking, key=lambda r: r.rank)
            for n, r in enumerate(ordered, 1):  # renumber 1..n so ranks are always clean
                r.rank = n
            d.ranking = ordered
            return d

        out, ms = await self._run("rank", RankOut, body.set_id, payload, lambda: rules.rank(body), post)
        return self._wrap(out, rid, ms, pii)

    # ───────────────────── 4. area ─────────────────────
    async def area(self, case: CaseIn, rid: str) -> Envelope:
        payload, pii = _payload_case(case)
        allowed = self.regions.id_set

        def post(d: AreaOut, warnings: list[str]) -> AreaOut:
            kept = [w for w in dict.fromkeys(d.woredas) if w in allowed]
            if len(kept) != len(d.woredas):
                warnings.append("Some suggested areas were not valid woreda ids and were removed.")
            if not kept and case.woredas:  # model gave nothing usable: fall back to what the sender chose
                kept = [w for w in case.woredas if w in allowed]
                d.confidence = min(d.confidence, 0.3)
                warnings.append("No valid area suggested; using the sender's woredas.")
            d.woredas = kept
            return d

        out, ms = await self._run("area", AreaOut, case.case_id, payload,
                                  lambda: rules.area(case, allowed), post)
        return self._wrap(out, rid, ms, pii)

    # ───────────────────── 5. draft ─────────────────────
    async def draft(self, body: DraftIn, rid: str) -> Envelope:
        case_payload, pii = _payload_case(body.case)
        a = scrub(body.recommended_action)
        action, c3 = a.text, a.counts
        payload = {
            "case": case_payload, "target_woredas": body.target_woredas or body.case.woredas,
            "severity": body.severity or body.case.suggested_severity,
            "recommended_action": action or None,
        }
        pii = merge_counts(pii, c3)
        targets = body.target_woredas or body.case.woredas

        def post(d: DraftOut, warnings: list[str]) -> DraftOut:
            # A drafted public message must never carry contact details or links.
            for fld in ("en", "am", "sms_en", "sms_am"):
                s = scrub(getattr(d, fld))
                if s.counts.get("phone") or s.counts.get("link") or s.counts.get("email"):
                    setattr(d, fld, s.text)
                    warnings.append("Draft contained contact details or a link; removed.")
            if targets and not any(re.search(rf"\b0?{int(w[-2:])}\b", d.en) for w in targets):
                warnings.append("The English draft does not mention the target woreda. Check it.")
            return d

        out, ms = await self._run("draft", DraftOut, body.case.case_id, payload,
                                  lambda: rules.draft(body), post)
        return self._wrap(out, rid, ms, pii)

    # ───────────────────── 6. resources ─────────────────────
    async def resources(self, case: CaseIn, rid: str) -> Envelope:
        payload, pii = _payload_case(case)

        def post(d: ResourcesOut, warnings: list[str]) -> ResourcesOut:
            seen: set[str] = set()
            d.recommendations = [r for r in d.recommendations if not (r.org in seen or seen.add(r.org))]
            return d

        out, ms = await self._run("resources", ResourcesOut, case.case_id, payload,
                                  lambda: rules.resources(case), post)
        return self._wrap(out, rid, ms, pii)
