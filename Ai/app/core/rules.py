"""Last-resort answers that need no AI and no network.

These exist so the system still produces something sensible when every provider is down.
They are deliberately plain and always report LOW confidence, so the UI shows them as weak.
Don't make them cleverer: a clever fallback hides the fact that the AI is down.
"""
from __future__ import annotations

from .schemas import (
    AreaOut,
    CaseBrief,
    CaseIn,
    DraftIn,
    DraftOut,
    RankedItem,
    RankIn,
    RankOut,
    ResourceItem,
    ResourcesOut,
    SummaryOut,
    TriageOut,
)

RULES_CONFIDENCE = 0.35
_WHY = "Rule-based fallback: AI providers were unavailable"

# ───── triage ─────
_CRITICAL = ("evacuat", "collapse", "explosion", "trapped", "casualt", "fatal", "dead", "killed",
             "armed", "gunfire", "shooting")
_HIGH = ("flood", "fire", "outbreak", "cluster", "injur", "landslide", "overflow", "spreading",
         "missing child", "ጎርፍ", "እሳት")
_CATEGORY_WORDS: list[tuple[str, tuple[str, ...]]] = [
    ("disease", ("outbreak", "diarrhea", "diarrhoea", "cholera", "fever", "symptom", "vomit", "disease", "በሽታ")),
    ("fire", ("fire", "flames", "smoke", "burning", "እሳት")),
    ("flood", ("flood", "river", "overflow", "water entering", "ጎርፍ")),
    ("missing_person", ("missing", "last seen", "የጠፋ")),
    ("accident", ("collision", "collided", "crash", "accident", "injured")),
    ("security", ("armed", "gunfire", "clash", "violence", "attack", "shooting")),
    ("weather", ("storm", "hail", "wind", "forecast", "rainfall", "heat", "drought")),
]
_SUGGESTED_TO_SEVERITY = {"information": "low", "warning": "medium", "critical": "critical"}


def _first_sentence(text: str, limit: int = 200) -> str:
    s = " ".join(text.split())
    cut = s.split(". ")[0]
    return (cut if len(cut) <= limit else cut[: limit - 1] + "…").rstrip(".") + "."


def triage(case: CaseIn) -> TriageOut:
    text = case.description.lower()
    severity = _SUGGESTED_TO_SEVERITY.get(case.suggested_severity or "", "medium")
    reasons = [_WHY]
    crit = next((w for w in _CRITICAL if w in text), None)
    high = next((w for w in _HIGH if w in text), None)
    if crit:
        severity = "critical"
        reasons.append(f"Life-safety keyword in report: '{crit}'")
    elif high and severity in ("low", "medium"):
        severity = "high"
        reasons.append(f"Hazard keyword in report: '{high}'")
    category = case.category
    if category == "other":
        category = next((c for c, words in _CATEGORY_WORDS if any(w in text for w in words)), "other")
    return TriageOut(
        category=category, severity=severity, confidence=RULES_CONFIDENCE,
        summary=_first_sentence(case.description), reasons=reasons[:5],
        missing_info=["Human review needed: this is a keyword-based estimate"],
    )


# ───── summary ─────
def summary_case(case: CaseIn) -> SummaryOut:
    where = f" in {', '.join(case.woredas)}" if case.woredas else ""
    return SummaryOut(
        summary=f"{case.category.replace('_', ' ').capitalize()} report{where}: "
                f"{_first_sentence(case.description, 300)}",
        key_points=[_first_sentence(case.description, 200)], confidence=RULES_CONFIDENCE, reasons=[_WHY],
    )


