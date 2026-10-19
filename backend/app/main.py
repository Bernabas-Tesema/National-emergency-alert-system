import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import Base, engine, get_db
from .models import Alert, AuditLog, Case, Citizen, DeliveryLog
from .schemas import (
    AlertDraftCreate,
    ApprovalRequest,
    CaseCreate,
    CaseResponse,
    PhoneConfirmRequest,
    PhoneVerifyRequest,
    PhoneVerifyResponse,
    ReviewRequest,
    SosCreate,
    StaffLoginRequest,
    TokenResponse,
)
from .security import decode_token, hash_fayda_reference, make_token, new_otp

app = FastAPI(title="National Emergency Alert System API", version="0.1.0")
Base.metadata.create_all(bind=engine)

_pending_otps: dict[str, tuple[str, datetime]] = {}


def audit(db: Session, actor: str, action: str, resource: str, request: Request, metadata: dict | None = None) -> None:
    db.add(AuditLog(actor=actor, action=action, resource=resource, ip_address=request.client.host if request.client else "unknown", audit_metadata=metadata or {}))


def current_identity(authorization: Annotated[str | None, Header()] = None) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required")
    try:
        return decode_token(authorization.split(" ", 1)[1])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc


def require_roles(*roles: str):
    def dependency(identity: dict = Depends(current_identity)) -> dict:
        if identity.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return identity

    return dependency


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/auth/phone/verify", response_model=PhoneVerifyResponse)
def verify_phone(payload: PhoneVerifyRequest) -> PhoneVerifyResponse:
    # Fayda is intentionally an adapter boundary. Local development accepts Ethiopian numbers only.
    linked = payload.phone.startswith("+251")
    if not linked:
        return PhoneVerifyResponse(linked=False)
    otp = new_otp()
    reference = secrets.token_urlsafe(12)
    _pending_otps[payload.phone] = (otp, datetime.now(timezone.utc) + timedelta(minutes=int(os.getenv("OTP_MINUTES", "5"))))
    return PhoneVerifyResponse(linked=True, otp_reference=reference, debug_otp=otp if os.getenv("DEV_MODE", "true").lower() == "true" else None)


