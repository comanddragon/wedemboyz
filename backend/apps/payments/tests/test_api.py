from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.orders.models import Order
from apps.payments.models import Payment, PaymentMethod, Subscription
from services.order_payments import recompute_payment_status

pytestmark = pytest.mark.django_db


@pytest.fixture
def auth_client(create_user):
    user = create_user(phone_number="237677200001")
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def pending_subscription(user):
    today = timezone.localdate()
    return Subscription.objects.create(
        user=user,
        plan="ESSENTIEL",
        start_date=today,
        end_date=today + timedelta(days=30),
    )


class TestSubscriptionCreate:
    def test_creates_pending_subscription_with_no_allowance(self, auth_client):
        client, _ = auth_client
        response = client.post("/api/v1/subscriptions/", {"plan": "ESSENTIEL"}, format="json")
        assert response.status_code == 201, response.data
        subscription = Subscription.objects.get(pk=response.data["id"])
        assert subscription.status == "PENDING"
        assert subscription.kg_remaining == 0
        assert subscription.billing_cycle == "ONE_TIME"

    def test_rejects_new_automatic_billing(self, auth_client):
        client, _ = auth_client
        response = client.post(
            "/api/v1/subscriptions/", {"plan": "CONFORT", "billing_cycle": "MONTHLY"}, format="json"
        )
        assert response.status_code == 400
        assert not Subscription.objects.exists()


class TestSubscriptionCollection:
    @pytest.mark.parametrize("option", ["PAY_AT_PICKUP", "PAY_AFTER_DELIVERY"])
    def test_saves_timing_without_charging_or_activating(self, auth_client, option):
        client, user = auth_client
        subscription = pending_subscription(user)
        response = client.post(
            f"/api/v1/subscriptions/{subscription.pk}/checkout/",
            {"payment_option": option},
            format="json",
        )
        assert response.status_code == 200, response.data
        subscription.refresh_from_db()
        assert response.data["payment_option"] == option
        assert subscription.payment_option == option
        assert subscription.status == "PENDING"
        assert subscription.kg_remaining == 0
        assert not Payment.objects.exists()

    @pytest.mark.parametrize("gateway", ["STRIPE", "PAYPAL", "MTN_MOMO", "ORANGE_MONEY"])
    def test_rejects_old_gateway_checkout(self, auth_client, gateway):
        client, user = auth_client
        subscription = pending_subscription(user)
        with patch("services.billing.campay_gateway.initiate_collection") as charge:
            response = client.post(
                f"/api/v1/subscriptions/{subscription.pk}/checkout/",
                {"gateway": gateway},
                format="json",
            )
        assert response.status_code == 400
        charge.assert_not_called()
        assert not Payment.objects.exists()

    def test_cannot_change_another_customers_subscription(self, auth_client, create_user):
        client, _ = auth_client
        other = create_user(phone_number="237677200002")
        subscription = pending_subscription(other)
        response = client.post(
            f"/api/v1/subscriptions/{subscription.pk}/checkout/",
            {"payment_option": "PAY_AT_PICKUP"},
            format="json",
        )
        assert response.status_code == 404

    def test_cannot_checkout_active_subscription(self, auth_client):
        client, user = auth_client
        subscription = pending_subscription(user)
        subscription.status = "ACTIVE"
        subscription.save()
        response = client.post(
            f"/api/v1/subscriptions/{subscription.pk}/checkout/",
            {"payment_option": "PAY_AT_PICKUP"},
            format="json",
        )
        assert response.status_code == 400


class TestRemovedOnlinePayments:
    @pytest.mark.parametrize("gateway", ["STRIPE", "PAYPAL", "MTN_MOMO", "ORANGE_MONEY", "CASH"])
    def test_saved_instruments_cannot_be_added(self, auth_client, gateway):
        client, _ = auth_client
        response = client.post(
            "/api/v1/payments/methods/",
            {"gateway": gateway, "phone_number": "237677300001"},
            format="json",
        )
        assert response.status_code == 400
        assert not PaymentMethod.objects.exists()

    def test_online_payment_does_not_contact_provider(self, auth_client):
        client, user = auth_client
        order = Order.objects.create(user=user, total_amount=1000)
        with patch("services.billing.campay_gateway.initiate_collection") as charge:
            response = client.post(
                "/api/v1/payments/", {"order": order.pk, "gateway": "MTN_MOMO"}, format="json"
            )
        assert response.status_code == 400
        charge.assert_not_called()
        assert not Payment.objects.exists()


