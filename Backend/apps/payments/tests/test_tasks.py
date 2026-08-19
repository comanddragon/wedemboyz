from datetime import timedelta

import pytest
from django.utils import timezone

from apps.payments.models import Payment, Subscription
from apps.payments.tasks import activate_subscription, expire_subscriptions, mark_subscription_cancelled, renew_subscription
from core.constants import PaymentStatus
from services.pricing import kg_allowance_for_plan, price_for_subscription_plan

pytestmark = pytest.mark.django_db


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


class TestActivateSubscription:
    def test_activates_pending_subscription_and_grants_allowance(self, create_user):
        user = create_user(phone_number="237677100001")
        sub = _subscription(user, plan=Subscription.Plan.CONFORT)
        payment = Payment.objects.create(
            subscription=sub,
            gateway="STRIPE",
            amount=price_for_subscription_plan(sub.plan),
            status=PaymentStatus.SUCCEEDED,
        )

        activate_subscription(payment.pk)

        sub.refresh_from_db()
        assert sub.status == Subscription.Status.ACTIVE
        assert sub.kg_remaining == kg_allowance_for_plan(Subscription.Plan.CONFORT)
        assert sub.start_date == timezone.localdate()
        assert sub.end_date == timezone.localdate() + timedelta(days=30)

    def test_no_op_if_already_active(self, create_user):
        user = create_user(phone_number="237677100002")
        sub = _subscription(user, status=Subscription.Status.ACTIVE, kg_remaining=4)
        payment = Payment.objects.create(
            subscription=sub, gateway="STRIPE", amount=1000, status=PaymentStatus.SUCCEEDED
        )

        activate_subscription(payment.pk)

        sub.refresh_from_db()
        assert sub.kg_remaining == 4  # untouched, not re-granted


class TestRenewSubscription:
    def test_extends_period_and_records_payment(self, create_user):
        user = create_user(phone_number="237677100003")
        today = timezone.localdate()
        sub = _subscription(
            user,
            plan=Subscription.Plan.ESSENTIEL,
            status=Subscription.Status.ACTIVE,
            kg_remaining=0,
            end_date=today,
            gateway="STRIPE",
            external_subscription_id="sub_123",
        )

        renew_subscription("STRIPE", "sub_123", "in_abc")

        sub.refresh_from_db()
        assert sub.status == Subscription.Status.ACTIVE
        assert sub.kg_remaining == kg_allowance_for_plan(sub.plan)
        assert sub.end_date == today + timedelta(days=30)
        assert Payment.objects.filter(subscription=sub, gateway_reference="in_abc", status=PaymentStatus.SUCCEEDED).exists()

    def test_idempotent_for_duplicate_webhook(self, create_user):
        user = create_user(phone_number="237677100004")
        sub = _subscription(
            user, status=Subscription.Status.ACTIVE, gateway="STRIPE", external_subscription_id="sub_456"
        )
        renew_subscription("STRIPE", "sub_456", "in_dup")
        first_end_date = Subscription.objects.get(pk=sub.pk).end_date

        renew_subscription("STRIPE", "sub_456", "in_dup")  # same invoice id again

        sub.refresh_from_db()
        assert sub.end_date == first_end_date
        assert Payment.objects.filter(gateway_reference="in_dup").count() == 1

    def test_skips_renewal_when_cancel_at_period_end(self, create_user):
        user = create_user(phone_number="237677100005")
        sub = _subscription(
            user,
            status=Subscription.Status.ACTIVE,
            gateway="STRIPE",
            external_subscription_id="sub_789",
            cancel_at_period_end=True,
        )
        renew_subscription("STRIPE", "sub_789", "in_should_not_apply")

        assert not Payment.objects.filter(gateway_reference="in_should_not_apply").exists()


class TestMarkSubscriptionCancelled:
    def test_marks_cancelled(self, create_user):
        user = create_user(phone_number="237677100006")
        sub = _subscription(
            user, status=Subscription.Status.ACTIVE, gateway="PAYPAL", external_subscription_id="I-XYZ"
        )
        mark_subscription_cancelled("PAYPAL", "I-XYZ")
        sub.refresh_from_db()
        assert sub.status == Subscription.Status.CANCELLED

    def test_marks_expired_when_flagged(self, create_user):
        user = create_user(phone_number="237677100007")
        sub = _subscription(
            user, status=Subscription.Status.ACTIVE, gateway="PAYPAL", external_subscription_id="I-EXP"
        )
        mark_subscription_cancelled("PAYPAL", "I-EXP", expired=True)
        sub.refresh_from_db()
        assert sub.status == Subscription.Status.EXPIRED


class TestExpireSubscriptions:
    def test_expires_active_subscriptions_past_end_date(self, create_user):
        user = create_user(phone_number="237677100008")
        today = timezone.localdate()
        past = _subscription(
            user, status=Subscription.Status.ACTIVE, start_date=today - timedelta(days=40), end_date=today - timedelta(days=1)
        )
        current = _subscription(user, status=Subscription.Status.ACTIVE, end_date=today + timedelta(days=10))

        expire_subscriptions()

        past.refresh_from_db()
        current.refresh_from_db()
        assert past.status == Subscription.Status.EXPIRED
        assert current.status == Subscription.Status.ACTIVE
