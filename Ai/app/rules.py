from .schemas import Case, Draft, ItemSet, Rank, Ranked, Summary, Triage

CONFIDENCE = 0.35
CRITICAL = ("evacuat", "collapse", "explosion", "trapped", "casualt", "fatal", "dead", "killed", "armed",
            "gunfire", "shooting")
HIGH = ("flood", "fire", "outbreak", "injur", "landslide", "overflow", "missing child", "ጎርፍ", "እሳት")
WORDS = {
    "disease": ("outbreak", "diarrhea", "cholera", "fever", "vomit", "disease", "በሽታ"),
    "fire": ("fire", "flames", "smoke", "burning", "እሳት"),
    "flood": ("flood", "river", "overflow", "water entering", "ጎርፍ"),
    "missing_person": ("missing", "last seen", "የጠፋ"),
    "accident": ("collision", "crash", "accident", "injured"),
    "security": ("armed", "gunfire", "clash", "violence", "attack", "shooting"),
    "weather": ("storm", "hail", "wind", "rainfall", "heat", "drought"),
}
WEIGHT = {"critical": 90, "high": 70, "medium": 45, "low": 15, None: 45}
LABEL = {
    "flood": ("Flood risk", "የጎርፍ አደጋ", "Move to higher ground and avoid rivers.", "ወደ ከፍታ ቦታ ይሂዱ፣ ወንዞችን ያስወግዱ።"),
    "fire": ("Fire", "የእሳት አደጋ", "Stay away and keep roads clear for crews.", "ይራቁ፣ መንገዶችን ክፍት ያድርጉ።"),
    "disease": ("Disease outbreak", "የበሽታ ወረርሽኝ", "Wash hands and visit a health facility if sick.",
                "እጅዎን ይታጠቡ፣ ህመም ከተሰማዎት ወደ ጤና ተቋም ይሂዱ።"),
    "security": ("Security threat", "የጸጥታ ስጋት", "Stay indoors and follow security officials.",
                 "በቤት ይቆዩ፣ የጸጥታ ኃይሎችን መመሪያ ይከተሉ።"),
    "missing_person": ("Missing person", "የጠፋ ሰው", "If you saw this person, tell the nearest police station.",
                       "ካዩ ለአቅራቢያ ፖሊስ ጣቢያ ያሳውቁ።"),
    "weather": ("Severe weather", "ከባድ የአየር ሁኔታ", "Stay indoors if possible.", "ከተቻለ በቤት ይቆዩ።"),
    "accident": ("Accident", "አደጋ", "Avoid the area and let emergency vehicles pass.",
                 "አካባቢውን ያስወግዱ፣ የአደጋ ተሽከርካሪዎችን ያሳልፉ።"),
    "other": ("Emergency", "የአደጋ ጊዜ ሁኔታ", "Follow official instructions.", "የባለስልጣናትን መመሪያ ይከተሉ።"),
}
PREFIX = {"low": ("NOTICE", "ማሳሰቢያ"), "medium": ("WARNING", "ማስጠንቀቂያ"), "high": ("WARNING", "ማስጠንቀቂያ"),
          "critical": ("ALERT", "አስቸኳይ ማስጠንቀቂያ")}


def first_sentence(text: str) -> str:
    return " ".join(text.split()).split(". ")[0][:200].rstrip(".") + "."


def triage(case: Case) -> Triage:
    text = case.description.lower()
    severity = case.suggested_severity or "medium"
    critical = next((w for w in CRITICAL if w in text), None)
    high = next((w for w in HIGH if w in text), None)
    if critical:
        severity = "critical"
    elif high and severity in ("low", "medium"):
        severity = "high"
    category = case.category
    if category == "other":
        category = next((c for c, words in WORDS.items() if any(w in text for w in words)), "other")
    why = f"Keyword in report: '{critical or high}'" if critical or high else "No danger keyword found"
    return Triage(category=category, severity=severity, summary=first_sentence(case.description),
                  reasons=[why, "Keyword-based estimate, needs human review"], confidence=CONFIDENCE)


def _score(item) -> int:
    return min(WEIGHT[item.severity] + (5 if item.age_minutes <= 30 else 0), 100)


def rank(body: ItemSet) -> Rank:
    ordered = sorted(body.items, key=lambda i: (-_score(i), i.age_minutes))
    return Rank(confidence=CONFIDENCE, ranking=[
        Ranked(id=i.id, rank=n, score=_score(i), reason=f"{i.severity or 'unrated'} {i.category.replace('_', ' ')}")
        for n, i in enumerate(ordered, 1)])


def summary(body: ItemSet) -> Summary:
    ordered = sorted(body.items, key=lambda i: -_score(i))
    top = ordered[0]
    return Summary(
        summary=f"{len(ordered)} open items. Most urgent looks like {top.category.replace('_', ' ')} ({top.id}).",
        key_points=[f"{i.id}: {i.category.replace('_', ' ')}, {i.severity or 'unrated'}" for i in ordered[:5]],
        confidence=CONFIDENCE)


def draft(case: Case) -> Draft:
    prefix_en, prefix_am = PREFIX[case.suggested_severity or "medium"]
    label_en, label_am, advice_en, advice_am = LABEL[case.category]
    where_en = f" in {case.region}" if case.region else ""
    where_am = f" {case.region}" if case.region else ""
    return Draft(
        en=f"{prefix_en}: {label_en}{where_en}. {advice_en} Follow official instructions.",
        am=f"{prefix_am}፡ {label_am}{where_am}። {advice_am} የባለስልጣናትን መመሪያ ይከተሉ።",
        sms_en=f"{prefix_en}: {label_en}. {advice_en}"[:160],
        sms_am=f"{prefix_am}፡ {label_am}። {advice_am}"[:134],
        confidence=CONFIDENCE)