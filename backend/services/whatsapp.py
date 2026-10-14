"""
WhatsApp notification service. Uses Twilio's WhatsApp API by default, behind
the same small interface as services/sms.py so the provider can be swapped
later without touching call sites in tasks.py.
"""

import logging

from django.conf import settings

from core.utils import format_phone_number

logger = logging.getLogger("apps")


class WhatsAppSendError(Exception):
    pass


def _send_via_twilio(phone_number: str, message: str) -> dict:
    import requests

    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.WHATSAPP_ACCOUNT_SID}/Messages.json"
    response = requests.post(
        url,
        data={
            "From": settings.WHATSAPP_FROM_NUMBER,
            "To": f"whatsapp:+{phone_number}",
            "Body": message,
        },
        auth=(settings.WHATSAPP_ACCOUNT_SID, settings.WHATSAPP_AUTH_TOKEN),
        timeout=10,
    )
    if response.status_code >= 400:
        raise WhatsAppSendError(f"Twilio WhatsApp API error {response.status_code}: {response.text}")
    return response.json()


def send_whatsapp(phone_number: str, message: str) -> bool:
    """
    Send a WhatsApp message. Returns True on (attempted) success. In DEBUG
    without API keys configured, logs to console instead of hitting the
    real API — mirrors send_sms's development fallback.
    """
    phone_number = format_phone_number(phone_number)

    if settings.DEBUG and not settings.WHATSAPP_ACCOUNT_SID:
        logger.info("[WhatsApp:console] to=%s message=%s", phone_number, message)
        return True

    try:
        if settings.WHATSAPP_PROVIDER == "twilio":
            _send_via_twilio(phone_number, message)
        else:
            raise WhatsAppSendError(f"Unsupported WHATSAPP_PROVIDER: {settings.WHATSAPP_PROVIDER}")
        return True
    except Exception:
        logger.exception("Failed to send WhatsApp message to %s", phone_number)
        return False
