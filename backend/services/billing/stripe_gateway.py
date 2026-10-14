"""
Stripe checkout for subscription plans — handles both billing cycles:

- ONE_TIME: a single Checkout Session in "payment" mode, priced ad hoc from
  services.pricing.PLAN_PRICE (no Stripe Price object needed).
- MONTHLY:  a Checkout Session in "subscription" mode against a pre-created
  recurring Price (settings.STRIPE_PRICE_ID_*) — Stripe owns the renewal
  schedule from here on and tells us about it via webhooks
  (see apps/payments/api/views/webhooks.py::StripeWebhookView).

XAF is one of Stripe's zero-decimal currencies (like JPY), so unit amounts
are passed as-is — NOT multiplied by 100 the way most currencies are.
"""

import stripe
from django.conf import settings

from services.pricing import price_for_subscription_plan

stripe.api_key = settings.STRIPE_SECRET_KEY

_RECURRING_PRICE_IDS = {
    "ESSENTIEL": lambda: settings.STRIPE_PRICE_ID_ESSENTIEL,
    "CONFORT": lambda: settings.STRIPE_PRICE_ID_CONFORT,
    "FAMILLE": lambda: settings.STRIPE_PRICE_ID_FAMILLE,
}


class StripeConfigurationError(Exception):
    """Raised when a recurring checkout is requested for a plan with no
    Stripe Price ID configured — a deploy/config problem, not user error."""


def _recurring_price_id(plan: str) -> str:
    price_id = _RECURRING_PRICE_IDS[plan]()
    if not price_id:
        raise StripeConfigurationError(
            f"No STRIPE_PRICE_ID configured for plan {plan!r}. "
            "Create a recurring Price in Stripe and set the matching "
            "STRIPE_PRICE_ID_* env var before offering monthly billing for it."
        )
    return price_id


def create_checkout_session(subscription, success_url: str, cancel_url: str):
    """Creates the Checkout Session for a Subscription row and returns it.
    Caller stores session.id as the Payment's gateway_reference and, for
    recurring mode, will learn the Stripe subscription id once
    checkout.session.completed arrives (session.subscription)."""
    common_kwargs = dict(
        mode="subscription" if subscription.is_recurring else "payment",
        success_url=success_url,
        cancel_url=cancel_url,
        client_reference_id=str(subscription.pk),
        metadata={"subscription_id": str(subscription.pk), "user_id": str(subscription.user_id)},
    )

    if subscription.user.email:
        common_kwargs["customer_email"] = subscription.user.email

    if subscription.is_recurring:
        line_items = [{"price": _recurring_price_id(subscription.plan), "quantity": 1}]
        common_kwargs["subscription_data"] = {
            "metadata": {"subscription_id": str(subscription.pk)},
        }
    else:
        amount = price_for_subscription_plan(subscription.plan)
        line_items = [
            {
                "price_data": {
                    "currency": "xaf",
                    "unit_amount": int(amount),
                    "product_data": {
                        "name": f"WEDEMBOYZ Lavomatique — {subscription.get_plan_display()} (one-time)",
                    },
                },
                "quantity": 1,
            }
        ]

    return stripe.checkout.Session.create(line_items=line_items, **common_kwargs)


def cancel_subscription(external_subscription_id: str, *, at_period_end: bool = True):
    """Cancels a Stripe subscription. at_period_end=True lets the customer
    keep access through what they already paid for; False cancels
    immediately (used for admin/fraud cases, not the normal customer flow)."""
    if at_period_end:
        return stripe.Subscription.modify(external_subscription_id, cancel_at_period_end=True)
    return stripe.Subscription.delete(external_subscription_id)


def retrieve_session(session_id: str):
    return stripe.checkout.Session.retrieve(session_id, expand=["subscription"])
