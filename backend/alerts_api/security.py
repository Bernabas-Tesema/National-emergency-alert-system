import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings


def hash_fayda_reference(value: str) -> str:
    return hashlib.sha256(value.strip().encode()).hexdigest()


def make_token(subject: str, role: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_MINUTES)
    return jwt.encode(
        {"sub": subject, "role": role, "exp": expires},
        settings.JWT_SECRET,
        algorithm="HS256",
    )


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])


def new_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"
