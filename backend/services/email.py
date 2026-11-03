"""Rendered, localized transactional email and a durable, idempotent outbox."""

from django.conf import settings
from django.template.loader import render_to_string

from core.jobs import enqueue
from services.email_copy import COPY, LABELS


def language_for(user):
    profile = getattr(user, "profile", None)
    return "fr" if getattr(profile, "preferred_language", "en") == "fr" else "en"


def render_email(
    event, *, language="en", name="", details=None, body="", title="", path="dashboard"
):
    language = "fr" if language == "fr" else "en"
    heading, intro = COPY[event][language]
    labels = LABELS[language]
    labels = dict(labels)
    if event == "password_reset":
        labels["action_label"] = (
            "Réinitialiser mon mot de passe" if language == "fr" else "Reset my password"
        )
    context = {
        **labels,
        "language": language,
        "heading": title or heading,
        "intro": intro,
        "name": name,
        "body": body,
        "details": details or [],
        "site_url": settings.FRONTEND_URL.rstrip("/"),
        "action_url": f"{settings.FRONTEND_URL.rstrip('/')}/{language}/{path.lstrip('/')}",
        "settings_url": f"{settings.FRONTEND_URL.rstrip('/')}/{language}/settings",
        "support_email": settings.EMAIL_REPLY_TO[0] if settings.EMAIL_REPLY_TO else "",
    }
    return {
        "subject": title or heading,
        "html": render_to_string(f"emails/{event}.html", context),
        "text": render_to_string("emails/message.txt", context).strip(),
    }


def queue_email(
    user, event, *, key, details=None, body="", title="", path="dashboard", essential=False
):
    """Persist a frozen payload in the same transaction as its business event.

    The worker rechecks preferences and recipient address before delivery. Essential
    receipts bypass the general email switch; promotional mail always needs consent.
    """
    if (
        getattr(settings, "SEED_DATA_ACTIVE", False)
        or not user.email
        or user.email.lower().endswith(".invalid")
    ):
        return None
    from apps.notifications.tasks import deliver_email

    payload = render_email(
        event,
        language=language_for(user),
        name=user.get_full_name(),
        details=details,
        body=body,
        title=title,
        path=path,
    )
    payload["to"] = [user.email]
    return enqueue(
        deliver_email.name,
        args=[user.pk, event, payload, key, essential],
        max_attempts=deliver_email.max_attempts,
        idempotency_key=f"email/{key}",
    )


def send_payload(payload, *, key):
    """Use Django's configured transport; production uses the Resend API backend."""
    from django.core.mail import EmailMultiAlternatives

    message = EmailMultiAlternatives(
        subject=payload["subject"],
        body=payload["text"],
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=payload["to"],
        reply_to=settings.EMAIL_REPLY_TO or None,
        headers={"X-Entity-Ref-ID": key},
    )
    message.attach_alternative(payload["html"], "text/html")
    return message.send(fail_silently=False)
