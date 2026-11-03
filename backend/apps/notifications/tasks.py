from core.jobs import app
from core.utils import contact_phone


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_sms(self, notification_id: int):
    from apps.notifications.models import Notification
    from services import sms as sms_service

    try:
        notification = Notification.objects.select_related(
            "user", "user__notification_preference"
        ).get(pk=notification_id)

        prefs = getattr(notification.user, "notification_preference", None)
        if prefs is not None and not prefs.sms_enabled:
            return

        sms_service.send_sms(contact_phone(notification.user), notification.title)
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_email(self, notification_id: int):
    from apps.notifications.models import Notification
    from services.email import queue_email

    notification = Notification.objects.select_related("user", "user__profile").get(pk=notification_id)
    event = {"CHAT": "chat_message", "PROMO": "promotion"}.get(notification.notification_type, "notification")
    path = "chat" if event == "chat_message" else "notifications"
    if notification.related_order_id:
        path = f"orders/{notification.related_order_id}"
    queue_email(notification.user, event, key=f"notification/{notification.pk}",
                title=notification.title, body=notification.body, path=path)


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_whatsapp(self, notification_id: int):
    from apps.notifications.models import Notification
    from services import whatsapp as whatsapp_service

    try:
        notification = Notification.objects.select_related(
            "user", "user__notification_preference"
        ).get(pk=notification_id)

        prefs = getattr(notification.user, "notification_preference", None)
        if prefs is None or not prefs.whatsapp_enabled:
            return  # opt-in only — unlike SMS, default is off

        message = notification.body.strip() or notification.title
        whatsapp_service.send_whatsapp(contact_phone(notification.user), message)
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_push(self, notification_id: int):
    """Delivers to every active DeviceToken the user has registered (see
    apps/notifications/api/views/device_token.py for registration)."""
    from apps.notifications.models import Notification
    from services import push as push_service

    try:
        notification = Notification.objects.select_related(
            "user", "user__notification_preference"
        ).get(pk=notification_id)

        prefs = getattr(notification.user, "notification_preference", None)
        if prefs is not None and not prefs.push_enabled:
            return

        push_service.send_push(notification.user, notification.title, notification.body)
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=4, default_retry_delay=60)
def deliver_email(self, user_id, event, payload, key, essential=False):
    """Deliver an immutable outbox payload; failures reach the job runner."""
    from apps.users.models import CustomUser
    from services.email import send_payload

    user = CustomUser.objects.filter(pk=user_id, is_active=True).first()
    if user is None or user.email != payload["to"][0]:
        return
    prefs = getattr(user, "notification_preference", None)
    if not essential and prefs is not None and not prefs.email_enabled:
        return
    if event == "promotion":
        profile = getattr(user, "profile", None)
        if prefs is None or not prefs.promo_opt_in or not getattr(profile, "marketing_opt_in", False):
            return
    return send_payload(payload, key=key)
