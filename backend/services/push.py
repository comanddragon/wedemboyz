"""
Push notification service — Firebase Cloud Messaging (legacy HTTP API), kept
behind a small interface like services/sms.py and services/whatsapp.py.
Delivers to every active DeviceToken for a user; a dead/uninstalled token
(FCM reports NotRegistered) is deactivated so it stops being retried.
"""

import logging

from django.conf import settings

logger = logging.getLogger("apps")


class PushSendError(Exception):
    pass


def _send_via_fcm(token: str, title: str, body: str) -> dict:
    import requests

    response = requests.post(
        "https://fcm.googleapis.com/fcm/send",
        headers={
            "Authorization": f"key={settings.FCM_SERVER_KEY}",
            "Content-Type": "application/json",
        },
        json={"to": token, "notification": {"title": title, "body": body}},
        timeout=10,
    )
    if response.status_code >= 400:
        raise PushSendError(f"FCM error {response.status_code}: {response.text}")
    return response.json()


def send_push_to_token(token: str, title: str, body: str) -> bool:
    """Send to a single device token. Returns True on (attempted) success.
    In DEBUG without a server key configured, logs to console instead."""
    if settings.DEBUG and not settings.FCM_SERVER_KEY:
        logger.info("[Push:console] token=%s title=%s body=%s", token, title, body)
        return True

    try:
        result = _send_via_fcm(token, title, body)
        if result.get("failure"):
            _deactivate_if_dead(token, result)
        return True
    except Exception:
        logger.exception("Failed to send push to token %s", token)
        return False


def _deactivate_if_dead(token: str, fcm_result: dict):
    results = fcm_result.get("results") or []
    if results and results[0].get("error") in {"NotRegistered", "InvalidRegistration"}:
        from apps.notifications.models import DeviceToken

        DeviceToken.objects.filter(token=token).update(is_active=False)


def send_push(user, title: str, body: str) -> int:
    """Send to every active device token the user has registered. Returns
    how many tokens were attempted (0 if the user has none registered —
    that's expected/normal, not an error, until the mobile app is wired up
    to call the device-token registration endpoint)."""
    tokens = list(user.device_tokens.filter(is_active=True).values_list("token", flat=True))
    for token in tokens:
        send_push_to_token(token, title, body)
    return len(tokens)
