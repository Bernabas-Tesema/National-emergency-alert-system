from rest_framework.permissions import BasePermission


class IsAuthenticatedJWT(BasePermission):
    def has_permission(self, request, view) -> bool:
        return isinstance(request.user, dict) and "sub" in request.user and "role" in request.user


class HasRoles(BasePermission):
    allowed_roles: tuple[str, ...] = ()

    def has_permission(self, request, view) -> bool:
        if not isinstance(request.user, dict):
            return False
        roles = getattr(view, "allowed_roles", self.allowed_roles)
        return request.user.get("role") in roles
