from rest_framework import serializers

CASE_TYPES = {"accident", "fire", "missing_person", "health", "flood", "other"}
SEVERITIES = {"information", "warning", "critical"}
CHANNELS = {"push", "sms", "voice"}
REVIEW_DECISIONS = {"verify", "reject", "clarification"}


class PhoneVerifySerializer(serializers.Serializer):
    phone = serializers.CharField(min_length=7, max_length=32)


class PhoneConfirmSerializer(serializers.Serializer):
    phone = serializers.CharField()
    otp = serializers.CharField(min_length=6, max_length=6)
    device_token = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    language = serializers.CharField(required=False, default="en")


class StaffLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()


class StaffOtpVerifySerializer(serializers.Serializer):
    challenge_id = serializers.CharField(min_length=8, max_length=128)
    code = serializers.CharField(min_length=6, max_length=6)


class CreateStaffSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=160)
    username = serializers.RegexField(regex=r"^[A-Za-z0-9._-]{3,30}$")
    email = serializers.EmailField()
    phone = serializers.CharField(required=False, allow_blank=True, max_length=32, default="")
    role = serializers.CharField(max_length=64)
    organization = serializers.CharField(required=False, allow_blank=True, max_length=160, default="")


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=False, allow_blank=True, default="")
    new_password = serializers.CharField(min_length=8, max_length=128)
    token = serializers.CharField(required=False, allow_blank=True, default="")


class CaseCreateSerializer(serializers.Serializer):
    case_type = serializers.ChoiceField(choices=sorted(CASE_TYPES))
    severity = serializers.ChoiceField(choices=sorted(SEVERITIES), default="warning")
    description = serializers.CharField(min_length=5, max_length=5000)
    region = serializers.CharField(min_length=1, max_length=128)
    latitude = serializers.FloatField(required=False, allow_null=True, min_value=-90, max_value=90)
    longitude = serializers.FloatField(required=False, allow_null=True, min_value=-180, max_value=180)
    organization = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=160)
    title = serializers.CharField(required=False, allow_blank=True, max_length=200, default="")


class ReviewSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=sorted(REVIEW_DECISIONS))
    comment = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=2000)


class AlertDraftSerializer(serializers.Serializer):
    case_id = serializers.IntegerField()
    title = serializers.CharField(min_length=3, max_length=200)
    message = serializers.CharField(min_length=5, max_length=10000)
    channels = serializers.ListField(
        child=serializers.ChoiceField(choices=sorted(CHANNELS)),
        required=False,
        default=["push"],
    )


class ApprovalSerializer(serializers.Serializer):
    signature = serializers.CharField(min_length=8, max_length=512)


class SosCreateSerializer(serializers.Serializer):
    case_type = serializers.ChoiceField(choices=sorted(CASE_TYPES))
    description = serializers.CharField(min_length=5, max_length=5000)
    region = serializers.CharField(min_length=1, max_length=128)
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)


class SosReturnSerializer(serializers.Serializer):
    comment = serializers.CharField(min_length=3, max_length=2000)
    decision = serializers.ChoiceField(choices=["verify", "escalate"], default="escalate")


class SosAssignSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, max_length=2000, default="")


class SosStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["assigned", "in_progress", "resolved"])
    note = serializers.CharField(required=False, allow_blank=True, max_length=2000, default="")


def case_payload(case) -> dict:
    return {
        "id": case.id,
        "status": case.status,
        "case_type": case.case_type,
        "severity": case.severity,
        "region": case.region,
        "created_at": case.created_at,
        "updated_at": getattr(case, "updated_at", case.created_at),
        "title": case.title or "",
        "description": case.description or "",
        "organization": case.organization,
        "assigned_organization": getattr(case, "assigned_organization", None),
        "source": getattr(case, "source", "org"),
        "latitude": case.latitude,
        "longitude": case.longitude,
        "review_comment": case.review_comment,
        "org_response": getattr(case, "org_response", None),
        "created_by": case.created_by,
    }