@app.post("/api/v1/auth/phone/confirm", response_model=TokenResponse)
def confirm_phone(payload: PhoneConfirmRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    pending = _pending_otps.get(payload.phone)
    if not pending or pending[1] < datetime.now(timezone.utc) or not secrets.compare_digest(pending[0], payload.otp):
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    citizen = db.scalar(select(Citizen).where(Citizen.phone == payload.phone))
    if citizen is None:
        citizen = Citizen(phone=payload.phone, fayda_id_hash=hash_fayda_reference(payload.phone), registered_region="Addis Ababa", device_token=payload.device_token, language=payload.language)
        db.add(citizen)
        db.flush()
    else:
        citizen.device_token = payload.device_token or citizen.device_token
        citizen.language = payload.language
    audit(db, payload.phone, "citizen_login", f"citizen:{citizen.id}", request)
    db.commit()
    _pending_otps.pop(payload.phone, None)
    return TokenResponse(access_token=make_token(str(citizen.id), "citizen"))


@app.post("/api/v1/auth/staff/login", response_model=TokenResponse)
def staff_login(payload: StaffLoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    credentials = {
        "insa_admin": (os.getenv("STAFF_ADMIN_PASSWORD", "change-me"), "insa_admin"),
        "insa_officer": (os.getenv("STAFF_OFFICER_PASSWORD", "change-me"), "insa_officer"),
        "org_officer": (os.getenv("STAFF_ADMIN_PASSWORD", "change-me"), "organization_officer"),
    }
    expected = credentials.get(payload.username)
    if not expected or not secrets.compare_digest(payload.password, expected[0]):
        raise HTTPException(status_code=401, detail="Invalid staff credentials")
    audit(db, payload.username, "staff_login", f"staff:{payload.username}", request)
    db.commit()
    return TokenResponse(access_token=make_token(payload.username, expected[1]))


@app.post("/api/v1/cases", response_model=CaseResponse, status_code=201)
def create_case(payload: CaseCreate, request: Request, identity: dict = Depends(require_roles("organization_officer")), db: Session = Depends(get_db)) -> Case:
    case = Case(organization=payload.organization, case_type=payload.case_type, severity=payload.severity, description=payload.description, region=payload.region, latitude=payload.latitude, longitude=payload.longitude)
    db.add(case)
    db.flush()
    audit(db, identity["sub"], "case_created", f"case:{case.id}", request)
    db.commit()
    db.refresh(case)
    return case


@app.get("/api/v1/cases/{case_id}", response_model=CaseResponse)
def get_case(case_id: int, identity: dict = Depends(current_identity), db: Session = Depends(get_db)) -> Case:
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if identity["role"] == "citizen" and case.reporter_id != int(identity["sub"]):
        raise HTTPException(status_code=403, detail="Case is not accessible")
    return case


@app.post("/api/v1/cases/{case_id}/review")
def review_case(case_id: int, payload: ReviewRequest, request: Request, identity: dict = Depends(require_roles("insa_admin")), db: Session = Depends(get_db)) -> dict:
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    case.status = {"verify": "verified", "reject": "rejected", "clarification": "clarification_requested"}[payload.decision]
    audit(db, identity["sub"], f"case_{payload.decision}", f"case:{case_id}", request, {"comment": payload.comment})
    db.commit()
    return {"case_id": case_id, "status": case.status}


@app.post("/api/v1/alerts/draft", status_code=201)
def create_alert_draft(payload: AlertDraftCreate, request: Request, identity: dict = Depends(require_roles("insa_admin")), db: Session = Depends(get_db)) -> dict:
    case = db.get(Case, payload.case_id)
    if not case or case.status != "verified":
        raise HTTPException(status_code=409, detail="Only verified cases can become alert drafts")
    alert = Alert(case_id=case.id, reviewer_id=identity["sub"], title=payload.title, message=payload.message, severity=case.severity, region=case.region, channels=payload.channels)
    db.add(alert)
    db.flush()
    audit(db, identity["sub"], "alert_drafted", f"alert:{alert.id}", request)
    db.commit()
    return {"id": alert.id, "status": alert.status, "case_id": alert.case_id}


@app.post("/api/v1/alerts/{alert_id}/approve")
def approve_alert(alert_id: int, payload: ApprovalRequest, request: Request, identity: dict = Depends(require_roles("insa_officer")), db: Session = Depends(get_db)) -> dict:
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.status != "draft":
        raise HTTPException(status_code=409, detail="Alert is not awaiting approval")
    if alert.reviewer_id == identity["sub"]:
        raise HTTPException(status_code=409, detail="The reviewer and approver must be different people")
    alert.approver_id = identity["sub"]
    alert.status = "approved"
    alert.approved_at = datetime.now(timezone.utc)
    audit(db, identity["sub"], "alert_approved", f"alert:{alert_id}", request, {"signature": payload.signature})
    db.commit()
    return {"id": alert.id, "status": alert.status}


@app.post("/api/v1/alerts/broadcast")
def broadcast_alert(alert_id: int, request: Request, identity: dict = Depends(require_roles("insa_admin", "insa_officer")), db: Session = Depends(get_db)) -> dict:
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.status != "approved":
        raise HTTPException(status_code=409, detail="Only approved alerts can be dispatched")
    citizens = db.scalars(select(Citizen).where(Citizen.registered_region == alert.region)).all()
    for citizen in citizens:
        for channel in alert.channels:
            db.add(DeliveryLog(alert_id=alert.id, citizen_id=citizen.id, channel=channel))
    alert.status = "dispatched"
    alert.dispatched_at = datetime.now(timezone.utc)
    audit(db, identity["sub"], "alert_dispatched", f"alert:{alert_id}", request, {"recipient_count": len(citizens)})
    db.commit()
    return {"id": alert.id, "status": alert.status, "recipient_count": len(citizens), "channels": alert.channels}


@app.post("/api/v1/sos/submit", response_model=CaseResponse, status_code=201)
def submit_sos(payload: SosCreate, request: Request, identity: dict = Depends(require_roles("citizen")), db: Session = Depends(get_db)) -> Case:
    case = Case(reporter_id=int(identity["sub"]), case_type=payload.case_type, severity="critical", description=payload.description, region=payload.region, latitude=payload.latitude, longitude=payload.longitude, status="new")
    db.add(case)
    db.flush()
    audit(db, identity["sub"], "sos_submitted", f"case:{case.id}", request)
    db.commit()
    db.refresh(case)
    return case


@app.get("/api/v1/alerts/mine")
def my_alerts(identity: dict = Depends(require_roles("citizen")), db: Session = Depends(get_db)) -> list[dict]:
    citizen = db.get(Citizen, int(identity["sub"]))
    if not citizen:
        raise HTTPException(status_code=404, detail="Citizen not found")
    alerts = db.scalars(select(Alert).where(Alert.region == citizen.registered_region, Alert.status == "dispatched").order_by(Alert.dispatched_at.desc())).all()
    return [{"id": alert.id, "title": alert.title, "message": alert.message, "severity": alert.severity, "region": alert.region, "channels": alert.channels, "dispatched_at": alert.dispatched_at} for alert in alerts]
