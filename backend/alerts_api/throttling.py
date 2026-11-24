"""Throttles compatible with JWT payload dicts on request.user."""

from rest_framework.throttling import SimpleRateThrottle


def _jwt_identity(request) -> str | None:
    user = getattr(request, "user", None)
    if isinstance(user, dict):
        for key in ("sub", "username", "id", "user_id"):
            value = user.get(key)
            if value:
                return str(value)
        role = user.get("role")
        if role:
            return f"role:{role}"
        return "jwt-user"
    if user is not None and getattr(user, "is_authenticated", False):
        return str(getattr(user, "pk", None) or getattr(user, "id", None) or user)
    return None


class EthioAnonRateThrottle(SimpleRateThrottle):
    scope = "anon"

    def get_cache_key(self, request, view):
        if _jwt_identity(request):
            return None
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class EthioUserRateThrottle(SimpleRateThrottle):
    scope = "user"

    def get_cache_key(self, request, view):
        ident = _jwt_identity(request)
        if not ident:
            return None
        return self.cache_format % {"scope": self.scope, "ident": ident}
