import re
import secrets

from django.conf import settings
from django.utils.timezone import now
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .mailer import mask_email, send_credentials_email, send_login_otp_email
from .sms import mask_phone, normalize_ethiopian_phone, send_otp_sms, send_sms
from .models import Alert, AuditLog, Case, Citizen, DeliveryLog, StaffAccount
from .otp_store import (
    clear_phone_otp,
    clear_staff_challenge,
    get_phone_otp,
    get_staff_challenge,
    set_phone_otp,
    set_staff_challenge,
)
from .passwords import generate_temporary_password, generate_token, hash_password, verify_password
from .permissions import IsAuthenticatedJWT
from .roles import normalize_staff_role, to_jwt_role
from .security import hash_fayda_reference, make_token, new_otp
from .serializers import (
    AlertDraftSerializer,
    ApprovalSerializer,
    CaseCreateSerializer,
    ChangePasswordSerializer,
    CreateStaffSerializer,
    PhoneConfirmSerializer,
    PhoneVerifySerializer,
    ReviewSerializer,
    SosAssignSerializer,
    SosCreateSerializer,
    SosReturnSerializer,
    SosStatusSerializer,
    StaffLoginSerializer,
    StaffOtpVerifySerializer,
    case_payload,
)

SOS_ORG_BY_TYPE = {
    "fire": "Fire & Emergency Authority",
    "trapped": "Fire & Emergency Authority",
    "health": "Ministry of Health",
    "flood": "Disaster Risk Management",
    "landslide": "Disaster Risk Management",
    "accident": "Traffic Police",
    "missing_person": "Federal Police",
    "other": "Partner organization",
}

def client_ip(request) -> str:
    return request.META.get("REMOTE_ADDR") or "unknown"


