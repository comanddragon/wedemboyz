from django.conf import settings
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from core.tasks_utils import safe_delay

from .models import Order, PickupDeliverySchedule


@receiver(pre_save, sender=Order)
def stash_previous_status(sender, instance, **kwargs):
    """Grab the pre-save status so post_save can tell if it actually changed."""
    if instance.pk:
        try:
            instance._previous_status = Order.objects.only("status").get(pk=instance.pk).status
        except Order.DoesNotExist:
            instance._previous_status = None
    else:
        instance._previous_status = None


@receiver(post_save, sender=Order)
def on_order_status_changed(sender, instance, created, **kwargs):
    from core.constants import OrderStatus

    from .models import OrderStatusHistory
    from .tasks import award_loyalty_points_for_delivered_order

    previous_status = getattr(instance, "_previous_status", None)

    if created:
        if not instance.ticket_number:
            Order.objects.filter(pk=instance.pk).update(ticket_number=f"WDL-{instance.pk:06d}")
        OrderStatusHistory.objects.create(order=instance, status=instance.status)
        from services.order_payments import recompute_payment_status

        recompute_payment_status(instance, reason="Order created")
        return

    if previous_status is not None and previous_status != instance.status:
        history = OrderStatusHistory.objects.create(order=instance, status=instance.status)
        if getattr(settings, "SEED_DATA_ACTIVE", False):
            return
        from services.email_events import order_email

        order_email(instance, key=f"order/{instance.pk}/status/{history.pk}")

        if instance.status == OrderStatus.DELIVERED:
            safe_delay(award_loyalty_points_for_delivered_order, instance.pk)


@receiver(pre_save, sender=PickupDeliverySchedule)
def stash_schedule_email_state(sender, instance, raw=False, **kwargs):
    if raw:
        return
    fields = (
        "pickup_date",
        "pickup_time_slot",
        "delivery_date",
        "delivery_time_slot",
        "pickup_status",
        "delivery_status",
    )
    instance._email_previous = (
        sender.objects.filter(pk=instance.pk).values(*fields).first() if instance.pk else None
    )


@receiver(post_save, sender=PickupDeliverySchedule)
def on_schedule_email(sender, instance, created, raw=False, **kwargs):
    if raw or getattr(settings, "SEED_DATA_ACTIVE", False):
        return
    from uuid import uuid4

    from services.email import language_for, queue_email

    previous = getattr(instance, "_email_previous", None)
    if (
        not created
        and previous
        and all(str(previous[field]) == str(getattr(instance, field)) for field in previous)
    ):
        return
    fr = language_for(instance.order.user) == "fr"
    queue_email(
        instance.order.user,
        "order_scheduled",
        key=f"schedule/{instance.pk}/{uuid4().hex}",
        details=[
            ("Commande" if fr else "Order", instance.order.ticket_number),
            (
                "Collecte" if fr else "Collection",
                f"{instance.pickup_date} · {instance.get_pickup_time_slot_display()}",
            ),
            (
                "Livraison" if fr else "Delivery",
                f"{instance.delivery_date} · {instance.get_delivery_time_slot_display()}",
            ),
            (
                "Statut de collecte" if fr else "Collection status",
                instance.get_pickup_status_display(),
            ),
            (
                "Statut de livraison" if fr else "Delivery status",
                instance.get_delivery_status_display(),
            ),
        ],
        path=f"orders/{instance.order_id}",
    )
