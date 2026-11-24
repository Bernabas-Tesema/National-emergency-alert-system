"""Proxy authenticated console/app requests to the EthioAlert AI service."""

from __future__ import annotations

import httpx
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .permissions import IsAuthenticatedJWT

ROLE_FOR_JWT = {
    "insa_admin": "ADMINISTRATOR",
    "insa_officer": "HIGHER_OFFICER",
    "dispatcher": "DISPATCHER",
    "auditor": "AUDITOR",
    "organization_officer": "ORG_OFFICER",
    "super_admin": "SUPER_ADMIN",
    "org_admin": "ORG_ADMIN",
}

STAFF_AI_ROLES = {
    "SUPER_ADMIN",
    "ADMINISTRATOR",
    "HIGHER_OFFICER",
    "DISPATCHER",
    "AUDITOR",
    "ORG_ADMIN",
    "ORG_OFFICER",
}


def _ai_headers() -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "X-Service-Key": settings.AI_SERVICE_KEY,
    }


def _role_from_user(user: dict) -> str:
    jwt_role = (user.get("role") or "").strip().lower()
    if jwt_role == "citizen":
        return "CITIZEN"
    mapped = ROLE_FOR_JWT.get(jwt_role)
    if mapped:
        return mapped
    return str(jwt_role).upper().replace("-", "_")


def _is_citizen(request) -> bool:
    return _role_from_user(request.user) == "CITIZEN" or (request.user.get("role") or "").lower() == "citizen"


def _require_staff_ai(request) -> Response | None:
    """Operational AI tools (triage/draft/summary/rank) are staff-only."""
    if _is_citizen(request):
        return Response(
            {"detail": "This AI tool is for staff consoles only. Citizens can use EAi assist for emergency guidance."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return None


def _forward(path: str, payload: dict) -> Response:
    base = settings.AI_SERVICE_URL.rstrip("/")
    try:
        with httpx.Client(timeout=25.0) as client:
            reply = client.post(f"{base}{path}", json=payload, headers=_ai_headers())
    except httpx.HTTPError as exc:
        return Response(
            {"detail": f"AI service unreachable: {exc.__class__.__name__}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    try:
        data = reply.json()
    except Exception:  # noqa: BLE001
        data = {"detail": reply.text[:500]}
    return Response(data, status=reply.status_code)


@api_view(["POST"])
@permission_classes([IsAuthenticatedJWT])
def ai_assist(request):
    message = (request.data.get("message") or "").strip()
    if len(message) < 2:
        return Response({"detail": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)

    # Citizens always get the citizen safety assistant — never staff tools/persona.
    if _is_citizen(request):
        context = request.data.get("context") or "EthioAlert citizen mobile app (EAi)"
        return _forward(
            "/ai/assist",
            {
                "role": "CITIZEN",
                "message": message[:2000],
                "context": str(context)[:4000],
            },
        )

    role = (request.data.get("role") or _role_from_user(request.user)).strip().upper().replace("-", "_")
    aliases = {
        "SYSTEM_ADMIN": "SUPER_ADMIN",
        "PROVIDER": "ORG_OFFICER",
        "ADMIN": "ADMINISTRATOR",
    }
    role = aliases.get(role, role)
    if role not in STAFF_AI_ROLES:
        role = _role_from_user(request.user)
        if role not in STAFF_AI_ROLES:
            return Response(
                {"detail": "EthioAlert AI assist is available to staff and citizens only with a valid session."},
                status=status.HTTP_403_FORBIDDEN,
            )
    context = request.data.get("context") or ""
    return _forward(
        "/ai/assist",
        {"role": role, "message": message[:2000], "context": str(context)[:4000] or None},
    )


@api_view(["POST"])
@permission_classes([IsAuthenticatedJWT])
def ai_triage(request):
    blocked = _require_staff_ai(request)
    if blocked:
        return blocked
    return _forward("/ai/triage", dict(request.data))


@api_view(["POST"])
@permission_classes([IsAuthenticatedJWT])
def ai_draft(request):
    blocked = _require_staff_ai(request)
    if blocked:
        return blocked
    return _forward("/ai/draft", dict(request.data))


@api_view(["POST"])
@permission_classes([IsAuthenticatedJWT])
def ai_summary(request):
    blocked = _require_staff_ai(request)
    if blocked:
        return blocked
    return _forward("/ai/summary", dict(request.data))


@api_view(["POST"])
@permission_classes([IsAuthenticatedJWT])
def ai_rank(request):
    blocked = _require_staff_ai(request)
    if blocked:
        return blocked
    return _forward("/ai/rank", dict(request.data))
