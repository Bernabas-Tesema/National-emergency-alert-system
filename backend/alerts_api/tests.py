from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from alerts_api.models import Case, Citizen, StaffAccount
from alerts_api.passwords import hash_password, verify_password
from alerts_api.security import hash_fayda_reference, make_token


class StaffAuthAndCasesTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()

    def test_health(self) -> None:
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    @override_settings(
        DEBUG=True,
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    )
    def test_staff_login_and_create_case(self) -> None:
        StaffAccount.objects.create(
            username="org_officer",
            email="org@example.com",
            full_name="Organization Officer",
            phone="+251911000010",
            role="ORG_OFFICER",
            organization="Fire Authority",
            password_hash=hash_password("change-me"),
            must_change_password=False,
            password_change_token="unused-token",
            is_active=True,
        )
        login = self.client.post(
            "/api/v1/auth/staff/login",
            {"username": "org_officer", "password": "change-me"},
            format="json",
        )
        self.assertEqual(login.status_code, 200)
        self.assertTrue(login.json()["otp_sent"])
        verified = self.client.post(
            "/api/v1/auth/staff/verify-otp",
            {"challenge_id": login.json()["challenge_id"], "code": login.json()["debug_otp"]},
            format="json",
        )
        self.assertEqual(verified.status_code, 200)
        token = verified.json()["access_token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        created = self.client.post(
            "/api/v1/cases",
            {
                "case_type": "fire",
                "severity": "warning",
                "description": "Warehouse fire near Bole.",
                "region": "Addis Ababa",
                "title": "Warehouse fire",
                "organization": "Fire Authority",
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["status"], "submitted")

        listed = self.client.get("/api/v1/cases")
        self.assertEqual(listed.status_code, 200)
        self.assertGreaterEqual(len(listed.json()), 1)

    def test_org_officer_can_return_sos_to_insa(self) -> None:
        citizen = Citizen.objects.create(
            phone="+251911000001",
            fayda_id_hash=hash_fayda_reference("+251911000001"),
            registered_region="Addis Ababa",
        )
        sos = Case.objects.create(
            reporter=citizen,
            source="sos",
            assigned_organization="Fire & Emergency Authority",
            case_type="fire",
            severity="critical",
            description="Citizen SOS fire report near Bole.",
            region="Addis Ababa",
            status="new",
            title="Citizen SOS fire",
        )
        token = make_token("org_officer", "organization_officer")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        listed = self.client.get("/api/v1/sos")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.json()), 1)

        ack = self.client.post(f"/api/v1/sos/{sos.id}/acknowledge")
        self.assertEqual(ack.status_code, 200)
        self.assertEqual(ack.json()["status"], "org_reviewing")

        returned = self.client.post(
            f"/api/v1/sos/{sos.id}/return-to-insa",
            {"comment": "Team checked the site. Escalate to INSA.", "decision": "escalate"},
            format="json",
        )
        self.assertEqual(returned.status_code, 200)
        self.assertEqual(returned.json()["status"], "submitted")
        self.assertIn("Escalate", returned.json()["org_response"])

        dispatcher = make_token("dispatcher1", "dispatcher")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {dispatcher}")
        assigned = self.client.post(
            f"/api/v1/sos/{sos.id}/assign",
            {"note": "Dispatcher claiming ticket"},
            format="json",
        )
        self.assertEqual(assigned.status_code, 200)
        self.assertEqual(assigned.json()["created_by"], "dispatcher1")

        progressed = self.client.post(
            f"/api/v1/sos/{sos.id}/status",
            {"status": "in_progress", "note": "Units en route"},
            format="json",
        )
        self.assertEqual(progressed.status_code, 200)
        self.assertEqual(progressed.json()["status"], "org_reviewing")

        auditor = make_token("auditor1", "auditor")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {auditor}")
        audit = self.client.get("/api/v1/audit")
        self.assertEqual(audit.status_code, 200)
        cases = self.client.get("/api/v1/cases")
        self.assertEqual(cases.status_code, 200)

    @override_settings(
        DEBUG=True,
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    )
    def test_create_staff_emails_credentials_and_forces_password_change(self) -> None:
        admin_token = make_token("insa_admin", "insa_admin")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")
        created = self.client.post(
            "/api/v1/staff",
            {
                "full_name": "Selam Org",
                "username": "selam.org",
                "email": "selam@example.com",
                "phone": "+251911000222",
                "role": "ORG_OFFICER",
                "organization": "Fire Authority",
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        self.assertTrue(created.json()["email_sent"])
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("EthioAlert", mail.outbox[0].subject)
        self.assertIn("change-password?token=", mail.outbox[0].body)

        account = StaffAccount.objects.get(username="selam.org")
        self.assertTrue(account.must_change_password)
        temp_password = created.json()["debug_temporary_password"]
        self.assertTrue(verify_password(temp_password, account.password_hash))

        login = self.client.post(
            "/api/v1/auth/staff/login",
            {"username": "selam.org", "password": temp_password},
            format="json",
        )
        self.assertEqual(login.status_code, 200)
        self.assertTrue(login.json()["otp_sent"])
        self.assertIn("challenge_id", login.json())
        self.assertEqual(len(mail.outbox), 2)
        self.assertIn("verification code", mail.outbox[1].subject.lower())
        otp = login.json()["debug_otp"]

        verified = self.client.post(
            "/api/v1/auth/staff/verify-otp",
            {"challenge_id": login.json()["challenge_id"], "code": otp},
            format="json",
        )
        self.assertEqual(verified.status_code, 200)
        self.assertTrue(verified.json()["must_change_password"])
        self.assertIn("access_token", verified.json())

        token = account.password_change_token
        changed = self.client.post(
            "/api/v1/auth/change-password",
            {"token": token, "new_password": "NewSecurePass1!"},
            format="json",
        )
        self.assertEqual(changed.status_code, 200)
        account.refresh_from_db()
        self.assertFalse(account.must_change_password)
        self.assertTrue(verify_password("NewSecurePass1!", account.password_hash))

    @override_settings(
        DEBUG=True,
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    )
    def test_admin_can_create_every_canonical_role(self) -> None:
        admin_token = make_token("insa_admin", "insa_admin")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")
        roles = [
            "SUPER_ADMIN",
            "ADMINISTRATOR",
            "HIGHER_OFFICER",
            "DISPATCHER",
            "AUDITOR",
            "ORG_ADMIN",
            "ORG_OFFICER",
        ]
        for index, role in enumerate(roles):
            created = self.client.post(
                "/api/v1/staff",
                {
                    "full_name": f"Role Person {role}",
                    "username": f"role.user.{index}",
                    "email": f"role{index}@example.com",
                    "phone": f"+2519110003{index:02d}",
                    "role": role,
                    "organization": "INSA" if role not in {"ORG_ADMIN", "ORG_OFFICER"} else "Fire Authority",
                },
                format="json",
            )
            self.assertEqual(created.status_code, 201, created.content)
            self.assertEqual(created.json()["role"], role)
