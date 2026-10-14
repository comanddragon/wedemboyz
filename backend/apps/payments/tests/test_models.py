from datetime import timedelta

import pytest
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.payments.models import Payment, Subscription, generate_display_label

pytestmark = pytest.mark.django_db


class TestGenerateDisplayLabel:
    def test_mtn_momo_masks_to_last_four_digits(self):
        assert generate_display_label("MTN_MOMO", "237655900002") == "MTN •••• 0002"

    def test_orange_money_masks_to_last_four_digits(self):
        assert generate_display_label("ORANGE_MONEY", "237699005249") == "Orange •••• 5249"

    def test_mtn_momo_without_a_number_falls_back_to_gateway_name(self):
        # Legacy rows created before phone_number existed.
        assert generate_display_label("MTN_MOMO", "") == "MTN Mobile Money"

    def test_non_phone_gateway_uses_its_display_name(self):
        assert generate_display_label("CASH", "") == "Cash on Delivery/Pickup"
        assert generate_display_label("STRIPE", "") == "Card (Stripe)"


def _subscription(user, **kwargs):
    today = timezone.localdate()
    defaults = dict(
        user=user,
        plan=Subscription.Plan.ESSENTIEL,
        status=Subscription.Status.PENDING,
        start_date=today,
        end_date=today + timedelta(days=30),
    )
    defaults.update(kwargs)
    return Subscription.objects.create(**defaults)


class TestPaymentTargetConstraint:
    def test_payment_requires_exactly_one_target(self, create_user):
        user = create_user(phone_number="237677000001")
        subscription = _subscription(user)

        # Neither order nor subscription set -> constraint violation.
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                Payment.objects.create(gateway="STRIPE", amount=1000)

        # Both set -> also a violation.
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                Payment.objects.create(gateway="STRIPE", amount=1000, subscription=subscription, order_id=999999)


class TestSubscriptionFindUsableFor:
    def test_finds_active_unexpired_subscription_with_pickups_left(self, create_user):
        user = create_user(phone_number="237677000002")
        sub = _subscription(user, status=Subscription.Status.ACTIVE, kg_remaining=2)

        with transaction.atomic():
            found = Subscription.find_usable_for(user)
        assert found == sub

    def test_ignores_exhausted_subscription(self, create_user):
        user = create_user(phone_number="237677000003")
        _subscription(user, status=Subscription.Status.ACTIVE, kg_remaining=0)

        with transaction.atomic():
            found = Subscription.find_usable_for(user)
        assert found is None

    def test_ignores_expired_subscription(self, create_user):
        user = create_user(phone_number="237677000004")
        today = timezone.localdate()
        _subscription(
            user,
            status=Subscription.Status.ACTIVE,
            kg_remaining=3,
            start_date=today - timedelta(days=60),
            end_date=today - timedelta(days=1),
        )

        with transaction.atomic():
            found = Subscription.find_usable_for(user)
        assert found is None

    def test_ignores_pending_or_paused_subscription(self, create_user):
        user = create_user(phone_number="237677000005")
        _subscription(user, status=Subscription.Status.PENDING, kg_remaining=4)
        _subscription(user, status=Subscription.Status.PAUSED, kg_remaining=4)

        with transaction.atomic():
            found = Subscription.find_usable_for(user)
        assert found is None
