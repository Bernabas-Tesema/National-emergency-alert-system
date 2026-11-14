from django.db import models

from .roles import CANONICAL_STAFF_ROLES

STAFF_ROLE_CHOICES = [(role, role) for role in sorted(CANONICAL_STAFF_ROLES)]


class StaffAccount(models.Model):
    """Web/API staff users created by admins (INSA + organization officers)."""

    username = models.CharField(max_length=64, unique=True, db_index=True)
    email = models.EmailField()
    full_name = models.CharField(max_length=160)
    phone = models.CharField(max_length=32, blank=True, default="")
    role = models.CharField(max_length=64, choices=STAFF_ROLE_CHOICES)
    organization = models.CharField(max_length=160, blank=True, default="")
    # Set by admin/API on create; must not be required on the add form.
    password_hash = models.CharField(max_length=256, blank=True, default="")
    must_change_password = models.BooleanField(default=True)
    password_change_token = models.CharField(max_length=128, blank=True, default="")
    is_active = models.BooleanField(default=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "staff_accounts"

    def __str__(self) -> str:
        return f"{self.username} ({self.role})"


class Citizen(models.Model):
    phone = models.CharField(max_length=32, unique=True, db_index=True)
    fayda_id_hash = models.CharField(max_length=128)
    registered_region = models.CharField(max_length=128, db_index=True)
    device_token = models.CharField(max_length=512, null=True, blank=True)
    language = models.CharField(max_length=8, default="en")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "citizens"


class Case(models.Model):
    reporter = models.ForeignKey(
        Citizen,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="cases",
        db_column="reporter_id",
    )
    organization = models.CharField(max_length=160, null=True, blank=True)
    # org = partner-submitted incident; sos = citizen distress routed to organizations
    source = models.CharField(max_length=16, default="org", db_index=True)
    assigned_organization = models.CharField(max_length=160, null=True, blank=True)
    case_type = models.CharField(max_length=64)
    severity = models.CharField(max_length=16, default="warning")
    description = models.TextField()
    region = models.CharField(max_length=128, db_index=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    title = models.CharField(max_length=200, default="")
    created_by = models.CharField(max_length=128, null=True, blank=True)
    review_comment = models.TextField(null=True, blank=True)
    org_response = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=32, default="submitted")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "cases"


class Alert(models.Model):
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="alerts", db_column="case_id")
    reviewer_id = models.CharField(max_length=128, null=True, blank=True)
    approver_id = models.CharField(max_length=128, null=True, blank=True)
    title = models.CharField(max_length=200)
    message = models.TextField()
    severity = models.CharField(max_length=16)
    region = models.CharField(max_length=128, db_index=True)
    channels = models.JSONField(default=list)
    status = models.CharField(max_length=32, default="draft")
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    dispatched_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "alerts"


class DeliveryLog(models.Model):
    alert = models.ForeignKey(Alert, on_delete=models.CASCADE, related_name="delivery_logs", db_column="alert_id")
    citizen = models.ForeignKey(Citizen, on_delete=models.CASCADE, related_name="delivery_logs", db_column="citizen_id")
    channel = models.CharField(max_length=16)
    status = models.CharField(max_length=16, default="queued")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "delivery_logs"


class AuditLog(models.Model):
    actor = models.CharField(max_length=128)
    action = models.CharField(max_length=128)
    resource = models.CharField(max_length=128)
    ip_address = models.CharField(max_length=64, default="unknown")
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"
