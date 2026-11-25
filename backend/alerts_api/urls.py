from django.urls import path

from . import ai_proxy, views

urlpatterns = [
    path("auth/phone/verify", views.verify_phone),
    path("auth/phone/confirm", views.confirm_phone),
    path("auth/staff/login", views.staff_login),
    path("auth/staff/verify-otp", views.staff_verify_otp),
    path("auth/change-password", views.change_password),
    path("organizations/register", views.register_organization),
    path("staff", views.create_staff_account),
    path("ai/assist", ai_proxy.ai_assist),
    path("ai/triage", ai_proxy.ai_triage),
    path("ai/draft", ai_proxy.ai_draft),
    path("ai/summary", ai_proxy.ai_summary),
    path("ai/rank", ai_proxy.ai_rank),

    path("cases", views.cases_collection),
    path("cases/<int:case_id>", views.case_detail),
    path("cases/<int:case_id>/review", views.review_case),
    path("cases/<int:case_id>/resubmit", views.resubmit_case),
    path("alerts", views.list_alerts),
    path("alerts/mine", views.my_alerts),
    path("alerts/draft", views.create_alert_draft),
    path("alerts/broadcast", views.broadcast_alert),
    path("alerts/<int:alert_id>", views.get_alert),
    path("alerts/<int:alert_id>/approve", views.approve_alert),
    path("audit", views.list_audit),
    path("sos", views.list_sos),
    path("sos/submit", views.submit_sos),
    path("sos/track/<str:tracking_code>", views.track_sos),
    path("sos/<int:case_id>/acknowledge", views.acknowledge_sos),
    path("sos/<int:case_id>/return-to-insa", views.return_sos_to_insa),
    path("sos/<int:case_id>/assign", views.assign_sos),
    path("sos/<int:case_id>/status", views.update_sos_status),
]
