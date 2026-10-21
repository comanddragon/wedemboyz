"""
SMS notification service. Wraps AfricasTalking (the dominant SMS gateway
across Cameroon/West Africa) behind a small interface so the provider can be
swapped later without touching call sites in tasks.py/signals.py.
"""

import logging

from django.conf import settings

from core.utils import format_phone_number, is_guest_placeholder_phone

logger = logging.getLogger("apps")


class SMSSendError(Exception):
    pass


def _business_copy(template_key: str, fallback: str, **context) -> str:
    """Resolve admin-managed copy without making notifications depend on settings setup."""
    try:
        from apps.staff.models import BusinessSettings

        business = BusinessSettings.load()
        template = business.notification_templates.get(template_key) or fallback
        return template.format(business_name=business.business_name, **context)
    except Exception:
        logger.warning("Invalid notification template %s; using the default", template_key)
        return fallback.format(business_name="Wedemboyz Lavomatique", **context)


def _send_via_africastalking(phone_number: str, message: str) -> dict:
    import africastalking

    africastalking.initialize(
        username=settings.AFRICASTALKING_USERNAME,
        api_key=settings.AFRICASTALKING_API_KEY,
    )
    sms = africastalking.SMS

    response = sms.send(message, [f"+{phone_number}"])
    recipients = response.get("SMSMessageData", {}).get("Recipients", [])
    if recipients and recipients[0].get("status") != "Success":
        raise SMSSendError(recipients[0].get("status", "Unknown SMS gateway error"))
    return response


def send_sms(phone_number: str, message: str) -> bool:
    """
    Send an SMS. Returns True on (attempted) success. In DEBUG without API
    keys configured, logs to console instead of hitting the real gateway —
    mirrors how EMAIL_BACKEND falls back to console in development.py.
    """
    if not phone_number or is_guest_placeholder_phone(phone_number):
        return False  # guest with no contact number — nobody to message
    phone_number = format_phone_number(phone_number)

    if settings.DEBUG and not settings.AFRICASTALKING_API_KEY:
        logger.info("[SMS:console] to=%s message=%s", phone_number, message)
        return True

    try:
        if settings.SMS_PROVIDER == "africastalking":
            _send_via_africastalking(phone_number, message)
        else:
            raise SMSSendError(f"Unsupported SMS_PROVIDER: {settings.SMS_PROVIDER}")
        return True
    except Exception:
        logger.exception("Failed to send SMS to %s", phone_number)
        return False


# --- Message templates -----------------------------------------------------
# Keeping copy here (not scattered across tasks.py call sites) makes it easy
# to translate to French later for Bamenda's Francophone customers.

def order_confirmed_message(order) -> str:
    return _business_copy(
        "order_confirmed",
        "{business_name}: Your order #{order_id} is confirmed. Pickup scheduled — we'll text you when the driver is on the way.",
        order_id=order.pk,
    )


def order_ready_message(order) -> str:
    return _business_copy(
        "order_ready",
        "{business_name}: Order #{order_id} is ready for delivery.",
        order_id=order.pk,
    )


def order_out_for_delivery_message(order) -> str:
    return _business_copy(
        "order_out_for_delivery",
        "{business_name}: Your laundry (Order #{order_id}) is out for delivery.",
        order_id=order.pk,
    )


def payment_received_message(payment) -> str:
    return _business_copy(
        "payment_received",
        "{business_name}: Payment of {amount} {currency} received. Merci!",
        amount=payment.amount,
        currency=payment.currency,
    )