class TestBinaryOrderPaymentState:
    @pytest.mark.parametrize(
        "received, expected", [(0, "UNPAID"), (500, "UNPAID"), (1000, "PAID"), (1200, "PAID")]
    )
    def test_settlement_uses_net_collected_total(self, auth_client, received, expected):
        _, user = auth_client
        order = Order.objects.create(user=user, total_amount=1000)
        if received:
            Payment.objects.create(
                order=order,
                gateway="CASH",
                payment_method_type="PAY_AT_PICKUP",
                amount=received,
                status="SUCCEEDED",
            )
        result = recompute_payment_status(order)
        assert result.payment_status == expected
        assert result.amount_paid == Decimal(received)
        assert result.balance_due == max(1000 - received, 0)

    def test_voiding_payment_reopens_balance(self, auth_client):
        _, user = auth_client
        order = Order.objects.create(user=user, total_amount=1000)
        payment = Payment.objects.create(
            order=order, gateway="CASH", amount=1000, status="SUCCEEDED"
        )
        assert recompute_payment_status(order).payment_status == "PAID"
        payment.voided_at = timezone.now()
        payment.save()
        assert recompute_payment_status(order).payment_status == "UNPAID"

    def test_free_order_is_paid(self, auth_client):
        _, user = auth_client
        order = Order.objects.create(user=user, total_amount=0)
        assert recompute_payment_status(order).payment_status == "PAID"


class TestStaffCollections:
    @pytest.mark.parametrize("option", ["PAY_AT_PICKUP", "PAY_AFTER_DELIVERY"])
    def test_staff_records_collection_and_settles_order(self, create_user, option):
        staff = create_user(phone_number="237677210001", is_staff=True, is_superuser=True)
        customer = create_user(phone_number="237677210002")
        order = Order.objects.create(user=customer, total_amount=1000)
        client = APIClient()
        client.force_authenticate(staff)
        response = client.post(f"/api/v1/orders/{order.pk}/payments/", {"amount": 1000, "payment_method_type": option}, format="json")
        assert response.status_code == 201, response.data
        order.refresh_from_db()
        assert order.payment_status == "PAID"
        assert order.amount_paid == 1000
        assert order.payments.get().payment_method_type == option

    def test_customer_cannot_record_own_payment(self, auth_client):
        client, user = auth_client
        order = Order.objects.create(user=user, total_amount=1000)
        response = client.post(f"/api/v1/orders/{order.pk}/payments/", {"amount": 1000, "payment_method_type": "PAY_AT_PICKUP"}, format="json")
        assert response.status_code == 403
        assert not Payment.objects.exists()

    @pytest.mark.parametrize("option", ["PAY_AT_PICKUP", "PAY_AFTER_DELIVERY"])
    def test_quick_sale_preserves_collection_choice(self, create_user, option):
        staff = create_user(phone_number="237677210001", is_staff=True, is_superuser=True)
        client = APIClient()
        client.force_authenticate(staff)
        response = client.post("/api/v1/orders/quick-sale/", {
            "customer_phone": "237677210002", "payment_method": option, "paid_now": False,
            "items": [{"service_type": "CHEMISE", "quantity": 1}],
        }, format="json")
        assert response.status_code == 201, response.data
        order = Order.objects.get(pk=response.data["order"]["id"])
        assert order.payment_option == option
        assert order.payment_status == "UNPAID"
        assert not Payment.objects.exists()

    def test_refund_reopens_balance(self, auth_client):
        from apps.payments.models import Refund
        _, user = auth_client
        order = Order.objects.create(user=user, total_amount=1000)
        payment = Payment.objects.create(order=order, gateway="CASH", amount=1000, status="SUCCEEDED")
        assert recompute_payment_status(order).payment_status == "PAID"
        Refund.objects.create(payment=payment, amount=200, reason="Returned item", status="PROCESSED")
        result = recompute_payment_status(order)
        assert result.payment_status == "UNPAID"
        assert result.amount_paid == 800
        assert result.balance_due == 200
