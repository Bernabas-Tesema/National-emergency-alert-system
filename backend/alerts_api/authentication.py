import jwt
from rest_framework import authentication, exceptions

from .security import decode_token


class JWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        header = authentication.get_authorization_header(request).decode("utf-8")
        if not header:
            return None
        parts = header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return None
        try:
            claims = decode_token(parts[1])
        except jwt.PyJWTError as exc:
            raise exceptions.AuthenticationFailed("Invalid or expired token") from exc
        return (claims, parts[1])
