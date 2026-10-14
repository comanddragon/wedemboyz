"""
SMS notification service. Wraps AfricasTalking (the dominant SMS gateway
across Cameroon/West Africa) behind a small interface so the provider can be
swapped later without touching call sites in tasks.py/signals.py.
"""

import logging

from django.conf import settings

from core.utils import format_phone_number

logger = logging.getLogger("apps")


class SMSSendError(Exception):
    pass


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
    return (
        f"WEDEMBOYZ: Your order #{order.pk} is confirmed. "
        f"Pickup scheduled — we'll text you when the driver is on the way."
    )


def order_ready_message(order) -> str:
    return f"WEDEMBOYZ: Order #{order.pk} is ready for delivery."


def order_out_for_delivery_message(order) -> str:
    return f"WEDEMBOYZ: Your laundry (Order #{order.pk}) is out for delivery."


def payment_received_message(payment) -> str:
    return f"WEDEMBOYZ: Payment of {payment.amount} {payment.currency} received. Merci!"
