from django.conf import settings
from django.contrib import admin, messages
from unfold.admin import ModelAdmin

from .ai_client import AiServiceError, call_ai
from .mailer import send_credentials_email
from .models import Alert, AuditLog, Case, Citizen, DeliveryLog, StaffAccount
from .passwords import generate_temporary_password, generate_token, hash_password


def _case_ai_payload(case: Case) -> dict:
    return {
        "case_id": str(case.id),
        "category": case.case_type or "other",
        "suggested_severity": {
            "information": "low",
            "warning": "medium",
            "critical": "critical",
        }.get((case.severity or "").lower(), "medium"),
        "description": (case.description or case.title or "No description")[:4000],
        "region": case.region or "",
    }


@admin.register(StaffAccount)
class StaffAccountAdmin(ModelAdmin):
    list_display = (
        "username",
        "full_name",
        "email",
        "role",
        "organization",
        "must_change_password",
        "is_active",
        "created_at",
    )
    search_fields = ("username", "full_name", "email", "organization")
    list_filter = ("role", "must_change_password", "is_active")
    readonly_fields = ("password_hash", "password_change_token", "created_at", "updated_at", "last_login_at")
    fields = (
        "username",
        "email",
        "full_name",
        "phone",
        "role",
        "organization",
        "is_active",
        "must_change_password",
        "password_hash",
        "password_change_token",
        "last_login_at",
        "created_at",
        "updated_at",
    )

    def save_model(self, request, obj, form, change):
        sending_credentials = False
        temporary_password = ""
        if not change or not obj.password_hash:
            temporary_password = generate_temporary_password()
            obj.password_hash = hash_password(temporary_password)
            obj.password_change_token = generate_token()
            obj.must_change_password = True
            sending_credentials = True
        elif "_resend_credentials" in request.POST:
            temporary_password = generate_temporary_password()
            obj.password_hash = hash_password(temporary_password)
            obj.password_change_token = generate_token()
            obj.must_change_password = True
            sending_credentials = True

        super().save_model(request, obj, form, change)

        if sending_credentials and temporary_password:
            change_url = f"{settings.FRONTEND_URL}/change-password?token={obj.password_change_token}"
            try:
                send_credentials_email(
                    to_email=obj.email,
                    full_name=obj.full_name,
                    username=obj.username,
                    temporary_password=temporary_password,
                    change_password_url=change_url,
                )
                self.message_user(
                    request,
                    f"Styled credentials email sent to {obj.email}.",
                    level=messages.SUCCESS,
                )
            except Exception as exc:  # noqa: BLE001
                self.message_user(
                    request,
                    f"Account saved but email failed: {exc}",
                    level=messages.ERROR,
                )


@admin.register(Citizen)
class CitizenAdmin(ModelAdmin):
    list_display = ("id", "phone", "registered_region", "language", "created_at")
    search_fields = ("phone", "registered_region")
    list_filter = ("registered_region", "language")


@admin.register(Case)
class CaseAdmin(ModelAdmin):
    list_display = (
        "id",
        "title",
        "source",
        "case_type",
        "severity",
        "status",
        "region",
        "organization",
        "assigned_organization",
        "created_by",
        "created_at",
    )
    search_fields = ("title", "description", "region", "created_by", "organization")
    list_filter = ("source", "status", "case_type", "severity", "region")
    readonly_fields = ("created_at", "updated_at")
    actions = ("ai_triage_selected", "ai_draft_selected")

    @admin.action(description="EthioAlert AI: triage selected cases")
    def ai_triage_selected(self, request, queryset):
        ok = 0
        for case in queryset[:20]:
            try:
                result = call_ai("/ai/triage", _case_ai_payload(case))
                data = result.get("data") or {}
                self.message_user(
                    request,
                    (
                        f"Case #{case.id}: {data.get('category')}/{data.get('severity')} — "
                        f"{data.get('summary')}"
                    ),
                    level=messages.INFO,
                )
                ok += 1
            except AiServiceError as exc:
                self.message_user(request, f"Case #{case.id}: {exc}", level=messages.ERROR)
        if ok:
            self.message_user(request, f"AI triage completed for {ok} case(s).", level=messages.SUCCESS)

    @admin.action(description="EthioAlert AI: draft public alert text")
    def ai_draft_selected(self, request, queryset):
        ok = 0
        for case in queryset[:10]:
            try:
                result = call_ai("/ai/draft", _case_ai_payload(case))
                data = result.get("data") or {}
                self.message_user(
                    request,
                    f"Case #{case.id} EN: {data.get('en')}",
                    level=messages.SUCCESS,
                )
                self.message_user(
                    request,
                    f"Case #{case.id} AM: {data.get('am')}",
                    level=messages.SUCCESS,
                )
                ok += 1
            except AiServiceError as exc:
                self.message_user(request, f"Case #{case.id}: {exc}", level=messages.ERROR)
        if ok:
            self.message_user(request, f"AI drafts ready for {ok} case(s).", level=messages.SUCCESS)


@admin.register(Alert)
class AlertAdmin(ModelAdmin):
    list_display = ("id", "title", "severity", "region", "status", "case_id", "created_at", "dispatched_at")
    search_fields = ("title", "message", "region")
    list_filter = ("status", "severity", "region")


@admin.register(DeliveryLog)
class DeliveryLogAdmin(ModelAdmin):
    list_display = ("id", "alert_id", "citizen_id", "channel", "status", "created_at")
    list_filter = ("channel", "status")


@admin.register(AuditLog)
class AuditLogAdmin(ModelAdmin):
    list_display = ("id", "actor", "action", "resource", "ip_address", "created_at")
    search_fields = ("actor", "action", "resource")
    list_filter = ("action",)
