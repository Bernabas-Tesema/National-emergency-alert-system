from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import redirect, render
from django.urls import reverse
from django.views.decorators.http import require_http_methods

from .ai_client import AiServiceError, call_ai, health as ai_health
from .models import Case


def _case_payload(case: Case) -> dict:
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


def _open_case_items(limit: int = 12) -> list[dict]:
    qs = Case.objects.exclude(status__in=["rejected", "resolved"]).order_by("-created_at")[:limit]
    items = []
    for case in qs:
        items.append(
            {
                "id": str(case.id),
                "category": case.case_type or "other",
                "severity": {
                    "information": "low",
                    "warning": "medium",
                    "critical": "critical",
                }.get((case.severity or "").lower(), "medium"),
                "description": (case.title or case.description or "Case")[:500],
                "age_minutes": 30,
            }
        )
    return items


@staff_member_required
@require_http_methods(["GET", "POST"])
def ethio_ai_console(request):
    context = {
        "title": "EthioAlert AI",
        "assist_message": "",
        "assist_reply": "",
        "summary_text": "",
        "summary_points": [],
        "ranking": [],
        "open_cases": _open_case_items(),
        "health_ok": False,
        "health": {},
        "health_error": "",
    }
    try:
        context["health"] = ai_health()
        context["health_ok"] = True
    except AiServiceError as exc:
        context["health_error"] = str(exc)

    if request.method == "POST":
        action = request.POST.get("action") or ""
        try:
            if action == "assist":
                message = (request.POST.get("assist_message") or "").strip()
                context["assist_message"] = message
                if len(message) < 2:
                    messages.error(request, "Enter a question for EthioAlert AI.")
                else:
                    result = call_ai(
                        "/ai/assist",
                        {
                            "role": "ADMINISTRATOR",
                            "message": message,
                            "context": "Django Unfold admin EthioAlert AI console",
                        },
                    )
                    context["assist_reply"] = result.get("reply") or "No reply."
                    messages.success(request, f"Assist ready (source: {result.get('source', 'ai')}).")
            elif action == "summary":
                items = context["open_cases"]
                if not items:
                    messages.warning(request, "No open cases to summarize.")
                else:
                    result = call_ai("/ai/summary", {"set_id": "admin-console", "items": items})
                    data = result.get("data") or {}
                    context["summary_text"] = data.get("summary") or ""
                    context["summary_points"] = data.get("key_points") or []
                    messages.success(request, "Executive summary generated.")
            elif action == "rank":
                items = context["open_cases"]
                if not items:
                    messages.warning(request, "No open cases to rank.")
                else:
                    result = call_ai("/ai/rank", {"set_id": "admin-console", "items": items})
                    data = result.get("data") or {}
                    context["ranking"] = data.get("ranking") or []
                    messages.success(request, "Threat ranking generated.")
        except AiServiceError as exc:
            messages.error(request, str(exc))

    return render(request, "admin/alerts_api/ai_console.html", context)


@staff_member_required
@require_http_methods(["POST"])
def ethio_ai_case_action(request, case_id: int, action: str):
    try:
        case = Case.objects.get(pk=case_id)
    except Case.DoesNotExist:
        messages.error(request, "Case not found.")
        return redirect("admin:alerts_api_case_changelist")

    try:
        if action == "triage":
            result = call_ai("/ai/triage", _case_payload(case))
            data = result.get("data") or {}
            messages.info(
                request,
                (
                    f"AI triage · category={data.get('category')} · severity={data.get('severity')} · "
                    f"confidence={data.get('confidence')} · {data.get('summary')}"
                ),
            )
            reasons = data.get("reasons") or []
            if reasons:
                messages.info(request, "Reasons: " + "; ".join(reasons))
        elif action == "draft":
            result = call_ai("/ai/draft", _case_payload(case))
            data = result.get("data") or {}
            messages.success(request, f"AI draft (EN): {data.get('en')}")
            messages.success(request, f"AI draft (AM): {data.get('am')}")
            messages.info(request, f"SMS EN: {data.get('sms_en')}")
        else:
            messages.error(request, "Unknown AI action.")
    except AiServiceError as exc:
        messages.error(request, str(exc))

    return redirect(reverse("admin:alerts_api_case_change", args=[case.id]))