def summary_set(items: list[CaseBrief], label: str | None) -> SummaryOut:
    order = {"critical": 0, "high": 1, "medium": 2, "low": 3, None: 2}
    ranked = sorted(items, key=lambda i: order[i.severity])
    counts: dict[str, int] = {}
    for i in items:
        counts[i.severity or "unrated"] = counts.get(i.severity or "unrated", 0) + 1
    parts = ", ".join(f"{n} {k}" for k, n in counts.items())
    top = ranked[0]
    return SummaryOut(
        summary=(f"{label or 'Open items'}: {len(items)} open ({parts}). "
                 f"Most urgent looks like {top.category.replace('_', ' ')} ({top.id})."),
        key_points=[f"{i.id}: {i.category.replace('_', ' ')}, {i.severity or 'unrated'}" for i in ranked[:5]],
        confidence=RULES_CONFIDENCE, reasons=[_WHY],
    )


# ───── rank ─────
_SEV_WEIGHT = {"critical": 90, "high": 70, "medium": 45, "low": 15}


def rank(body: RankIn) -> RankOut:
    scored = []
    for it in body.items:
        sev = it.severity or "medium"
        score = _SEV_WEIGHT[sev] + (5 if it.kind == "sos" else 0) + (5 if it.age_minutes <= 30 else 0)
        why = f"{sev} {it.category.replace('_', ' ')}" + ("; citizen SOS" if it.kind == "sos" else "")
        why += f"; reported {it.age_minutes} min ago"
        scored.append((min(score, 100), it.age_minutes, it.id, why))
    scored.sort(key=lambda t: (-t[0], t[1]))
    return RankOut(
        ranking=[RankedItem(id=i, rank=n, score=s, reason=w) for n, (s, _, i, w) in enumerate(scored, 1)],
        confidence=RULES_CONFIDENCE, reasons=[_WHY, "Score = severity + SOS bonus + recency bonus"],
    )


# ───── area ─────
def area(case: CaseIn, allowed: set[str]) -> AreaOut:
    given = [w for w in case.woredas if w in allowed]
    if given:
        return AreaOut(woredas=given, confidence=RULES_CONFIDENCE, reasons=["Using the woredas chosen by the sender"])
    return AreaOut(woredas=[], confidence=0.1, reasons=["No woreda in the report: choose the area manually"])


# ───── resources ─────
_RESOURCES: dict[str, tuple[tuple[str, str], ...]] = {
    "flood": (("EDRMC", "now"), ("LOCAL_DISPATCHER", "now"), ("EMI", "standby")),
    "fire": (("FIRE_BRIGADE", "now"), ("AMBULANCE", "now"), ("LOCAL_DISPATCHER", "now")),
    "disease": (("EPHI", "now"), ("AMBULANCE", "standby"), ("LOCAL_DISPATCHER", "soon")),
    "security": (("FEDERAL_POLICE", "now"), ("LOCAL_DISPATCHER", "now")),
    "missing_person": (("FEDERAL_POLICE", "now"), ("LOCAL_DISPATCHER", "soon")),
    "weather": (("EMI", "now"), ("EDRMC", "soon")),
    "accident": (("AMBULANCE", "now"), ("FEDERAL_POLICE", "now")),
    "other": (("LOCAL_DISPATCHER", "soon"),),
}


def resources(case: CaseIn) -> ResourcesOut:
    recs = [ResourceItem(org=o, priority=p, reason=f"Standard contact for {case.category.replace('_', ' ')} cases")
            for o, p in _RESOURCES[case.category]]
    return ResourcesOut(recommendations=recs, scale="medium", confidence=RULES_CONFIDENCE, reasons=[_WHY])


