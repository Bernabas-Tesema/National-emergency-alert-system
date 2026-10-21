"""Every request and response shape in one place. This file IS the contract.

docs/AI_CONTRACT.md is the human version. If you change something here, change it there
and tell the backend team.
"""
from __future__ import annotations

import re
from typing import Annotated, Generic, Literal, TypeVar, get_args

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator, model_validator

Category = Literal["flood", "fire", "disease", "security", "missing_person", "weather", "accident", "other"]
Severity = Literal["low", "medium", "high", "critical"]  # AI's rating
ChannelSeverity = Literal["information", "warning", "critical"]  # what the alert flow uses
OrgCode = Literal["EDRMC", "EMI", "EPHI", "FEDERAL_POLICE", "FIRE_BRIGADE", "AMBULANCE",
                  "LOCAL_DISPATCHER", "REGIONAL_BUREAU"]
Lang = Literal["en", "am"]

WoredaId = Annotated[str, Field(pattern=r"^BOLE-W(0[1-9]|1[0-4])$")]
Line = Annotated[str, Field(min_length=1, max_length=240)]
ETHIOPIC = re.compile(r"[ሀ-፿]")

SEVERITY_TO_CHANNEL: dict[str, ChannelSeverity] = {
    "low": "information", "medium": "warning", "high": "warning", "critical": "critical",
}


# ───────────────────────── input tolerance ─────────────────────────
# The backend, the web app and this service each named categories and severities their own way.
# Hints from the sender are mapped here instead of rejected, so a naming difference never becomes
# a 422 on demo day. Model OUTPUT is not touched: it must still match the strict lists above.
_CATEGORY_ALIASES = {
    "health": "disease", "health_disease": "disease", "medical": "disease", "epidemic": "disease",
    "flood_weather": "flood", "security_conflict": "security", "conflict": "security",
    "hazard": "other",
}
_SEVERITY_ALIASES = {"info": "low", "information": "low", "warning": "medium", "warn": "medium"}
_CHANNEL_ALIASES = {"info": "information", "warn": "warning", "low": "information",
                    "medium": "warning", "high": "warning"}


def _key(v: object) -> str:
    return str(v).strip().lower().replace("-", "_").replace(" ", "_")


def _norm_category(v: object) -> object:
    if v is None:
        return "other"
    k = _key(v)
    k = _CATEGORY_ALIASES.get(k, k)
    return k if k in get_args(Category) else "other"


def _norm_severity(v: object) -> object:
    """4-level rating. Accepts any letter case and the backend's 3-level words."""
    if v is None or str(v).strip() == "":
        return None
    k = _key(v)
    k = _SEVERITY_ALIASES.get(k, k)
    return k if k in get_args(Severity) else None


def _norm_channel(v: object) -> object:
    """3-level alert severity. Accepts any letter case and the 4-level words."""
    if v is None or str(v).strip() == "":
        return None
    k = _key(v)
    k = _CHANNEL_ALIASES.get(k, k)
    return k if k in get_args(ChannelSeverity) else None


def _norm_woreda(v: object) -> object:
    return re.sub(r"\s+", "", v).upper() if isinstance(v, str) else v


_WOREDA_TEXT = re.compile(r"bole[\s_-]*(?:w|woreda)?[\s_-]*0?(\d{1,2})\b", re.IGNORECASE)


def woreda_from_text(text: str | None) -> str | None:
    """'Bole Woreda 3' / 'bole-w03' -> 'BOLE-W03'. Anything vaguer (just 'Bole') gives None on purpose."""
    m = _WOREDA_TEXT.search(text or "")
    if m and 1 <= int(m.group(1)) <= 14:
        return f"BOLE-W{int(m.group(1)):02d}"
    return None


CategoryIn = Annotated[Category, BeforeValidator(_norm_category)]
SeverityIn = Annotated[Severity | None, BeforeValidator(_norm_severity)]
ChannelSeverityIn = Annotated[ChannelSeverity | None, BeforeValidator(_norm_channel)]
WoredaIdIn = Annotated[WoredaId, BeforeValidator(_norm_woreda)]


class _Base(BaseModel):
    # Tolerant reader: unknown keys are ignored so a new backend field doesn't break us.
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)


# ───────────────────────── requests ─────────────────────────
class CaseIn(_Base):
    case_id: str | None = Field(default=None, max_length=64, pattern=r"^[A-Za-z0-9_.:-]+$")
    kind: Literal["case", "sos"] = "case"
    category: CategoryIn = "other"  # sender's hint, not trusted
    source_org: str | None = Field(default=None, max_length=64)
    suggested_severity: ChannelSeverityIn = None
    description: str = Field(min_length=3, max_length=4000)
    location_text: str | None = Field(default=None, max_length=300)
    # The backend's free-text `region`. A specific woreda in it is used; a vague one is kept as location text.
    region: str | None = Field(default=None, max_length=128)
    woredas: list[WoredaIdIn] = Field(default_factory=list, max_length=14)
    language: Lang = "en"

    @field_validator("woredas")
    @classmethod
    def _dedupe(cls, v: list[str]) -> list[str]:
        return list(dict.fromkeys(v))

    @model_validator(mode="after")
    def _use_region_text(self) -> CaseIn:
        if self.region and not self.woredas:
            w = woreda_from_text(self.region)
            if w:
                self.woredas = [w]
            elif not self.location_text:
                self.location_text = self.region
        return self


