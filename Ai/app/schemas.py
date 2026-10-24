import re
from typing import Annotated, Literal, get_args

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator, model_validator

Category = Literal["flood", "fire", "disease", "security", "missing_person", "weather", "accident", "other"]
Severity = Literal["low", "medium", "high", "critical"]
CATEGORIES = get_args(Category)
SEVERITIES = get_args(Severity)

CHANNEL = {"low": "information", "medium": "warning", "high": "warning", "critical": "critical"}
CATEGORY_ALIAS = {"health": "disease", "health_disease": "disease", "flood_weather": "flood",
                  "security_conflict": "security"}
SEVERITY_ALIAS = {"information": "low", "info": "low", "warning": "medium"}
GEEZ = re.compile(r"[\u1200-\u137F]")
LINK_OR_PHONE = re.compile(r"https?://|www\.|\d{7,}", re.IGNORECASE)


def _key(value) -> str:
    return str(value).strip().lower().replace("-", "_").replace(" ", "_")


def _category(value):
    key = CATEGORY_ALIAS.get(_key(value), _key(value))
    return key if key in CATEGORIES else "other"


def _severity(value):
    key = SEVERITY_ALIAS.get(_key(value), _key(value))
    return key if key in SEVERITIES else None


CategoryIn = Annotated[Category, BeforeValidator(_category)]
SeverityIn = Annotated[Severity | None, BeforeValidator(_severity)]


class Case(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)
    case_id: str | None = Field(None, max_length=64)
    category: CategoryIn = "other"
    suggested_severity: SeverityIn = None
    description: str = Field(min_length=3, max_length=4000)
    region: str | None = Field(None, max_length=128)


class Item(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)
    id: str = Field(max_length=64)
    category: CategoryIn = "other"
    severity: SeverityIn = None
    description: str = Field("", max_length=500)
    age_minutes: int = Field(0, ge=0)


class ItemSet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    set_id: str | None = Field(None, max_length=64)
    items: list[Item] = Field(min_length=1, max_length=50)

    @model_validator(mode="after")
    def unique_ids(self):
        if len({i.id for i in self.items}) != len(self.items):
            raise ValueError("item ids must be unique")
        return self


Confidence = Annotated[float, Field(ge=0, le=1)]


class Triage(BaseModel):
    category: Category
    severity: Severity
    summary: str = Field(min_length=1, max_length=400)
    reasons: list[str] = Field(default_factory=list, max_length=5)
    confidence: Confidence
    channel_severity: str | None = None


class Summary(BaseModel):
    summary: str = Field(min_length=1, max_length=900)
    key_points: list[str] = Field(default_factory=list, max_length=6)
    confidence: Confidence


class Ranked(BaseModel):
    id: str
    rank: int = Field(ge=1)
    score: int = Field(ge=0, le=100)
    reason: str


class Rank(BaseModel):
    ranking: list[Ranked] = Field(min_length=1, max_length=50)
    confidence: Confidence


class Draft(BaseModel):
    en: str = Field(min_length=10, max_length=700)
    am: str = Field(min_length=5, max_length=700)
    sms_en: str = Field(min_length=5, max_length=160)
    sms_am: str = Field(min_length=3, max_length=134)
    confidence: Confidence

    @field_validator("am", "sms_am")
    @classmethod
    def amharic(cls, v):
        if not GEEZ.search(v):
            raise ValueError("must be Amharic (Ge'ez script)")
        return v

    @model_validator(mode="after")
    def no_links_or_phones(self):
        if LINK_OR_PHONE.search(f"{self.en} {self.am} {self.sms_en} {self.sms_am}"):
            raise ValueError("draft must not contain links or phone numbers")
        return self


TASKS = {"triage": Triage, "summary": Summary, "rank": Rank, "draft": Draft}