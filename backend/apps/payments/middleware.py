"""DEV-ONLY test helper — never active unless settings.DEBUG is True.

CamPay's collect endpoint moves real money even against a sandbox/test
MTN/Orange account, so manually testing the webhook flow against a real
order's real total (often several thousand XAF) is expensive and slow to
set up (you'd otherwise have to go hunt down or create an order priced at
exactly the small amount you want to test with — see the WEDEMBOYZ dev
notes on this). This middleware removes that friction: it intercepts
POST /api/v1/payments/ (the payment-initiation endpoint,
apps.payments.api.views.payment.PaymentListCreateView / url name
"payment-list") and temporarily overwrites the referenced order's
total_amount down to TEST_AMOUNT for the duration of that one request,
then restores the order's real amount immediately after — regardless of
whether the request succeeded or raised. Nothing is left mutated in the
DB once the request completes.

Does NOT affect subscription checkout (POST /subscriptions/{id}/checkout/)
— that's priced from services.pricing.PLAN_PRICE, not an Order, and isn't
in scope here. Ask if you'd like the same treatment applied there.
"""

import json
from decimal import Decimal

from django.conf import settings
from django.urls import Resolver404, resolve

# Small enough to be cheap/fast to confirm on a real phone, matches what's
# already been used for manual CamPay testing in this project.
TEST_AMOUNT = Decimal("25")


class DevTestPaymentAmountMiddleware:
    """See module docstring. Registered in MIDDLEWARE (config/settings/base.py)
    unconditionally — the settings.DEBUG check below is what keeps this
    inert outside of development, so it's safe even if a future settings
    file forgets to exclude it."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not settings.DEBUG or request.method != "POST":
            return self.get_response(request)

        if not self._targets_payment_initiation(request):
            return self.get_response(request)

        order_id, original_amount = self._patch_order_amount(request)
        try:
            return self.get_response(request)
        finally:
            if order_id is not None:
                self._restore_order_amount(order_id, original_amount)

    def _targets_payment_initiation(self, request) -> bool:
        try:
            match = resolve(request.path)
        except Resolver404:
            return False
        return match.url_name == "payment-list"

    def _patch_order_amount(self, request):
        from apps.orders.models import Order

        try:
            body = json.loads(request.body or b"{}")
        except (TypeError, ValueError):
            return None, None

        order_id = body.get("order")
        if not order_id:
            return None, None

        order = Order.objects.filter(pk=order_id).first()
        if order is None:
            return None, None

        original_amount = order.total_amount
        if original_amount == TEST_AMOUNT:
            # Already the test amount — nothing to patch or restore.
            return None, None

        order.total_amount = TEST_AMOUNT
        order.save(update_fields=["total_amount"])
        return order_id, original_amount

    def _restore_order_amount(self, order_id, original_amount):
        from apps.orders.models import Order

        Order.objects.filter(pk=order_id).update(total_amount=original_amount)
