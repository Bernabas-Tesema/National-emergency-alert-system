import secrets

from django.contrib.auth.hashers import check_password, make_password


def hash_password(raw: str) -> str:
    return make_password(raw)


def verify_password(raw: str, encoded: str) -> bool:
    return check_password(raw, encoded)


def generate_temporary_password(length: int = 12) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def generate_token() -> str:
    return secrets.token_urlsafe(32)
