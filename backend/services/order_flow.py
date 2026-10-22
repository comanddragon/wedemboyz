from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from core.constants import OrderStatus
from services.order_payments import recompute_payment_status


ALLOWED_TRANSITIONS = {
    OrderStatus.PENDING: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
    OrderStatus.CONFIRMED: {OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED},
    OrderStatus.IN_PROGRESS: {OrderStatus.READY},
    OrderStatus.READY: {OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED},
    OrderStatus.OUT_FOR_DELIVERY: {OrderStatus.DELIVERED},
    OrderStatus.DELIVERED: set(),
    OrderStatus.CANCELLED: set(),
}


def validate_transition(current_status, new_status):
    if new_status not in ALLOWED_TRANSITIONS.get(current_status, set()):
        raise ValidationError(
            {"status": f"Cannot move an order from {current_status} to {new_status}."}
        )


@transaction.atomic
def cancel_order(order, *, changed_by=None, reason=""):
    order = type(order).objects.select_for_update().get(pk=order.pk)
    validate_transition(order.status, OrderStatus.CANCELLED)

    if order.subscription_id:
        used_kg = sum(item.weight_kg * item.quantity for item in order.items.all())
        subscription = order.subscription
        subscription.kg_remaining += used_kg
        subscription.save(update_fields=["kg_remaining", "updated_at"])

    # Ordinary promotion usage is reversed on cancellation. Ambassador codes
    # count when the order is placed, so their referral record is historical.
    order.promo_usages.filter(promo_code__ambassador_profile__isnull=True).delete()

    from apps.inventory.models import InventoryTransaction

    usage_rows = list(
        InventoryTransaction.objects.filter(
            order=order, change_type=InventoryTransaction.ChangeType.USAGE
        )
    )
    for usage in usage_rows:
        reversal_batch = f"CANCEL-REVERSAL-{usage.pk}"
        if InventoryTransaction.objects.filter(batch=reversal_batch).exists():
            continue
        InventoryTransaction.objects.create(
            item=usage.item,
            change_type=InventoryTransaction.ChangeType.ADJUSTMENT,
            quantity_change=abs(usage.quantity_change),
            order=order,
            batch=reversal_batch,
            reason=f"Reversed usage after cancelling order #{order.pk}",
            created_by=changed_by,
        )

    order.status = OrderStatus.CANCELLED
    order.cancelled_at = timezone.now()
    order.cancelled_by = changed_by
    order.cancel_reason = reason
    if reason:
        order.notes = f"{order.notes}\nCancellation: {reason}".strip()
    order.save(
        update_fields=[
            "status", "notes", "cancelled_at", "cancelled_by", "cancel_reason", "updated_at"
        ]
    )
    recompute_payment_status(
        order, changed_by=changed_by, reason=reason or "Order cancelled"
    )
    return order
