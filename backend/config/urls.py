from django.contrib import admin
from django.shortcuts import redirect
from django.urls import include, path
from django.views.generic import RedirectView

from alerts_api.admin_ai import ethio_ai_case_action, ethio_ai_console
from alerts_api.views import health


def root_to_admin_login(_request):
    """Opening the backend base URL goes straight to Jazzmin admin login."""
    return redirect("/admin/login/")


urlpatterns = [
    path("", root_to_admin_login, name="root"),
    # Browsers always request /favicon.ico; Jazzmin ships a PNG under static/.
    path(
        "favicon.ico",
        RedirectView.as_view(
            url="/static/vendor/adminlte/img/AdminLTELogo.png",
            permanent=False,
        ),
        name="favicon",
    ),
    path("admin/ethio-ai/", ethio_ai_console, name="admin_ethio_ai"),
    path(
        "admin/ethio-ai/case/<int:case_id>/<str:action>/",
        ethio_ai_case_action,
        name="admin_ai_case_action",
    ),
    path("admin/", admin.site.urls),
    path("health", health, name="health"),
    path("api/v1/", include("alerts_api.urls")),
]
