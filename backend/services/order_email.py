"""Owner order notifications delivered through Resend."""

import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from core.utils import contact_phone


def order_email_payload(order):
    user = order.user
    lines = [
        f"New order {order.ticket_number}",
        "",
        f"Customer: {user.get_full_name() or 'Customer'}",
        f"Phone: {contact_phone(user) or 'Not provided'}",
        f"Email: {user.email or 'Not provided'}",
        f"Fulfilment: {order.get_fulfillment_type_display()}",
        f"Payment: {order.get_payment_option_display()}",
        "",
        "Items:",
    ]
    for item in order.items.all():
        weight = f" ({item.weight_kg} kg each)" if item.weight_kg else ""
        lines.append(
            f"- {item.quantity} x {item.label or item.get_service_type_display()}{weight}"
            f" — {item.subtotal} FCFA"
        )
        if item.description:
            lines.append(f"  Note: {item.description}")
    lines.extend([
        "",
        f"Subtotal: {order.subtotal} FCFA",
        f"Discount: {order.discount_amount} FCFA",
        f"Delivery: {order.delivery_fee} FCFA",
        f"Total: {order.total_amount} FCFA",
        "",
        f"Pickup address: {order.pickup_address}",
        f"Delivery address: {order.delivery_address}",
        f"Customer notes: {order.notes or 'None'}",
    ])
    return {
        "to": [settings.ORDER_NOTIFICATION_EMAIL],
        "subject": f"New Wedemboyz order {order.ticket_number}",
        "text": "\n".join(lines),
    }


def send_order_email(order_id, payload):
    if not settings.RESEND_API_KEY or not settings.RESEND_FROM:
        raise ImproperlyConfigured("RESEND_API_KEY and RESEND_FROM are required")
    response = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Idempotency-Key": f"owner-order/{order_id}",
        },
        json={"from": settings.RESEND_FROM, **payload},
        timeout=15,
    )
    response.raise_for_status()
    return response.json()["id"]
