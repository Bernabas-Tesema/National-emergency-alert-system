"""Map frontend role identifiers to JWT API roles used by the API."""

ROLE_TO_JWT = {
    "ADMINISTRATOR": "insa_admin",
    "system_admin": "insa_admin",
    "SUPER_ADMIN": "insa_admin",   # legacy alias kept for old tokens
    "HIGHER_OFFICER": "insa_officer",
    "higher_officer": "insa_officer",
    "DISPATCHER": "dispatcher",
    "dispatcher": "dispatcher",
    "AUDITOR": "auditor",
    "auditor": "auditor",
    "ORG_ADMIN": "organization_officer",
    "org_admin": "organization_officer",
    "ORG_OFFICER": "organization_officer",
    "provider": "organization_officer",
    "organization_officer": "organization_officer",
    "insa_admin": "insa_admin",
    "insa_officer": "insa_officer",
}

# Canonical roles stored on StaffAccount / returned to the web console.
CANONICAL_STAFF_ROLES = {
    "ADMINISTRATOR",
    "HIGHER_OFFICER",
    "DISPATCHER",
    "AUDITOR",
    "ORG_ADMIN",
    "ORG_OFFICER",
}

ROLE_ALIASES = {
    "system_admin": "ADMINISTRATOR",
    "SUPER_ADMIN": "ADMINISTRATOR",   # legacy
    "ADMINISTRATOR": "ADMINISTRATOR",
    "admin": "ADMINISTRATOR",
    "insa_admin": "ADMINISTRATOR",
    "higher_officer": "HIGHER_OFFICER",
    "HIGHER_OFFICER": "HIGHER_OFFICER",
    "insa_officer": "HIGHER_OFFICER",
    "dispatcher": "DISPATCHER",
    "DISPATCHER": "DISPATCHER",
    "auditor": "AUDITOR",
    "AUDITOR": "AUDITOR",
    "org_admin": "ORG_ADMIN",
    "ORG_ADMIN": "ORG_ADMIN",
    "provider": "ORG_OFFICER",
    "ORG_OFFICER": "ORG_OFFICER",
    "organization_officer": "ORG_OFFICER",
}


def to_jwt_role(role: str) -> str:
    return ROLE_TO_JWT.get(role, role)


def normalize_staff_role(role: str) -> str | None:
    cleaned = (role or "").strip()
    if not cleaned:
        return None
    if cleaned in CANONICAL_STAFF_ROLES:
        return cleaned
    return ROLE_ALIASES.get(cleaned) or ROLE_ALIASES.get(cleaned.upper())
