from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from core.tasks_utils import safe_delay

from .models import Order


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
    from .tasks import award_loyalty_points_for_delivered_order, send_status_update

    previous_status = getattr(instance, "_previous_status", None)

    if created:
        OrderStatusHistory.objects.create(order=instance, status=instance.status)
        return

    if previous_status is not None and previous_status != instance.status:
        OrderStatusHistory.objects.create(order=instance, status=instance.status)
        safe_delay(send_status_update, instance.pk)

        if instance.status == OrderStatus.DELIVERED:
            safe_delay(award_loyalty_points_for_delivered_order, instance.pk)
