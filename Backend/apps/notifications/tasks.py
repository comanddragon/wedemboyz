from config.celery import app


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

        sms_service.send_sms(notification.user.phone_number, notification.title)
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_email(self, notification_id: int):
    from django.core.mail import send_mail

    from apps.notifications.models import Notification

    try:
        notification = Notification.objects.select_related(
            "user", "user__notification_preference"
        ).get(pk=notification_id)

        prefs = getattr(notification.user, "notification_preference", None)
        if prefs is not None and not prefs.email_enabled:
            return
        if not notification.user.email:
            return

        send_mail(
            subject=notification.title,
            message=notification.body,
            from_email=None,
            recipient_list=[notification.user.email],
            fail_silently=True,
        )
    except Exception as exc:
        raise self.retry(exc=exc)


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
        whatsapp_service.send_whatsapp(notification.user.phone_number, message)
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
