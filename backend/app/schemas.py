from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Severity = Literal["information", "warning", "critical"]
CaseType = Literal["accident", "fire", "missing_person", "health", "flood", "other"]


class PhoneVerifyRequest(BaseModel):
    phone: str = Field(min_length=7, max_length=32)


class PhoneVerifyResponse(BaseModel):
    linked: bool
    otp_reference: str | None = None
    debug_otp: str | None = None


class PhoneConfirmRequest(BaseModel):
    phone: str
    otp: str = Field(min_length=6, max_length=6)
    device_token: str | None = None
    language: str = "en"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class StaffLoginRequest(BaseModel):
    username: str
    password: str


class CaseCreate(BaseModel):
    case_type: CaseType
    severity: Severity = "warning"
    description: str = Field(min_length=5, max_length=5000)
    region: str = Field(min_length=1, max_length=128)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    organization: str | None = Field(default=None, max_length=160)
    title: str = Field(default="", max_length=200)


class ReviewRequest(BaseModel):
    decision: Literal["verify", "reject", "clarification"]
    comment: str | None = Field(default=None, max_length=2000)


class AlertDraftCreate(BaseModel):
    case_id: int
    title: str = Field(min_length=3, max_length=200)
    message: str = Field(min_length=5, max_length=10000)
    channels: list[Literal["push", "sms", "voice"]] = ["push"]


class ApprovalRequest(BaseModel):
    signature: str = Field(min_length=8, max_length=512)


class SosCreate(BaseModel):
    case_type: CaseType
    description: str = Field(min_length=5, max_length=5000)
    region: str = Field(min_length=1, max_length=128)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class CaseResponse(BaseModel):
    id: int
    status: str
    case_type: str
    severity: str
    region: str
    created_at: datetime
    title: str = ""
    description: str = ""
    organization: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    review_comment: str | None = None
    created_by: str | None = None

    model_config = {"from_attributes": True}