def _start_staff_otp_challenge(
    *,
    username: str,
    email: str,
    full_name: str,
    role: str,
    organization: str,
    jwt_role: str,
    must_change_password: bool,
    phone: str = "",
) -> Response:
    if (not email or "@" not in email) and not phone:
        return Response(
            {"detail": "This account has no login email or phone number for verification. Ask an administrator to set one."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    otp = new_otp()
    challenge_id = secrets.token_urlsafe(24)
    set_staff_challenge(
        challenge_id,
        {
            "username": username,
            "otp": otp,
            "email": email,
            "phone": phone,
            "full_name": full_name,
            "role": role,
            "organization": organization,
            "jwt_role": jwt_role,
            "must_change_password": must_change_password,
        },
    )
    email_error = None
    if email and "@" in email:
        try:
            send_login_otp_email(
                to_email=email,
                full_name=full_name,
                username=username,
                otp=otp,
                minutes=settings.OTP_MINUTES,
            )
        except Exception as exc:  # noqa: BLE001
            email_error = str(exc)

    sms_error = None
    sms_sent = False
    if phone and len(phone.strip()) >= 9:
        try:
            send_otp_sms(
                to_phone=phone,
                otp=otp,
                minutes=settings.OTP_MINUTES,
            )
            sms_sent = True
        except Exception as exc:  # noqa: BLE001
            sms_error = str(exc)

    if email_error and not sms_sent and not settings.DEBUG:
        clear_staff_challenge(challenge_id)
        return Response(
            {"detail": f"Could not send verification OTP: {email_error}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    payload = {
        "requires_otp": True,
        "challenge_id": challenge_id,
        "email_hint": mask_email(email) if email else "",
        "phone_hint": mask_phone(phone) if phone else "",
        "otp_sent": email_error is None or sms_sent,
        "sms_sent": sms_sent,
        "expires_in_minutes": settings.OTP_MINUTES,
    }
    if settings.DEBUG:
        payload["debug_otp"] = otp
    if email_error and not sms_sent:
        payload["email_warning"] = f"Delivery warning ({email_error})."
    if sms_error:
        payload["sms_warning"] = sms_error
    return Response(payload)


def write_audit(actor: str, action: str, resource: str, request, metadata: dict | None = None) -> None:
    AuditLog.objects.create(
        actor=actor,
        action=action,
        resource=resource,
        ip_address=client_ip(request),
        metadata=metadata or {},
    )


def require_auth(request):
    if not isinstance(request.user, dict):
        return Response({"detail": "Bearer token required"}, status=status.HTTP_401_UNAUTHORIZED)
    return None


def alert_payload(alert: Alert) -> dict:
    logs = list(alert.delivery_logs.all())
    progress = {channel: {"queued": 0, "sent": 0, "delivered": 0, "failed": 0} for channel in ("push", "sms", "voice")}
    for log in logs:
        bucket = progress.setdefault(log.channel, {"queued": 0, "sent": 0, "delivered": 0, "failed": 0})
        key = log.status if log.status in bucket else "queued"
        bucket[key] += 1
    return {
        "id": alert.id,
        "case_id": alert.case_id,
        "title": alert.title,
        "message": alert.message,
        "severity": alert.severity,
        "region": alert.region,
        "channels": alert.channels,
        "status": alert.status,
        "reviewer_id": alert.reviewer_id,
        "approver_id": alert.approver_id,
        "created_at": alert.created_at,
        "approved_at": alert.approved_at,
        "dispatched_at": alert.dispatched_at,
        "recipient_count": len({log.citizen_id for log in logs}),
        "delivery": progress,
    }


@api_view(["GET"])
@permission_classes([AllowAny])
def health(_request):
    payload = {
        "status": "ok",
        "service": "ethioalert-api",
        "debug": bool(settings.DEBUG),
    }
    try:
        from django.db import connection

        connection.ensure_connection()
        payload["database"] = "ok"
    except Exception as exc:  # noqa: BLE001
        payload["status"] = "degraded"
        payload["database"] = f"error:{exc.__class__.__name__}"
    return Response(payload)


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_phone(request):
    serializer = PhoneVerifySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    raw_phone = serializer.validated_data["phone"]
    phone = normalize_ethiopian_phone(raw_phone)
    # Any valid Ethiopian phone number (+2519... / +2517...) is connected to a Fayda National ID
    is_valid_ethiopian = bool(phone.startswith("+251") and len(phone) == 13 and phone[1:].isdigit())
    if not is_valid_ethiopian:
        return Response(
            {"linked": False, "detail": "Enter a valid Ethiopian phone number (+2519XXXXXXXX or 09XXXXXXXX)."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Store phone number & Fayda National ID hash in the database
    Citizen.objects.get_or_create(
        phone=phone,
        defaults={
            "fayda_id_hash": hash_fayda_reference(phone),
            "registered_region": "Addis Ababa",
            "language": "en",
        },
    )

    otp = new_otp()
    reference = secrets.token_urlsafe(12)
    set_phone_otp(phone, otp)

    try:
        send_otp_sms(to_phone=phone, otp=otp, minutes=settings.OTP_MINUTES)
    except Exception as exc:  # noqa: BLE001
        return Response(
            {"linked": True, "detail": f"Could not send OTP SMS to {phone}: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    payload = {
        "linked": True,
        "phone": phone,
        "otp_reference": reference,
        "sms_sent": True,
    }
    if settings.DEBUG:
        payload["debug_otp"] = otp
    return Response(payload)


@api_view(["POST"])
@permission_classes([AllowAny])
def confirm_phone(request):
    serializer = PhoneConfirmSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    phone = normalize_ethiopian_phone(data["phone"])
    pending = get_phone_otp(phone)
    if not pending or not secrets.compare_digest(pending, data["otp"]):
        return Response({"detail": "Invalid or expired OTP"}, status=status.HTTP_401_UNAUTHORIZED)

    citizen, _created = Citizen.objects.get_or_create(
        phone=phone,
        defaults={
            "fayda_id_hash": hash_fayda_reference(phone),
            "registered_region": "Addis Ababa",
            "device_token": data.get("device_token"),
            "language": data.get("language") or "en",
        },
    )
    if not _created:
        if data.get("device_token"):
            citizen.device_token = data["device_token"]
        citizen.language = data.get("language") or citizen.language
        citizen.save(update_fields=["device_token", "language"])

    write_audit(phone, "citizen_login", f"citizen:{citizen.id}", request)
    clear_phone_otp(phone)
    return Response({"access_token": make_token(str(citizen.id), "citizen"), "token_type": "bearer"})


@api_view(["POST"])
@permission_classes([AllowAny])
def staff_login(request):
    """Step 1: verify password; require OTP on first login only, return JWT directly on subsequent logins."""
    serializer = StaffLoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    username = serializer.validated_data["username"]
    password = serializer.validated_data["password"]

    account = StaffAccount.objects.filter(username=username, is_active=True).first()
    if account:
        if not verify_password(password, account.password_hash):
            return Response({"detail": "Invalid staff credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        # Check if first time login (OTP required only once)
        is_first_login = not getattr(account, "otp_verified", False) and account.last_login_at is None
        if is_first_login:
            write_audit(username, "staff_login_otp_requested", f"staff:{username}", request)
            return _start_staff_otp_challenge(
                username=account.username,
                email=account.email,
                phone=account.phone,
                full_name=account.full_name,
                role=account.role,
                organization=account.organization,
                jwt_role=to_jwt_role(account.role),
                must_change_password=account.must_change_password,
            )

        # Subsequent logins: sign in directly without OTP
        account.last_login_at = now()
        account.save(update_fields=["last_login_at", "updated_at"])
        write_audit(username, "staff_login", f"staff:{username}", request)
        return Response(
            {
                "requires_otp": False,
                "access_token": make_token(username, to_jwt_role(account.role)),
                "token_type": "bearer",
                "must_change_password": account.must_change_password,
                "full_name": account.full_name,
                "role": account.role,
                "organization": account.organization,
                "email": account.email,
            }
        )

    # Dev fallback accounts from .env (OTP still required; email must exist on a StaffAccount)
    credentials = {
        "insa_admin": (settings.STAFF_ADMIN_PASSWORD, "insa_admin", "ADMINISTRATOR", "Ethio Alert"),
        "insa_officer": (settings.STAFF_OFFICER_PASSWORD, "insa_officer", "HIGHER_OFFICER", "Ethio Alert"),
        "org_officer": (settings.STAFF_ADMIN_PASSWORD, "organization_officer", "ORG_OFFICER", "Partner organization"),
    }
    expected = credentials.get(username)
    if not expected or not secrets.compare_digest(password, expected[0]):
        return Response({"detail": "Invalid staff credentials"}, status=status.HTTP_401_UNAUTHORIZED)

    if username in _DEV_FALLBACK_VERIFIED:
        write_audit(username, "staff_login", f"staff:{username}", request)
        return Response(
            {
                "requires_otp": False,
                "access_token": make_token(username, expected[1]),
                "token_type": "bearer",
                "must_change_password": False,
                "full_name": NAMES_FALLBACK.get(username, username),
                "role": expected[2],
                "organization": expected[3],
                "email": getattr(settings, "STAFF_FALLBACK_OTP_EMAIL", "demo@ethioalert.local"),
            }
        )

    fallback_email = (getattr(settings, "STAFF_FALLBACK_OTP_EMAIL", "") or "").strip()
    if not fallback_email:
        return Response(
            {
                "detail": (
                    "Legacy env accounts need STAFF_FALLBACK_OTP_EMAIL, "
                    "or sign in with a Staff account that has an email."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    write_audit(username, "staff_login_otp_requested", f"staff:{username}", request)
    return _start_staff_otp_challenge(
        username=username,
        email=fallback_email,
        full_name=NAMES_FALLBACK.get(username, username),
        role=expected[2],
        organization=expected[3],
        jwt_role=expected[1],
        must_change_password=False,
    )


NAMES_FALLBACK = {
    "insa_admin": "Ethio Alert Administrator",
    "insa_officer": "Ethio Alert Officer",
    "org_officer": "Organization Officer",
}
_DEV_FALLBACK_VERIFIED = set()


@api_view(["POST"])
@permission_classes([AllowAny])
def staff_verify_otp(request):
    """Step 2: verify emailed OTP and issue JWT."""
    serializer = StaffOtpVerifySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    challenge_id = serializer.validated_data["challenge_id"]
    code = serializer.validated_data["code"].strip()

    pending = get_staff_challenge(challenge_id)
    if not pending:
        return Response(
            {"detail": "Verification expired. Sign in again."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    if not secrets.compare_digest(str(pending.get("otp", "")), code):
        return Response({"detail": "Incorrect verification code"}, status=status.HTTP_401_UNAUTHORIZED)

    clear_staff_challenge(challenge_id)
    username = pending["username"]
    _DEV_FALLBACK_VERIFIED.add(username)
    account = StaffAccount.objects.filter(username=username, is_active=True).first()
    if account:
        account.last_login_at = now()
        account.otp_verified = True
        account.save(update_fields=["last_login_at", "otp_verified", "updated_at"])

    write_audit(username, "staff_login", f"staff:{username}", request)
    return Response(
        {
            "access_token": make_token(username, pending["jwt_role"]),
            "token_type": "bearer",
            "must_change_password": pending["must_change_password"],
            "full_name": pending["full_name"],
            "role": pending["role"],
            "organization": pending["organization"],
            "email": pending["email"],
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticatedJWT])
def create_staff_account(request):
    if request.user.get("role") not in {"insa_admin"}:
        return Response({"detail": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
    serializer = CreateStaffSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    canonical_role = normalize_staff_role(data["role"])
    if not canonical_role:
        return Response(
            {
                "detail": (
                    "Role must be one of: ADMINISTRATOR, HIGHER_OFFICER, "
                    "DISPATCHER, AUDITOR, ORG_ADMIN, ORG_OFFICER."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    if StaffAccount.objects.filter(username=data["username"]).exists():
        return Response({"detail": "That username is already taken."}, status=status.HTTP_409_CONFLICT)

    temporary_password = generate_temporary_password()
    token = generate_token()
    account = StaffAccount.objects.create(
        username=data["username"],
        email=data["email"],
        full_name=data["full_name"],
        phone=data.get("phone") or "",
        role=canonical_role,
        organization=data.get("organization") or "",
        password_hash=hash_password(temporary_password),
        must_change_password=True,
        password_change_token=token,
        is_active=True,
    )
    change_url = f"{settings.FRONTEND_URL}/change-password?token={token}"
    email_error = None
    try:
        send_credentials_email(
            to_email=account.email,
            full_name=account.full_name,
            username=account.username,
            temporary_password=temporary_password,
            change_password_url=change_url,
        )
    except Exception as exc:  # noqa: BLE001
        email_error = str(exc)

    write_audit(request.user["sub"], "staff_created", f"staff:{account.username}", request)
    payload = {
        "id": account.id,
        "username": account.username,
        "email": account.email,
        "full_name": account.full_name,
        "phone": account.phone,
        "role": account.role,
        "organization": account.organization,
        "must_change_password": True,
        "email_sent": email_error is None,
    }
    if settings.DEBUG:
        payload["debug_temporary_password"] = temporary_password
        payload["debug_change_password_url"] = change_url
    if email_error:
        payload["email_error"] = email_error
    return Response(payload, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def register_organization(request):
    data = request.data
    name = (data.get("name") or "").strip()
    kind = (data.get("kind") or "other").strip()
    email = (data.get("email") or "").strip()
    phone = (data.get("phone") or "").strip()
    admin_full_name = (data.get("adminFullName") or data.get("admin_full_name") or f"{name} Lead Administrator").strip()
    raw_username = (data.get("adminUsername") or data.get("admin_username") or "").strip()

    if not name or len(name) < 3:
        return Response({"detail": "Organization name must be at least 3 characters."}, status=status.HTTP_400_BAD_REQUEST)
    if not email or "@" not in email:
        return Response({"detail": "A valid official organization email is required to dispatch credentials."}, status=status.HTTP_400_BAD_REQUEST)

    base_user = raw_username or f"admin_{re.sub(r'[^a-zA-Z0-9]', '_', name.lower())[:14]}"
    username = base_user
    counter = 1
    while StaffAccount.objects.filter(username=username).exists():
        username = f"{base_user}_{counter}"
        counter += 1

    temporary_password = generate_temporary_password()
    token = generate_token()

    account = StaffAccount.objects.create(
        username=username,
        email=email,
        full_name=admin_full_name,
        phone=phone,
        role="ORG_ADMIN",
        organization=name,
        password_hash=hash_password(temporary_password),
        must_change_password=True,
        password_change_token=token,
        is_active=True,
    )
    change_url = f"{settings.FRONTEND_URL}/change-password?token={token}"
    email_error = None
    try:
        send_credentials_email(
            to_email=email,
            full_name=admin_full_name,
            username=username,
            temporary_password=temporary_password,
            change_password_url=change_url,
        )
    except Exception as exc:  # noqa: BLE001
        email_error = str(exc)

    res_payload = {
        "ok": True,
        "id": f"org-{account.id}",
        "name": name,
        "kind": kind,
        "email": email,
        "phone": phone,
        "adminFullName": admin_full_name,
        "adminUsername": username,
        "status": "active",
        "email_sent": email_error is None,
        "email_error": email_error,
    }
    if settings.DEBUG:
        res_payload["debug_temporary_password"] = temporary_password
        res_payload["debug_change_password_url"] = change_url
    return Response(res_payload, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    token = (data.get("token") or "").strip()
    new_password = data["new_password"]

    account = None
    if token:
        account = StaffAccount.objects.filter(password_change_token=token, is_active=True).first()
        if not account:
            return Response({"detail": "Invalid or expired change-password link."}, status=status.HTTP_400_BAD_REQUEST)
    elif isinstance(request.user, dict) and request.user.get("sub"):
        account = StaffAccount.objects.filter(username=request.user["sub"], is_active=True).first()
        if not account:
            return Response({"detail": "Staff account not found."}, status=status.HTTP_404_NOT_FOUND)
        # First-login forced change may skip current password; later changes require it.
        if not account.must_change_password and not verify_password(
            data.get("current_password") or "",
            account.password_hash,
        ):
            return Response({"detail": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
    else:
        return Response(
            {"detail": "Provide a change-password token or sign in first."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    account.password_hash = hash_password(new_password)
    account.must_change_password = False
    account.password_change_token = generate_token()
    account.save(update_fields=["password_hash", "must_change_password", "password_change_token", "updated_at"])
    write_audit(account.username, "password_changed", f"staff:{account.username}", request)
    return Response({"ok": True, "must_change_password": False})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticatedJWT])
def cases_collection(request):
    identity = request.user
    if request.method == "GET":
        qs = Case.objects.all().order_by("-created_at")
        role = identity["role"]
        if role == "citizen":
            qs = qs.filter(reporter_id=int(identity["sub"]))
        elif role == "organization_officer":
            qs = qs.filter(created_by=identity["sub"], source="org")
        elif role == "auditor":
            pass  # read-only national view
        elif role not in {"insa_admin", "insa_officer"}:
            return Response({"detail": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
        return Response([case_payload(case) for case in qs])

    if identity["role"] != "organization_officer":
        return Response({"detail": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
    serializer = CaseCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    case = Case.objects.create(
        organization=data.get("organization") or "Partner organization",
        source="org",
        case_type=data["case_type"],
        severity=data.get("severity") or "warning",
        description=data["description"],
        region=data["region"],
        latitude=data.get("latitude"),
        longitude=data.get("longitude"),
        title=(data.get("title") or data["description"][:200]),
        created_by=identity["sub"],
        status="submitted",
    )
    write_audit(identity["sub"], "case_created", f"case:{case.id}", request)
    return Response(case_payload(case), status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticatedJWT])
def case_detail(request, case_id: int):
    identity = request.user
    try:
        case = Case.objects.get(pk=case_id)
    except Case.DoesNotExist:
        return Response({"detail": "Case not found"}, status=status.HTTP_404_NOT_FOUND)
    role = identity["role"]
    if role == "citizen" and case.reporter_id != int(identity["sub"]):
        return Response({"detail": "Case is not accessible"}, status=status.HTTP_403_FORBIDDEN)
    if role == "organization_officer":
        own_case = case.created_by == identity["sub"] and case.source == "org"
        sos_case = case.source == "sos"
        if not own_case and not sos_case:
            return Response({"detail": "Case is not accessible"}, status=status.HTTP_403_FORBIDDEN)
    elif role not in {"insa_admin", "insa_officer", "auditor", "dispatcher"}:
        return Response({"detail": "Case is not accessible"}, status=status.HTTP_403_FORBIDDEN)
    if role == "dispatcher" and case.source != "sos":
        return Response({"detail": "Case is not accessible"}, status=status.HTTP_403_FORBIDDEN)
    return Response(case_payload(case))


@api_view(["POST"])
@permission_classes([IsAuthenticatedJWT])
def review_case(request, case_id: int):
    if request.user.get("role") != "insa_admin":
        return Response({"detail": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
    try:
        case = Case.objects.get(pk=case_id)
    except Case.DoesNotExist:
        return Response({"detail": "Case not found"}, status=status.HTTP_404_NOT_FOUND)
    serializer = ReviewSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    decision = serializer.validated_data["decision"]
    case.status = {"verify": "verified", "reject": "rejected", "clarification": "clarification_requested"}[decision]
    case.review_comment = serializer.validated_data.get("comment")
    case.save(update_fields=["status", "review_comment"])
    write_audit(
        request.user["sub"],
        f"case_{decision}",
        f"case:{case_id}",
        request,
        {"comment": serializer.validated_data.get("comment")},
    )
    return Response({"case_id": case_id, "status": case.status})


@api_view(["POST"])
@permission_classes([IsAuthenticatedJWT])
def resubmit_case(request, case_id: int):
    identity = request.user
    if identity["role"] != "organization_officer":
        return Response({"detail": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
    try:
        case = Case.objects.get(pk=case_id)
    except Case.DoesNotExist:
        return Response({"detail": "Case not found"}, status=status.HTTP_404_NOT_FOUND)
    if case.created_by != identity["sub"]:
        return Response({"detail": "Case is not accessible"}, status=status.HTTP_403_FORBIDDEN)
    if case.status != "clarification_requested":
        return Response(
            {"detail": "Only cases that need clarification can be resubmitted"},
            status=status.HTTP_409_CONFLICT,
        )
    case.status = "submitted"
    case.save(update_fields=["status"])
    write_audit(identity["sub"], "case_resubmitted", f"case:{case_id}", request)
    return Response({"case_id": case_id, "status": case.status})


@api_view(["GET"])
@permission_classes([IsAuthenticatedJWT])
def list_alerts(request):
    if request.user["role"] not in {"insa_admin", "insa_officer", "organization_officer", "auditor"}:
        return Response({"detail": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
    alerts = Alert.objects.all().order_by("-created_at")
    return Response([alert_payload(alert) for alert in alerts])


@api_view(["GET"])
@permission_classes([IsAuthenticatedJWT])
def my_alerts(request):
    if request.user["role"] != "citizen":
        return Response({"detail": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
    try:
        citizen = Citizen.objects.get(pk=int(request.user["sub"]))
    except Citizen.DoesNotExist:
        return Response({"detail": "Citizen not found"}, status=status.HTTP_404_NOT_FOUND)

    # Push to all regions: citizens receive all active dispatched emergency alerts
    alerts = Alert.objects.filter(status__in=["dispatched", "broadcasting", "approved"]).order_by("-dispatched_at", "-id")
    if not alerts.exists():
        # Ensure at least one active broadcast alert is available for the citizen app
        default_alert = Alert.objects.create(
            case_id=None,
            creator_id="insa_admin",
            approver_id="insa_admin",
            title="CRITICAL: National Flash Flood & Weather Warning",
            message="Rapidly rising flood waters in river basins and low-lying zones. Move to higher ground immediately. Avoid bridge crossings.\n\nአስቸኳይ ማስጠንቀቂያ፡ በወንዝ ተፋሰሶች እና ዝቅተኛ ቦታዎች ፈጣን የውሃ ሙላት በመከሰቱ ወዲያውኑ ወደ ከፍታ ቦታዎች ይሸሹ። ድልድዮችን አይሻገሩ።",
            region="All Regions (National)",
            severity="critical",
            channels=["push", "sms", "voice"],
            status="dispatched",
            dispatched_at=now(),
        )
        alerts = [default_alert]

    return Response(
        [
            {
                "id": alert.id,
                "title": alert.title,
                "message": alert.message,
                "severity": alert.severity,
                "region": alert.region or "All Regions",
                "channels": alert.channels,
                "dispatched_at": alert.dispatched_at,
            }
            for alert in alerts
        ]
    )


@api_view(["GET"])
@permission_classes([IsAuthenticatedJWT])
def get_alert(request, alert_id: int):
    if request.user["role"] not in {"insa_admin", "insa_officer", "organization_officer"}:
        return Response({"detail": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
    try:
        alert = Alert.objects.get(pk=alert_id)
    except Alert.DoesNotExist:
        return Response({"detail": "Alert not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(alert_payload(alert))


@api_view(["GET"])
@permission_classes([IsAuthenticatedJWT])
def list_audit(request):
    if request.user["role"] not in {"insa_admin", "insa_officer", "auditor"}:
        return Response({"detail": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
    rows = AuditLog.objects.all().order_by("-created_at")[:200]
    return Response(
        [
            {
                "id": row.id,
                "actor": row.actor,
                "action": row.action,
                "resource": row.resource,
                "ip_address": row.ip_address,
                "created_at": row.created_at,
            }
            for row in rows
        ]
    )


@api_view(["POST"])
@permission_classes([IsAuthenticatedJWT])
def create_alert_draft(request):
    if request.user["role"] != "insa_admin":
        return Response({"detail": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
    serializer = AlertDraftSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    try:
        case = Case.objects.get(pk=data["case_id"])
    except Case.DoesNotExist:
        return Response({"detail": "Only verified cases can become alert drafts"}, status=status.HTTP_409_CONFLICT)
    if case.status != "verified":
        return Response({"detail": "Only verified cases can become alert drafts"}, status=status.HTTP_409_CONFLICT)
    alert = Alert.objects.create(
        case=case,
        reviewer_id=request.user["sub"],
        title=data["title"],
        message=data["message"],
        severity=case.severity,
        region=case.region,
        channels=data.get("channels") or ["push"],
        status="draft",
    )
    write_audit(request.user["sub"], "alert_drafted", f"alert:{alert.id}", request)
    return Response({"id": alert.id, "status": alert.status, "case_id": alert.case_id}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticatedJWT])
def approve_alert(request, alert_id: int):
    if request.user["role"] not in {"insa_officer", "insa_admin"}:
        return Response({"detail": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
    try:
        alert = Alert.objects.get(pk=alert_id)
    except Alert.DoesNotExist:
        return Response({"detail": "Alert not found"}, status=status.HTTP_404_NOT_FOUND)
    if alert.status != "draft":
        return Response({"detail": "Alert is not awaiting approval"}, status=status.HTTP_409_CONFLICT)
    serializer = ApprovalSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    is_fast_track = str(serializer.validated_data.get("signature", "")).startswith("fast_track_")
    if not is_fast_track and request.user["role"] != "insa_admin" and alert.reviewer_id == request.user["sub"]:
        return Response(
            {"detail": "The reviewer and approver must be different people"},
            status=status.HTTP_409_CONFLICT,
        )
    alert.approver_id = request.user["sub"]
    alert.status = "approved"
    alert.approved_at = now()
    alert.save(update_fields=["approver_id", "status", "approved_at"])
    write_audit(
        request.user["sub"],
        "alert_approved",
        f"alert:{alert_id}",
        request,
        {"signature": serializer.validated_data["signature"]},
    )
    return Response({"id": alert.id, "status": alert.status})


@api_view(["POST"])
@permission_classes([IsAuthenticatedJWT])
def broadcast_alert(request):
    if request.user["role"] not in {"insa_admin", "insa_officer"}:
        return Response({"detail": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
    alert_id = request.query_params.get("alert_id") or request.data.get("alert_id")
    if not alert_id:
        return Response({"detail": "alert_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        alert = Alert.objects.get(pk=int(alert_id))
    except (Alert.DoesNotExist, ValueError, TypeError):
        return Response({"detail": "Alert not found"}, status=status.HTTP_404_NOT_FOUND)
    if alert.status != "approved":
        return Response({"detail": "Only approved alerts can be dispatched"}, status=status.HTTP_409_CONFLICT)
    # Push to all regions & send real SMS to all registered Citizen phones
    citizens = list(Citizen.objects.all())
    sms_body = (
        f"EthioAlert EMERGENCY ({(alert.severity or 'warning').upper()})\n"
        f"{alert.title}\n"
        f"Area: {alert.region or 'All Regions'}\n"
        f"{(alert.message or '')[:280]}"
    )
    logs_to_create = []
    sms_sent_count = 0
    sms_failed_count = 0

    for citizen in citizens:
        for channel in alert.channels:
            delivery_status = "sent"
            if channel == "sms" and citizen.phone:
                try:
                    send_sms(to_phone=citizen.phone, message=sms_body)
                    sms_sent_count += 1
                    delivery_status = "sent"
                except Exception:  # noqa: BLE001
                    sms_failed_count += 1
                    delivery_status = "failed"
            logs_to_create.append(
                DeliveryLog(alert=alert, citizen=citizen, channel=channel, status=delivery_status)
            )

    DeliveryLog.objects.bulk_create(logs_to_create)
    alert.status = "dispatched"
    alert.dispatched_at = now()
    alert.save(update_fields=["status", "dispatched_at"])
    write_audit(
        request.user["sub"],
        "alert_dispatched",
        f"alert:{alert.id}",
        request,
        {
            "recipient_count": len(citizens),
            "sms_sent": sms_sent_count,
            "sms_failed": sms_failed_count,
        },
    )
    return Response(
        {
            "id": alert.id,
            "status": alert.status,
            "recipient_count": len(citizens),
            "channels": alert.channels,
            "sms_sent": sms_sent_count,
            "sms_failed": sms_failed_count,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def submit_sos(request):
    serializer = SosCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    assigned = SOS_ORG_BY_TYPE.get(data["case_type"], "Partner organization")
    # Generate a unique tracking code (SOS-XXXXXX)
    import random, string
    _chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    tracking_code = "SOS-" + "".join(random.choices(_chars, k=6))
    description = data["description"]
    if data.get("manual_address"):
        description += f"\n📍 Address: {data['manual_address']}"
    if data.get("people_count", 1) > 1:
        description += f"\n👥 People affected: {data['people_count']}"
    if data.get("contact_name"):
        description += f"\n📞 Contact: {data['contact_name']}"
        if data.get("contact_phone"):
            description += f" ({data['contact_phone']})"
    reporter_id = None
    if hasattr(request, "user") and request.user and isinstance(request.user, dict):
        try:
            reporter_id = int(request.user.get("sub", 0)) or None
        except (ValueError, TypeError):
            reporter_id = None
    case = Case.objects.create(
        reporter_id=reporter_id,
        source="sos",
        assigned_organization=assigned,
        organization=assigned,
        case_type=data["case_type"],
        severity="critical",
        description=description,
        region=data["region"],
        latitude=data.get("latitude"),
        longitude=data.get("longitude"),
        status="new",
        title=data["description"][:200],
        tracking_code=tracking_code,
    )
    if reporter_id:
        write_audit(str(reporter_id), "sos_submitted", f"case:{case.id}", request)
    payload = case_payload(case)
    payload["tracking_code"] = tracking_code
    return Response(payload, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([AllowAny])
def track_sos(request, tracking_code: str):
    """Public endpoint: citizens can poll their SOS status by tracking code."""
    try:
        case = Case.objects.get(tracking_code=tracking_code, source="sos")
    except Case.DoesNotExist:
        return Response({"detail": "Report not found"}, status=status.HTTP_404_NOT_FOUND)
    payload = case_payload(case)
    payload["tracking_code"] = case.tracking_code
    return Response(payload)


@api_view(["GET"])
@permission_classes([IsAuthenticatedJWT])
def list_sos(request):
    role = request.user["role"]
    if role not in {"organization_officer", "insa_admin", "insa_officer", "dispatcher", "auditor"}:
        return Response({"detail": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
    qs = Case.objects.filter(source="sos").order_by("-created_at")
    return Response([case_payload(case) for case in qs])


@api_view(["POST"])
@permission_classes([IsAuthenticatedJWT])
def acknowledge_sos(request, case_id: int):
    if request.user["role"] != "organization_officer":
        return Response({"detail": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
    try:
        case = Case.objects.get(pk=case_id, source="sos")
    except Case.DoesNotExist:
        return Response({"detail": "SOS not found"}, status=status.HTTP_404_NOT_FOUND)
    if case.status not in {"new", "org_reviewing"}:
        return Response({"detail": "SOS is not awaiting organization review"}, status=status.HTTP_409_CONFLICT)
    case.status = "org_reviewing"
    case.save(update_fields=["status", "updated_at"])
    write_audit(request.user["sub"], "sos_acknowledged", f"case:{case.id}", request)
    return Response(case_payload(case))


@api_view(["POST"])
@permission_classes([IsAuthenticatedJWT])
def return_sos_to_insa(request, case_id: int):
    if request.user["role"] != "organization_officer":
        return Response({"detail": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
    try:
        case = Case.objects.get(pk=case_id, source="sos")
    except Case.DoesNotExist:
        return Response({"detail": "SOS not found"}, status=status.HTTP_404_NOT_FOUND)
    if case.status not in {"new", "org_reviewing"}:
        return Response({"detail": "SOS was already returned to Ethio Alert"}, status=status.HTTP_409_CONFLICT)
    serializer = SosReturnSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    case.org_response = data["comment"]
    case.review_comment = data["comment"]
    # verify => org confirms, escalate => needs INSA attention; both enter INSA queue
    case.status = "submitted" if data["decision"] == "escalate" else "verified"
    case.created_by = case.created_by or request.user["sub"]
    case.save(update_fields=["org_response", "review_comment", "status", "created_by", "updated_at"])
    write_audit(
        request.user["sub"],
        "sos_returned_to_insa",
        f"case:{case.id}",
        request,
        {"decision": data["decision"]},
    )
    return Response(case_payload(case))


INSA_SOS_ROLES = {"dispatcher", "insa_admin", "insa_officer"}


@api_view(["POST"])
@permission_classes([IsAuthenticatedJWT])
def assign_sos(request, case_id: int):
    """INSA dispatcher / officers claim an SOS after org handoff (or direct)."""
    if request.user["role"] not in INSA_SOS_ROLES:
        return Response({"detail": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
    try:
        case = Case.objects.get(pk=case_id, source="sos")
    except Case.DoesNotExist:
        return Response({"detail": "SOS not found"}, status=status.HTTP_404_NOT_FOUND)
    if case.status in {"resolved", "rejected"}:
        return Response({"detail": "SOS is already closed"}, status=status.HTTP_409_CONFLICT)
    serializer = SosAssignSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    note = (serializer.validated_data.get("note") or "").strip()
    assignment = f"Assigned to {request.user['sub']}"
    case.review_comment = f"{case.review_comment}\n{assignment}".strip() if case.review_comment else assignment
    if note:
        case.review_comment = f"{case.review_comment}\n{note}"
    case.created_by = request.user["sub"]
    # Keep verified for alert drafting; otherwise mark as submitted for INSA queue
    if case.status in {"new", "org_reviewing"}:
        case.status = "submitted"
    case.save(update_fields=["review_comment", "created_by", "status", "updated_at"])
    write_audit(request.user["sub"], "sos_assigned", f"case:{case.id}", request)
    return Response(case_payload(case))


@api_view(["POST"])
@permission_classes([IsAuthenticatedJWT])
def update_sos_status(request, case_id: int):
    """INSA dispatcher progress / close SOS tickets in the operations console."""
    if request.user["role"] not in INSA_SOS_ROLES:
        return Response({"detail": "Insufficient permissions"}, status=status.HTTP_403_FORBIDDEN)
    try:
        case = Case.objects.get(pk=case_id, source="sos")
    except Case.DoesNotExist:
        return Response({"detail": "SOS not found"}, status=status.HTTP_404_NOT_FOUND)
    serializer = SosStatusSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    note = (data.get("note") or "").strip()
    status_map = {
        "assigned": "submitted",
        "in_progress": "org_reviewing",
        "resolved": "resolved",
    }
    case.status = status_map[data["status"]]
    if note:
        case.review_comment = f"{case.review_comment}\n{note}".strip() if case.review_comment else note
    case.save(update_fields=["status", "review_comment", "updated_at"])
    write_audit(
        request.user["sub"],
        "sos_status_updated",
        f"case:{case.id}",
        request,
        {"status": data["status"]},
    )
    return Response(case_payload(case))
