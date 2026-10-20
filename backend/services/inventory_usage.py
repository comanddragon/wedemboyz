from decimal import Decimal

from django.db import transaction

from apps.inventory.models import InventoryTransaction, ServiceConsumption


@transaction.atomic
def consume_for_order(order, *, changed_by=None):
    if InventoryTransaction.objects.filter(
        order=order,
        change_type=InventoryTransaction.ChangeType.USAGE,
        batch=f"AUTO-ORDER-{order.pk}",
    ).exists():
        return []

    standards = {
        (standard.service_type, standard.item_id): standard
        for standard in ServiceConsumption.objects.select_related("item").filter(is_active=True)
    }
    totals = {}
    for line in order.items.all():
        for (service_type, item_id), standard in standards.items():
            if service_type != line.service_type:
                continue
            quantity = (
                standard.quantity_per_kg * line.weight_kg * line.quantity
                + standard.quantity_per_load
            )
            totals[item_id] = totals.get(item_id, Decimal("0")) + quantity

    created = []
    for item_id, quantity in totals.items():
        if quantity <= 0:
            continue
        created.append(
            InventoryTransaction.objects.create(
                item_id=item_id,
                change_type=InventoryTransaction.ChangeType.USAGE,
                quantity_change=-quantity,
                order=order,
                batch=f"AUTO-ORDER-{order.pk}",
                reason=f"Automatic usage for order #{order.pk}",
                created_by=changed_by,
            )
        )
    return created
