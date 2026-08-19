from config.celery import app


@app.task
def check_low_stock_daily():
    """Daily safety-net sweep for 'only 3L of softener left'-style alerts.
    The real-time path (apps/inventory/signals.py) fires the moment a
    transaction pushes an item at/below threshold; this catches anything
    that could otherwise be missed — e.g. a threshold edited upward after
    the fact with no new transaction to trigger the signal."""
    from django.db.models import F

    from apps.inventory.models import InventoryItem
    from apps.inventory.signals import _notify_low_stock

    low_items = InventoryItem.objects.filter(quantity__lte=F("low_stock_threshold"))
    for item in low_items:
        _notify_low_stock(item)
