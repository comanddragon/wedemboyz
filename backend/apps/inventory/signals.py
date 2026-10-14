from django.db.models import F
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import InventoryItem, InventoryTransaction


@receiver(post_save, sender=InventoryTransaction)
def on_inventory_transaction_created(sender, instance, created, **kwargs):
    """Apply the transaction to the item's running quantity, then alert
    staff (via the existing Notification/SMS pipeline) if that pushes the
    item at/below its low-stock threshold."""
    if not created:
        return

    InventoryItem.objects.filter(pk=instance.item_id).update(
        quantity=F("quantity") + instance.quantity_change
    )

    item = InventoryItem.objects.get(pk=instance.item_id)
    if item.is_low_stock:
        _notify_low_stock(item)


def _notify_low_stock(item):
    from django.contrib.auth import get_user_model

    from apps.notifications.models import Notification

    User = get_user_model()
    staff_users = User.objects.filter(is_staff=True, is_active=True)

    for staff_user in staff_users:
        # Avoid spamming the same low-stock alert repeatedly: skip if an
        # unread SYSTEM notification about this exact item already exists.
        already_alerted = Notification.objects.filter(
            user=staff_user,
            notification_type=Notification.NotificationType.SYSTEM,
            title=f"Low stock: {item.name}",
            is_read=False,
        ).exists()
        if already_alerted:
            continue

        Notification.objects.create(
            user=staff_user,
            notification_type=Notification.NotificationType.SYSTEM,
            title=f"Low stock: {item.name}",
            body=f"Only {item.quantity} {item.unit} left (threshold: {item.low_stock_threshold} {item.unit}).",
        )
