from config.celery import app


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_status_update(self, order_id: int):
    from apps.orders.models import Order
    from services import sms

    try:
        order = Order.objects.select_related("user").get(pk=order_id)
        message_by_status = {
            "CONFIRMED": sms.order_confirmed_message,
            "READY": sms.order_ready_message,
            "OUT_FOR_DELIVERY": sms.order_out_for_delivery_message,
        }
        builder = message_by_status.get(order.status)
        if builder is None:
            return
        sms.send_sms(order.user.phone_number, builder(order))
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def assign_driver(self, order_id: int, driver_id: int):
    """Placeholder hook for a future dispatch/driver-assignment system."""
    from apps.orders.models import Order

    try:
        order = Order.objects.get(pk=order_id)
        order.notes += f"\n[dispatch] assigned driver #{driver_id}"
        order.save(update_fields=["notes"])
    except Exception as exc:
        raise self.retry(exc=exc)


@app.task
def award_loyalty_points_for_delivered_order(order_id: int):
    from apps.orders.models import Order
    from services.loyalty import award_points_for_order

    order = Order.objects.get(pk=order_id)
    if order.status == "DELIVERED":
        award_points_for_order(order)
