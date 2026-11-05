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

        if not delivery_allowed(notification):
            return
        prefs = getattr(notification.user, "notification_preference", None)
        if prefs is not None and not prefs.sms_enabled:
            return

        sms_service.send_sms(
            contact_phone(notification.user), notification.body.strip() or notification.title
        )
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_email(self, notification_id: int):
    from apps.notifications.models import Notification
    from services.email import queue_email

    notification = Notification.objects.select_related("user", "user__profile").get(
        pk=notification_id
    )
    event = {"CHAT": "chat_message", "PROMO": "promotion"}.get(
        notification.notification_type, "notification"
    )
    path = notification.action_path or ("chat" if event == "chat_message" else "notifications")
    if notification.related_order_id:
        path = f"orders/{notification.related_order_id}"
    queue_email(
        notification.user,
        event,
        key=f"notification/{notification.pk}",
        title=notification.title,
        body=notification.body,
        path=path,
    )


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_whatsapp(self, notification_id: int):
    from apps.notifications.models import Notification
    from services import whatsapp as whatsapp_service

    try:
        notification = Notification.objects.select_related(
            "user", "user__notification_preference"
        ).get(pk=notification_id)

        if not delivery_allowed(notification):
            return
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

        if not delivery_allowed(notification):
            return
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
        if (prefs is not None and not prefs.promo_opt_in) or not getattr(
            profile, "marketing_opt_in", False
        ):
            return
    return send_payload(payload, key=key)


def delivery_allowed(notification):
    """Recheck audience consent at delivery time, including queued promotions."""
    user = notification.user
    if not user.is_active:
        return False
    if notification.notification_type != "PROMO":
        return True
    prefs = getattr(user, "notification_preference", None)
    return bool(
        not user.is_staff
        and not user.is_guest
        and getattr(getattr(user, "profile", None), "marketing_opt_in", False)
        and (prefs is None or prefs.promo_opt_in)
    )


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def announce_campaign(self, campaign_id):
    """Announce an available campaign once to each eligible, consenting customer.

    Scheduled jobs re-read the campaign so a cancelled/rescheduled offer cannot
    be announced with stale copy. Per-recipient keys make partial retries safe.
    """
    from datetime import timedelta

    from django.conf import settings
    from django.db.models import Exists, Max, OuterRef, Q
    from django.utils import timezone

    from apps.discounts.models import DiscountCampaign
    from apps.orders.models import Order
    from apps.users.models import CustomUser
    from services.notifications import notify

    if getattr(settings, "SEED_DATA_ACTIVE", False):
        return
    campaign = DiscountCampaign.objects.filter(pk=campaign_id, is_active=True).first()
    now = timezone.now()
    if campaign is None or not campaign.start_date <= now <= campaign.end_date:
        return
    users = CustomUser.objects.filter(
        is_active=True,
        is_staff=False,
        is_guest=False,
        profile__marketing_opt_in=True,
    ).filter(
        Q(notification_preference__isnull=True) | Q(notification_preference__promo_opt_in=True)
    )
    if campaign.target_segment == "NEW_CUSTOMERS":
        users = users.annotate(
            has_order=Exists(Order.objects.filter(user_id=OuterRef("pk")))
        ).filter(has_order=False)
    elif campaign.target_segment == "LAPSED":
        users = users.annotate(last_order=Max("orders__created_at")).filter(
            last_order__lte=now - timedelta(days=90)
        )
    elif campaign.target_segment == "LOYALTY_GOLD":
        users = users.filter(loyalty_account__tier="GOLD")
    discount = (
        f"{campaign.value:g}%"
        if campaign.discount_type == "PERCENTAGE"
        else f"{campaign.value:g} FCFA"
    )
    for user in users.select_related("profile", "notification_preference").iterator(chunk_size=250):
        notify(
            user,
            key=f"campaign/{campaign.pk}/user/{user.pk}",
            kind="PROMO",
            title=("New offer: " + campaign.name, "Nouvelle offre : " + campaign.name),
            body=(
                f"{discount} off · {campaign.description} · "
                f"Available until {campaign.end_date.date()}.",
                f"Réduction de {discount} · {campaign.description} · "
                f"Valable jusqu’au {campaign.end_date.date()}.",
            ),
            path="book",
        )
