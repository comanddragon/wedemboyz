"""Customer event inbox. Delivery uses the existing preference-aware outbox."""

from django.conf import settings
from django.db import transaction

from apps.notifications.models import Notification
from services.email import language_for


def notify(
    user, *, key, title, body, kind="SYSTEM", path="notifications", order=None, email=True, sms=True
):
    """Persist once per event, using the existing delivery outbox after commit.

    Copy is an (English, French) pair. Existing receipt/status email pipelines
    keep their templates, so callers can suppress duplicate notification email.
    """
    if getattr(settings, "SEED_DATA_ACTIVE", False):
        return None
    if kind == "PROMO":
        prefs = getattr(user, "notification_preference", None)
        if (
            not user.is_active
            or user.is_staff
            or user.is_guest
            or not getattr(getattr(user, "profile", None), "marketing_opt_in", False)
        ):
            return None
        if prefs is not None and not prefs.promo_opt_in:
            return None
    language = 1 if language_for(user) == "fr" else 0
    with transaction.atomic():
        # A unique event key makes worker retries and repeated event handlers safe.
        if Notification.objects.filter(event_key=key).exists():
            return None
        notification = Notification(
            user=user,
            event_key=key,
            notification_type=kind,
            title=title[language][:150],
            body=body[language],
            action_path=path,
            related_order=order,
        )
        notification._skip_email = not email
        notification._skip_sms = not sms
        # get_or_create cannot set transient flags before post_save runs.
        from django.db import IntegrityError

        try:
            with transaction.atomic():
                notification.save(force_insert=True)
        except IntegrityError:
            if Notification.objects.filter(event_key=key).exists():
                return None
            raise
        return notification