# ───── draft ─────
# Amharic here is hand-written and short. Have a native speaker read it before the demo.
_LABEL = {
    "flood": ("Flood risk", "የጎርፍ አደጋ"), "fire": ("Fire", "የእሳት አደጋ"),
    "disease": ("Disease outbreak notice", "የበሽታ ወረርሽኝ ማሳሰቢያ"),
    "security": ("Security threat", "የጸጥታ ስጋት"), "missing_person": ("Missing person", "የጠፋ ሰው"),
    "weather": ("Severe weather", "ከባድ የአየር ሁኔታ"), "accident": ("Accident", "አደጋ"),
    "other": ("Emergency", "የአደጋ ጊዜ ሁኔታ"),
}
_ADVICE = {
    "flood": ("Move to higher ground and avoid rivers and low-lying roads.",
              "ወደ ከፍታ ቦታ ይሂዱ፣ ወንዞችንና ዝቅተኛ መንገዶችን ያስወግዱ።"),
    "fire": ("Stay away from the area and keep roads clear for emergency crews.",
             "ከአካባቢው ይራቁ፣ መንገዶችን ለአደጋ ሠራተኞች ክፍት ያድርጉ።"),
    "disease": ("Wash hands with soap, drink safe water, and visit the nearest health facility if you feel sick.",
                "እጅዎን በሳሙና ይታጠቡ፣ ንጹህ ውሃ ይጠጡ፣ ህመም ከተሰማዎት በአቅራቢያ ወዳለ ጤና ተቋም ይሂዱ።"),
    "security": ("Stay indoors, avoid the affected area, and follow instructions from security officials.",
                 "በቤት ውስጥ ይቆዩ፣ የተጎዳውን አካባቢ ያስወግዱ፣ የጸጥታ ኃይሎችን መመሪያ ይከተሉ።"),
    "missing_person": ("If you have seen this person, tell the nearest police station.",
                       "ይህንን ሰው ካዩ በአቅራቢያ ወደሚገኝ ፖሊስ ጣቢያ ያሳውቁ።"),
    "weather": ("Stay indoors if possible and tie down loose objects.",
                "ከተቻለ በቤት ውስጥ ይቆዩ፣ ያልተያዙ ነገሮችን በደንብ ያስሩ።"),
    "accident": ("Avoid the area and let emergency vehicles pass.",
                 "አካባቢውን ያስወግዱ፣ የአደጋ ጊዜ ተሽከርካሪዎች እንዲያልፉ ይፍቀዱ።"),
    "other": ("Follow official instructions.", "የባለስልጣናትን መመሪያ ይከተሉ።"),
}
_PREFIX = {"information": ("NOTICE", "ማሳሰቢያ"), "warning": ("WARNING", "ማስጠንቀቂያ"),
           "critical": ("ALERT", "አስቸኳይ ማስጠንቀቂያ")}


def _num(w: str) -> str:
    return w[-2:]


def _first_clause_en(s: str) -> str:
    return s.replace(" and ", ", ").split(",")[0].rstrip(".") + "."


def _first_clause_am(s: str) -> str:
    return s.split("፣")[0].rstrip("።") + "።"


def draft(body: DraftIn) -> DraftOut:
    case = body.case
    woredas = body.target_woredas or case.woredas
    channel = body.severity or case.suggested_severity or "warning"
    pre_en, pre_am = _PREFIX[channel]
    label_en, label_am = _LABEL[case.category]
    adv_en, adv_am = _ADVICE[case.category]
    area_en = ("Bole Woreda " + ", ".join(_num(w) for w in woredas)) if woredas else "your area"
    area_am = ("ቦሌ ወረዳ " + "፣ ".join(_num(w) for w in woredas)) if woredas else "በአካባቢዎ"
    en = f"{pre_en}: {label_en} in {area_en}. {adv_en}"
    am = f"{pre_am}፡ {label_am} በ{area_am}። {adv_am}"
    if case.category != "other":
        en += " Follow official instructions."
        am += " የባለስልጣናትን መመሪያ ይከተሉ።"
    sms_en = f"{pre_en}: {label_en}, {area_en}. {_first_clause_en(adv_en)}"[:160]
    sms_am = f"{pre_am}፡ {label_am}፣ {area_am}። {_first_clause_am(adv_am)}"[:134]
    return DraftOut(en=en, am=am, sms_en=sms_en, sms_am=sms_am, confidence=RULES_CONFIDENCE,
                    reasons=[_WHY], notes=["Template text. Staff must review and edit before approval."])

