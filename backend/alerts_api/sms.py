import json
import urllib.error
import urllib.request

from django.conf import settings


def normalize_ethiopian_phone(phone: str) -> str:
    cleaned = "".join(ch for ch in (phone or "").strip() if ch.isdigit() or ch == "+")
    if not cleaned:
        return ""
    if cleaned.startswith("+"):
        return cleaned
    if cleaned.startswith("251"):
        return f"+{cleaned}"
    if cleaned.startswith("0") and len(cleaned) == 10:
        return f"+251{cleaned[1:]}"
    if len(cleaned) == 9 and cleaned[0] in {"9", "7"}:
        return f"+251{cleaned}"
    return cleaned


def mask_phone(phone: str) -> str:
    normalized = normalize_ethiopian_phone(phone)
    if len(normalized) < 6:
        return "***"
    return f"{normalized[:6]}***{normalized[-3:]}"


def _post_afromessage(*, api_key: str, url: str, body: dict) -> dict:
    payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "EthioAlert/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        err_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"AfroMessage HTTP {exc.code}: {err_body}") from exc


def send_sms(*, to_phone: str, message: str) -> dict:
    api_key = getattr(settings, "AFROMESSAGE_API_KEY", "") or ""
    sender = getattr(settings, "AFROMESSAGE_SENDER_NAME", "NEAS") or ""
    url = getattr(settings, "AFROMESSAGE_BASE_URL", "https://api.afromessage.com/api/send")

    if not api_key:
        raise RuntimeError("AFROMESSAGE_API_KEY is not configured.")

    recipient = normalize_ethiopian_phone(to_phone)
    if not recipient or len(recipient) < 10:
        raise ValueError(f"Invalid recipient phone number: {to_phone}")

    body: dict = {"to": recipient, "message": message}
    if sender:
        body["sender"] = sender

    data = _post_afromessage(api_key=api_key, url=url, body=body)
    if isinstance(data, dict) and data.get("acknowledge") == "error":
        err_text = str(data.get("response") or data)
        # If custom sender name (e.g. NEAS) is not approved yet on AfroMessage, fallback to default short code
        if sender and "sender id" in err_text.lower():
            data = _post_afromessage(api_key=api_key, url=url, body={"to": recipient, "message": message})
            if isinstance(data, dict) and data.get("acknowledge") == "error":
                raise RuntimeError(f"AfroMessage error: {data.get('response') or data}")
            return data
        raise RuntimeError(f"AfroMessage error: {err_text}")
    return data


def send_otp_sms(*, to_phone: str, otp: str, minutes: int = 5) -> dict:
    message = (
        "EthioAlert - National Emergency Alert System\n"
        f"Your one-time verification code is: {otp}\n"
        f"Valid for {minutes} minutes. Please do not share this code with anyone.\n"
        "Stay Informed. Stay Safe."
    )
    return send_sms(to_phone=to_phone, message=message)
