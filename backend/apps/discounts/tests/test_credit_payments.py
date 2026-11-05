from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.discounts.api.serializers.loyalty import AmbassadorCreateSerializer
from apps.discounts.models import AmbassadorCashout, LoyaltyTransaction
from apps.orders.models import Order
from apps.users.models import CustomUser

pytestmark = pytest.mark.django_db


def setup_customer():
    user = CustomUser.objects.create_user(phone_number="237677900001", password="test-pass")
    client = APIClient()
    client.force_authenticate(user=user)
    return user, client


def test_pay_order_consumes_credits_once_and_updates_payment_status():
    user, client = setup_customer()
    user.loyalty_account.points_balance = 7000
    user.loyalty_account.save()
    order = Order.objects.create(
        user=user, pickup_address="A", delivery_address="B", total_amount=6000
    )
    response = client.post("/api/v1/loyalty/pay-order/", {"order_id": order.pk})
    assert response.status_code == 201, response.data
    order.refresh_from_db()
    user.loyalty_account.refresh_from_db()
    assert order.payment_status == "PAID"
    assert order.amount_paid == 6000
    assert user.loyalty_account.points_balance == 1300
    assert client.post("/api/v1/loyalty/pay-order/", {"order_id": order.pk}).status_code == 400
    assert LoyaltyTransaction.objects.filter(order=order, transaction_type="REDEEM").count() == 1


def test_insufficient_credits_and_other_users_order_cannot_be_paid():
    user, client = setup_customer()
    order = Order.objects.create(
        user=user, pickup_address="A", delivery_address="B", total_amount=6000
    )
    assert client.post("/api/v1/loyalty/pay-order/", {"order_id": order.pk}).status_code == 400
    other = CustomUser.objects.create_user(phone_number="237677900002", password="test-pass")
    order.user = other
    order.save()
    assert client.post("/api/v1/loyalty/pay-order/", {"order_id": order.pk}).status_code == 404
    assert order.payments.count() == 0


def test_cashout_reserves_credits_and_owner_records_payment_once():
    user, client = setup_customer()
    serializer = AmbassadorCreateSerializer(data={"user_id": user.pk})
    serializer.is_valid(raise_exception=True)
    ambassador = serializer.save()
    ambassador.credit_balance = 1000
    ambassador.save()
    result = client.post("/api/v1/loyalty/ambassadors/cashouts/", {"amount": 600})
    assert result.status_code == 201, result.data
    ambassador.refresh_from_db()
    assert ambassador.credit_balance == Decimal("400")
    assert client.post("/api/v1/loyalty/ambassadors/cashouts/", {"amount": 600}).status_code == 400
    url = f"/api/v1/loyalty/admin/ambassadors/cashouts/{result.data['id']}/pay/"
    assert client.post(url, {"reference": "test"}).status_code == 403
    owner = CustomUser.objects.create_superuser(phone_number="237677900003", password="test-pass")
    client.force_authenticate(user=owner)
    assert client.post(url, {"reference": "MOMO-123"}).status_code == 200
    assert client.post(url, {"reference": "MOMO-123"}).status_code == 400
    assert AmbassadorCashout.objects.get(pk=result.data["id"]).paid_by == owner


def test_owner_can_edit_promo_and_unphotographed_ambassador_ranks():
    user, client = setup_customer()
    serializer = AmbassadorCreateSerializer(data={"user_id": user.pk})
    serializer.is_valid(raise_exception=True)
    ambassador = serializer.save()
    owner = CustomUser.objects.create_superuser(phone_number="237677900003", password="test-pass")
    client.force_authenticate(user=owner)
    response = client.patch(
        f"/api/v1/loyalty/admin/ambassadors/{ambassador.pk}/", {"promo_code": "NEW-CODE"}
    )
    assert response.status_code == 200, response.data
    ambassador.promo_code.refresh_from_db()
    assert ambassador.promo_code.code == "NEW-CODE"
    response = client.get("/api/v1/loyalty/ambassadors/leaderboard/")
    assert any(row["ambassador"]["id"] == ambassador.pk for row in response.data["results"])


def test_credits_earned_at_placement_are_not_duplicated_by_late_payment():
    from apps.orders.tasks import award_loyalty_points_for_delivered_order
    from apps.payments.models import Payment
    from services.order_payments import recompute_payment_status

    user, _ = setup_customer()
    order = Order.objects.create(
        user=user,
        pickup_address="A",
        delivery_address="B",
        total_amount=6000,
        delivery_fee=1000,
        status="DELIVERED",
    )
    award_loyalty_points_for_delivered_order(order.pk)
    assert LoyaltyTransaction.objects.filter(order=order, transaction_type="EARN").count() == 1
    user.loyalty_account.refresh_from_db()
    assert user.loyalty_account.points_balance == 250
    Payment.objects.create(order=order, amount=6000, gateway="CASH", status="SUCCEEDED")
    recompute_payment_status(order)
    award_loyalty_points_for_delivered_order(order.pk)
    user.loyalty_account.refresh_from_db()
    assert user.loyalty_account.points_balance == 250
    assert user.badge_account.lifetime_badges == 1
    assert LoyaltyTransaction.objects.filter(order=order, transaction_type="EARN").count() == 1


@pytest.mark.parametrize("balance", ["1500", "250", "0"])
def test_owner_can_set_available_ambassador_credits(balance):
    user, client = setup_customer()
    serializer = AmbassadorCreateSerializer(data={"user_id": user.pk})
    serializer.is_valid(raise_exception=True)
    ambassador = serializer.save()
    ambassador.credit_balance = 1000
    ambassador.lifetime_credits = 2000
    ambassador.save()
    url = f"/api/v1/loyalty/admin/ambassadors/{ambassador.pk}/"
    assert client.patch(url, {"credit_balance": balance}).status_code == 403
    owner = CustomUser.objects.create_superuser(phone_number="237677900003", password="test-pass")
    client.force_authenticate(user=owner)
    response = client.patch(url, {"credit_balance": balance})
    assert response.status_code == 200, response.data
    ambassador.refresh_from_db()
    assert ambassador.credit_balance == Decimal(balance)
    assert ambassador.lifetime_credits == 2000


@pytest.mark.parametrize("balance", ["-1", "1.5", "invalid", "NaN", "1000000000000", None])
def test_invalid_ambassador_credit_edits_leave_balance_unchanged(balance):
    user, client = setup_customer()
    serializer = AmbassadorCreateSerializer(data={"user_id": user.pk})
    serializer.is_valid(raise_exception=True)
    ambassador = serializer.save()
    ambassador.credit_balance = 1000
    ambassador.save()
    owner = CustomUser.objects.create_superuser(phone_number="237677900003", password="test-pass")
    client.force_authenticate(user=owner)
    response = client.patch(
        f"/api/v1/loyalty/admin/ambassadors/{ambassador.pk}/",
        {"credit_balance": balance}, format="json",
    )
    assert response.status_code == 400, response.data
    assert "credit_balance" in response.data["error"]["detail"]
    ambassador.refresh_from_db()
    assert ambassador.credit_balance == 1000