class CaseBrief(_Base):
    id: str = Field(max_length=64)
    kind: Literal["case", "sos"] = "case"
    category: CategoryIn = "other"
    severity: SeverityIn = None
    description: str = Field(default="", max_length=500)
    woredas: list[WoredaIdIn] = Field(default_factory=list, max_length=14)


class SummaryIn(_Base):
    """Give exactly one: `case` for a single case, or `cases` for a region or the whole open queue."""
    case: CaseIn | None = None
    cases: list[CaseBrief] | None = Field(default=None, max_length=50)
    set_id: str | None = Field(default=None, max_length=64, pattern=r"^[A-Za-z0-9_.:-]+$")
    scope_label: str | None = Field(default=None, max_length=80)

    @model_validator(mode="after")
    def _one_of(self) -> SummaryIn:
        if (self.case is None) == (not self.cases):
            raise ValueError("send either `case` or a non-empty `cases`, not both and not neither")
        return self


class RankItemIn(CaseBrief):
    age_minutes: int = Field(default=0, ge=0, le=60 * 24 * 30)


class RankIn(_Base):
    items: list[RankItemIn] = Field(min_length=1, max_length=50)
    set_id: str | None = Field(default=None, max_length=64, pattern=r"^[A-Za-z0-9_.:-]+$")

    @model_validator(mode="after")
    def _unique_ids(self) -> RankIn:
        ids = [i.id for i in self.items]
        if len(ids) != len(set(ids)):
            raise ValueError("item ids must be unique")
        return self


class DraftIn(_Base):
    case: CaseIn
    target_woredas: list[WoredaIdIn] = Field(default_factory=list, max_length=14)
    severity: ChannelSeverityIn = None
    recommended_action: str | None = Field(default=None, max_length=500)


# ───────────────────────── model outputs ─────────────────────────
class _Out(_Base):
    confidence: float = Field(ge=0.0, le=1.0)
    reasons: list[Line] = Field(default_factory=list, max_length=5)


class TriageOut(_Out):
    category: Category
    severity: Severity
    summary: Annotated[str, Field(min_length=1, max_length=400)]
    reasons: list[Line] = Field(min_length=1, max_length=5)
    missing_info: list[Line] = Field(default_factory=list, max_length=5)
    channel_severity: ChannelSeverity | None = None  # filled by us, never trusted from the model


class SummaryOut(_Out):
    summary: Annotated[str, Field(min_length=1, max_length=900)]
    key_points: list[Line] = Field(default_factory=list, max_length=6)


class RankedItem(_Base):
    id: str = Field(max_length=64)
    rank: int = Field(ge=1)
    score: int = Field(ge=0, le=100)
    reason: Line


class RankOut(_Out):
    ranking: list[RankedItem] = Field(min_length=1, max_length=50)


class AreaOut(_Out):
    woredas: list[str] = Field(default_factory=list, max_length=14)  # filtered to real ids afterwards


class DraftOut(_Out):
    en: Annotated[str, Field(min_length=10, max_length=700)]
    am: Annotated[str, Field(min_length=5, max_length=700)]
    sms_en: Annotated[str, Field(min_length=5, max_length=160)]
    sms_am: Annotated[str, Field(min_length=3, max_length=134)]  # 2 UCS-2 SMS segments
    notes: list[Line] = Field(default_factory=list, max_length=3)

    @field_validator("am", "sms_am")
    @classmethod
    def _must_be_amharic(cls, v: str) -> str:
        if not ETHIOPIC.search(v):
            raise ValueError("must be written in Amharic (Ge'ez) script")
        return v

    @field_validator("en", "sms_en")
    @classmethod
    def _must_not_be_amharic(cls, v: str) -> str:
        letters = [c for c in v if c.isalpha()]
        if letters and sum(bool(ETHIOPIC.match(c)) for c in letters) / len(letters) > 0.3:
            raise ValueError("English fields must be in English")
        return v


class ResourceItem(_Base):
    org: OrgCode
    priority: Literal["now", "soon", "standby"]
    reason: Line


class ResourcesOut(_Out):
    recommendations: list[ResourceItem] = Field(min_length=1, max_length=6)
    scale: Literal["low", "medium", "high"]


# ───────────────────────── envelope ─────────────────────────
T = TypeVar("T", bound=BaseModel)


class Envelope(BaseModel, Generic[T]):
    """Same wrapper for every endpoint. The backend stores it as-is in `ai_outputs`."""
    suggestion: Literal[True] = True  # always: AI never decides anything
    request_id: str
    source: Literal["llm", "cache", "rules"]
    provider: str | None = None
    model: str | None = None
    cached: bool
    latency_ms: int
    prompt_version: str
    confidence: float
    low_confidence: bool
    reasons: list[str]
    warnings: list[str]
    data: T


TASK_SCHEMAS: dict[str, type[BaseModel]] = {
    "triage": TriageOut, "summary": SummaryOut, "rank": RankOut,
    "area": AreaOut, "draft": DraftOut, "resources": ResourcesOut,
}

