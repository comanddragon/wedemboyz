from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.discounts.models import (
    AmbassadorProfile,
    BadgeAccount,
    LoyaltyReward,
    LoyaltyRewardGrant,
    PromoCode,
    PromoUsage,
)
from apps.orders.models import Order
from apps.users.models import CustomUser
from services.loyalty import award_badge_for_order, award_points_for_order


@pytest.mark.django_db
def test_tenth_badge_advances_tier_and_grants_reward():
    user = CustomUser.objects.create_user(phone_number="237677100001", password="test-pass")
    reward = LoyaltyReward.objects.create(
        name="5 kg free", track=LoyaltyReward.Track.BADGE, is_active=True
    )
    orders = [
        Order.objects.create(user=user, pickup_address="A", delivery_address="B", total_amount=5000)
        for _ in range(10)
    ]

    for order in orders:
        order.status = "DELIVERED"
        order.payment_status = "PAID"
        award_badge_for_order(order)

    account = BadgeAccount.objects.get(user=user)
    assert account.tier == BadgeAccount.Tier.BRONZE
    assert account.badges == 0
    assert account.completed_cards == 1
    assert LoyaltyRewardGrant.objects.filter(user=user, reward=reward, order=orders[-1]).exists()


@pytest.mark.django_db
def test_spending_awards_five_percent_credit_once_excluding_delivery():
    user = CustomUser.objects.create_user(phone_number="237677100002", password="test-pass")
    order = Order.objects.create(
        user=user, pickup_address="A", delivery_address="B", total_amount=4250, delivery_fee=1000
    )

    order.status = "DELIVERED"
    order.payment_status = "PAID"
    award_points_for_order(order)
    order.status = "DELIVERED"
    order.payment_status = "PAID"
    award_points_for_order(order)

    user.loyalty_account.refresh_from_db()
    assert user.loyalty_account.points_balance == 162


@pytest.mark.django_db
def test_ambassador_receives_five_percent_excluding_delivery_when_promo_is_used():
    ambassador_user = CustomUser.objects.create_user(
        phone_number="237677100003", password="test-pass"
    )
    customer = CustomUser.objects.create_user(phone_number="237677100004", password="test-pass")
    now = timezone.now()
    promo = PromoCode.objects.create(
        code="TEST-AMB",
        discount_type="FIXED",
        value=0,
        valid_from=now,
        valid_until=now + timedelta(days=365),
    )
    ambassador = AmbassadorProfile.objects.create(user=ambassador_user, promo_code=promo)
    order = Order.objects.create(
        user=customer,
        pickup_address="A",
        delivery_address="B",
        total_amount=Decimal("22000"),
        delivery_fee=2000,
    )

    order.status = "DELIVERED"
    order.payment_status = "PAID"
    PromoUsage.objects.create(promo_code=promo, user=customer, order=order, discount_applied=0)

    ambassador.refresh_from_db()
    assert ambassador.credit_balance == Decimal("1000")
    assert ambassador.lifetime_credits == Decimal("1000")


@pytest.mark.django_db
@pytest.mark.parametrize(
    "total,delivery,qualifies", [(5999, 1000, False), (6000, 1000, True), (5000, 0, True)]
)
def test_badge_threshold_excludes_delivery(total, delivery, qualifies):
    user = CustomUser.objects.create_user(phone_number="237677100005", password="test-pass")
    order = Order.objects.create(
        user=user,
        pickup_address="A",
        delivery_address="B",
        total_amount=total,
        delivery_fee=delivery,
    )
    order.status = "DELIVERED"
    order.payment_status = "PAID"
    award_badge_for_order(order)
    assert BadgeAccount.objects.filter(user=user, lifetime_badges=1).exists() == qualifies
