from django.conf import settings
from django.core.management.base import BaseCommand

from alerts_api.models import StaffAccount
from alerts_api.passwords import generate_token, hash_password

DEMO_STAFF = [
    ("sysadmin1", "SUPER_ADMIN", "INSA Super Admin", "INSA"),
    ("admin1", "ADMINISTRATOR", "INSA Administrator", "INSA"),
    ("officer1", "HIGHER_OFFICER", "INSA Higher Officer", "INSA"),
    ("dispatcher1", "DISPATCHER", "INSA Dispatcher", "INSA"),
    ("auditor1", "AUDITOR", "INSA Auditor", "INSA"),
    ("orgadmin1", "ORG_ADMIN", "Org Administrator", "Fire & Emergency Authority"),
    ("provider1", "ORG_OFFICER", "Org Officer", "Fire & Emergency Authority"),
]


class Command(BaseCommand):
    help = "Seed demo staff accounts for every web role (password: change-me, no forced reset)."

    def handle(self, *args, **options):
        password_hash = hash_password("change-me")
        otp_email = (
            (getattr(settings, "STAFF_FALLBACK_OTP_EMAIL", "") or "").strip()
            or (getattr(settings, "DEFAULT_FROM_EMAIL", "") or "").strip()
            or "demo@ethioalert.local"
        )
        created = 0
        updated = 0
        for username, role, full_name, organization in DEMO_STAFF:
            account, was_created = StaffAccount.objects.update_or_create(
                username=username,
                defaults={
                    "email": otp_email,
                    "full_name": full_name,
                    "phone": "+251911000000",
                    "role": role,
                    "organization": organization,
                    "password_hash": password_hash,
                    "must_change_password": False,
                    "password_change_token": generate_token(),
                    "is_active": True,
                },
            )
            created += int(was_created)
            updated += int(not was_created)
            self.stdout.write(f"{'Created' if was_created else 'Updated'} {username} ({role}) -> {otp_email}")
        self.stdout.write(
            self.style.SUCCESS(
                f"Done. created={created} updated={updated}. Password for all: change-me. OTP email: {otp_email}"
            )
        )
