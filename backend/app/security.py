import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt

from .env import load_local_env

load_local_env()

JWT_SECRET = os.getenv("JWT_SECRET", "development-only-change-this-secret")
ALGORITHM = "HS256"


def hash_fayda_reference(value: str) -> str:
    return hashlib.sha256(value.strip().encode()).hexdigest()


def make_token(subject: str, role: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=int(os.getenv("ACCESS_TOKEN_MINUTES", "30")))
    return jwt.encode({"sub": subject, "role": role, "exp": expires}, JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])


def new_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"
