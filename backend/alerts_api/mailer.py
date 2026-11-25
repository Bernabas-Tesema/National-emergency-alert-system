from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.template.loader import render_to_string


PLATFORM_NAME = "EthioAlert"


def mask_email(email: str) -> str:
    local, _, domain = (email or "").partition("@")
    if not local or not domain:
        return "***"
    if len(local) <= 2:
        visible = local[:1]
    else:
        visible = local[:2]
    return f"{visible}***@{domain}"


def _send_html_email(*, subject: str, to_email: str, text_body: str, html_body: str) -> None:
    def _build_message(connection=None) -> EmailMultiAlternatives:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to_email],
            connection=connection,
        )
        msg.attach_alternative(html_body, "text/html")
        return msg

    try:
        _build_message().send(fail_silently=False)
    except Exception:
        # Fallback between SSL (465) and STARTTLS (587) if the primary SMTP port drops
        if getattr(settings, "EMAIL_BACKEND", "").endswith("smtp.EmailBackend"):
            fallback_port = 587 if getattr(settings, "EMAIL_PORT", 465) == 465 else 465
            use_ssl = fallback_port == 465
            use_tls = fallback_port == 587
            conn = get_connection(
                host=settings.EMAIL_HOST,
                port=fallback_port,
                username=settings.EMAIL_HOST_USER,
                password=settings.EMAIL_HOST_PASSWORD,
                use_tls=use_tls,
                use_ssl=use_ssl,
                timeout=15,
            )
            _build_message(connection=conn).send(fail_silently=False)
        else:
            raise


def send_credentials_email(
    *,
    to_email: str,
    full_name: str,
    username: str,
    temporary_password: str,
    change_password_url: str,
) -> None:
    login_url = f"{settings.FRONTEND_URL}/login"
    subject = f"{PLATFORM_NAME} — your account credentials"
    context = {
        "subject": subject,
        "eyebrow": "Secure account setup",
        "full_name": full_name,
        "username": username,
        "temporary_password": temporary_password,
        "change_password_url": change_password_url,
        "login_url": login_url,
    }
    text_body = (
        f"Welcome to {PLATFORM_NAME}\n\n"
        f"Hello {full_name},\n\n"
        "An administrator created your EthioAlert console account.\n\n"
        f"Username: {username}\n"
        f"Temporary password: {temporary_password}\n\n"
        "Change your password here:\n"
        f"{change_password_url}\n\n"
        f"Or sign in at:\n{login_url}\n\n"
        f"— {PLATFORM_NAME} Operations\n"
    )
    html_body = render_to_string("alerts_api/email/credentials.html", context)
    _send_html_email(subject=subject, to_email=to_email, text_body=text_body, html_body=html_body)


def send_login_otp_email(
    *,
    to_email: str,
    full_name: str,
    username: str,
    otp: str,
    minutes: int,
) -> None:
    subject = f"{PLATFORM_NAME} — login verification code"
    context = {
        "subject": subject,
        "eyebrow": "Sign-in security",
        "full_name": full_name,
        "username": username,
        "otp": otp,
        "minutes": minutes,
    }
    text_body = (
        f"{PLATFORM_NAME} sign-in verification\n\n"
        f"Hello {full_name},\n\n"
        f"Someone is signing in as {username}.\n\n"
        f"Your verification code is: {otp}\n\n"
        f"This code expires in {minutes} minutes.\n"
        "If you did not try to sign in, ignore this email.\n\n"
        f"— {PLATFORM_NAME} Operations\n"
    )
    html_body = render_to_string("alerts_api/email/login_otp.html", context)
    _send_html_email(subject=subject, to_email=to_email, text_body=text_body, html_body=html_body)
