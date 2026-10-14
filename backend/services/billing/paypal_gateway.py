"""
PayPal checkout for subscription plans, via the REST API (no SDK — this
project already depends on `requests`, so that's what we use here, same as
apps/notifications' SMS/WhatsApp integrations).

Important: PayPal's REST API does not support XAF as a transaction currency
(unlike Stripe, which treats it as a valid zero-decimal currency). Amounts
are converted to USD using settings.PAYPAL_XAF_TO_USD_RATE — see the comment
next to that setting; it's a static peg, not a live feed, and should be
replaced before relying on this for real payments.

- ONE_TIME: PayPal Orders API v2 (intent=CAPTURE) — one-off charge.
- MONTHLY:  PayPal Subscriptions API v1, against a pre-created Billing Plan
  (settings.PAYPAL_PLAN_ID_*). PayPal owns the renewal schedule from there
  and reports back via webhooks (see apps/payments/api/views/webhooks.py::PayPalWebhookView).
"""

from decimal import ROUND_HALF_UP, Decimal

import requests
from django.conf import settings

from services.pricing import price_for_subscription_plan

_RECURRING_PLAN_IDS = {
    "ESSENTIEL": lambda: settings.PAYPAL_PLAN_ID_ESSENTIEL,
    "CONFORT": lambda: settings.PAYPAL_PLAN_ID_CONFORT,
    "FAMILLE": lambda: settings.PAYPAL_PLAN_ID_FAMILLE,
}


class PayPalConfigurationError(Exception):
    """Raised when a recurring checkout is requested for a plan with no
    PayPal Billing Plan ID configured — a deploy/config problem."""


class PayPalAPIError(Exception):
    """Raised on a non-2xx response from the PayPal REST API."""


def _recurring_plan_id(plan: str) -> str:
    plan_id = _RECURRING_PLAN_IDS[plan]()
    if not plan_id:
        raise PayPalConfigurationError(
            f"No PAYPAL_PLAN_ID configured for plan {plan!r}. Create a "
            "Billing Plan in PayPal and set the matching PAYPAL_PLAN_ID_* "
            "env var before offering monthly billing for it."
        )
    return plan_id


def xaf_to_usd(amount_xaf: Decimal) -> str:
    """PayPal wants a decimal string with 2 places for USD."""
    usd = Decimal(amount_xaf) / Decimal(str(settings.PAYPAL_XAF_TO_USD_RATE))
    return str(usd.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _get_access_token() -> str:
    resp = requests.post(
        f"{settings.PAYPAL_API_BASE}/v1/oauth2/token",
        auth=(settings.PAYPAL_CLIENT_ID, settings.PAYPAL_CLIENT_SECRET),
        data={"grant_type": "client_credentials"},
        timeout=15,
    )
    if resp.status_code != 200:
        raise PayPalAPIError(f"PayPal auth failed: {resp.status_code} {resp.text}")
    return resp.json()["access_token"]


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {_get_access_token()}",
        "Content-Type": "application/json",
    }


def _approve_link(links: list) -> str:
    for link in links:
        if link.get("rel") == "approve":
            return link["href"]
    raise PayPalAPIError(f"No approval link in PayPal response links: {links}")


def create_subscription(subscription, return_url: str, cancel_url: str) -> dict:
    """Recurring (MONTHLY) — creates a PayPal Subscription against the
    plan's pre-created Billing Plan. Returns the raw PayPal response;
    caller stores response['id'] (format "I-...") as the gateway reference
    / Subscription.external_subscription_id, and redirects the user to
    the 'approve' link."""
    resp = requests.post(
        f"{settings.PAYPAL_API_BASE}/v1/billing/subscriptions",
        headers=_headers(),
        json={
            "plan_id": _recurring_plan_id(subscription.plan),
            "custom_id": str(subscription.pk),
            "application_context": {
                "brand_name": "WEDEMBOYZ Lavomatique",
                "user_action": "SUBSCRIBE_NOW",
                "return_url": return_url,
                "cancel_url": cancel_url,
            },
        },
        timeout=15,
    )
    if resp.status_code not in (200, 201):
        raise PayPalAPIError(f"PayPal create subscription failed: {resp.status_code} {resp.text}")
    data = resp.json()
    data["approve_url"] = _approve_link(data.get("links", []))
    return data


def create_order(subscription, return_url: str, cancel_url: str) -> dict:
    """One-time (ONE_TIME) — creates a PayPal Order (Orders API v2,
    intent=CAPTURE) for the plan's price. Caller stores response['id'] as
    the gateway reference and redirects to the 'approve' link; the order is
    captured after the user approves (see capture_order, called from
    PayPalWebhookView on CHECKOUT.ORDER.APPROVED)."""
    amount_xaf = price_for_subscription_plan(subscription.plan)
    resp = requests.post(
        f"{settings.PAYPAL_API_BASE}/v2/checkout/orders",
        headers=_headers(),
        json={
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "reference_id": str(subscription.pk),
                    "custom_id": str(subscription.pk),
                    "description": f"WEDEMBOYZ Lavomatique — {subscription.get_plan_display()} (one-time)",
                    "amount": {"currency_code": "USD", "value": xaf_to_usd(amount_xaf)},
                }
            ],
            "application_context": {
                "brand_name": "WEDEMBOYZ Lavomatique",
                "return_url": return_url,
                "cancel_url": cancel_url,
            },
        },
        timeout=15,
    )
    if resp.status_code not in (200, 201):
        raise PayPalAPIError(f"PayPal create order failed: {resp.status_code} {resp.text}")
    data = resp.json()
    data["approve_url"] = _approve_link(data.get("links", []))
    return data


def capture_order(order_id: str) -> dict:
    resp = requests.post(
        f"{settings.PAYPAL_API_BASE}/v2/checkout/orders/{order_id}/capture",
        headers=_headers(),
        timeout=15,
    )
    if resp.status_code not in (200, 201):
        raise PayPalAPIError(f"PayPal capture order failed: {resp.status_code} {resp.text}")
    return resp.json()


def cancel_subscription(external_subscription_id: str, reason: str = "Customer requested cancellation"):
    resp = requests.post(
        f"{settings.PAYPAL_API_BASE}/v1/billing/subscriptions/{external_subscription_id}/cancel",
        headers=_headers(),
        json={"reason": reason},
        timeout=15,
    )
    if resp.status_code not in (204,):
        raise PayPalAPIError(f"PayPal cancel subscription failed: {resp.status_code} {resp.text}")


def verify_webhook_signature(headers: dict, body: bytes, event: dict) -> bool:
    """Confirms a webhook actually came from PayPal before we act on it —
    PayPal's equivalent of Stripe's signed-payload check."""
    resp = requests.post(
        f"{settings.PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature",
        headers=_headers(),
        json={
            "transmission_id": headers.get("Paypal-Transmission-Id"),
            "transmission_time": headers.get("Paypal-Transmission-Time"),
            "cert_url": headers.get("Paypal-Cert-Url"),
            "auth_algo": headers.get("Paypal-Auth-Algo"),
            "transmission_sig": headers.get("Paypal-Transmission-Sig"),
            "webhook_id": settings.PAYPAL_WEBHOOK_ID,
            "webhook_event": event,
        },
        timeout=15,
    )
    if resp.status_code != 200:
        return False
    return resp.json().get("verification_status") == "SUCCESS"
