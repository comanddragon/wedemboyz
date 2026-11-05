from datetime import timedelta
from unittest.mock import patch

import pytest
from django.db import transaction
from django.utils import timezone
from rest_framework.test import APIClient

from apps.discounts.api.serializers.loyalty import AmbassadorCreateSerializer
from apps.discounts.models import (
    AmbassadorCashout,
    DiscountCampaign,
    LoyaltyReward,
    LoyaltyRewardGrant,
    LoyaltyTransaction,
)
from apps.finance.models import CreditAccount, CreditTransaction
from apps.jobs.models import Job
from apps.notifications.models import Notification, NotificationPreference
from apps.notifications.tasks import announce_campaign, send_push, send_sms, send_whatsapp
from apps.orders.models import Order, PickupDeliverySchedule
from apps.payments.models import Payment, Refund, Subscription
from apps.users.models import CustomUser
from services.notifications import notify

pytestmark = pytest.mark.django_db


@pytest.fixture
def customer():
    user = CustomUser.objects.create_user(phone_number="237677910001", password="test-pass")
    Notification.objects.all().delete()
    return user


@pytest.fixture
def order(customer):
    order = Order.objects.create(
        user=customer, pickup_address="A", delivery_address="B", total_amount=5000
    )
    Notification.objects.all().delete()
    return order


def messages(user):
    return Notification.objects.filter(user=user)


@pytest.mark.parametrize(
    "status",
    [
        "CONFIRMED",
        "COLLECTED",
        "IN_PROGRESS",
        "READY",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
    ],
)
def test_order_transitions_notify_once_with_order_link(customer, order, status):
    order.status = status
    order.save(update_fields=["status"])
    notification = messages(customer).get()
    assert notification.notification_type == "ORDER_UPDATE"
    assert notification.related_order == order
    assert notification.action_path == f"orders/{order.pk}"
    order.save(update_fields=["status"])
    assert messages(customer).count() == 1


def test_creation_and_customer_visible_order_changes(customer, order):
    other = Order.objects.create(user=customer, pickup_address="A", delivery_address="B")
    assert messages(customer).get().related_order == other
    Notification.objects.all().delete()
    order.internal_notes = "Secret staff note"
    order.save(update_fields=["internal_notes"])
    assert not messages(customer).exists()
    order.total_amount = 6500
    order.save(update_fields=["total_amount"])
    assert "6500" in messages(customer).get().body
    assert "Secret" not in messages(customer).get().body


def test_schedule_creation_change_and_noop(customer, order):
    today = timezone.localdate()
    schedule = PickupDeliverySchedule.objects.create(
        order=order,
        pickup_date=today,
        delivery_date=today + timedelta(days=2),
        pickup_time_slot="MORNING",
        delivery_time_slot="EVENING",
    )
    assert messages(customer).count() == 1
    schedule.save()
    assert messages(customer).count() == 1
    schedule.pickup_status = "MISSED"
    schedule.save(update_fields=["pickup_status"])
    assert messages(customer).count() == 2


@pytest.mark.parametrize("status", ["SUCCEEDED", "FAILED"])
def test_payments_and_refunds_link_to_customer_order(customer, order, status):
    payment = Payment.objects.create(order=order, gateway="CASH", amount=5000, status=status)
    notification = messages(customer).filter(notification_type="PAYMENT").get()
    assert notification.related_order == order
    payment.save()
    assert messages(customer).filter(notification_type="PAYMENT").count() == 1
    if status == "SUCCEEDED":
        refund = Refund.objects.create(payment=payment, amount=500, reason="Test refund")
        assert messages(customer).filter(title="Refund updated").count() == 1
        refund.status = "APPROVED"
        refund.save()
        assert messages(customer).filter(title="Refund updated").count() == 2


def test_subscription_creation_activation_and_scheduled_cancellation(customer):
    subscription = Subscription.objects.create(
        user=customer,
        plan="BASIC",
        start_date=timezone.localdate(),
        end_date=timezone.localdate() + timedelta(days=30),
    )
    assert messages(customer).get().action_path == "subscription"
    subscription.status = "ACTIVE"
    subscription.save()
    subscription.cancel_at_period_end = True
    subscription.save()
    assert messages(customer).count() == 3
    assert "Cancellation" in messages(customer).first().body


def test_account_updates_exclude_internal_notes_and_localize(customer):
    profile = customer.profile
    profile.notes = "Private staff memo"
    profile.tags = ["Internal"]
    profile.save()
    assert not messages(customer).exists()
    profile.preferred_language = "fr"
    profile.is_blocked = True
    profile.blocked_reason = "Private reason"
    profile.save()
    notification = messages(customer).get()
    assert notification.title == "Accès au compte modifié"
    assert "Private" not in notification.body
    customer.first_name = "Changed"
    customer.save()
    assert messages(customer).count() == 2


def test_ambassador_credit_edit_promo_and_cashout(customer):
    serializer = AmbassadorCreateSerializer(data={"user_id": customer.pk})
    serializer.is_valid(raise_exception=True)
    ambassador = serializer.save()
    assert messages(customer).get().action_path == "loyalty"
    ambassador.credit_balance = 1000
    ambassador.save()
    assert "1000" in messages(customer).first().body
    ambassador.promo_code.code = "UPDATED"
    ambassador.promo_code.save()
    assert "UPDATED" in messages(customer).first().body
    cashout = AmbassadorCashout.objects.create(ambassador=ambassador, amount=500)
    assert messages(customer).first().title == "Cashout requested"
    cashout.paid_at = timezone.now()
    cashout.reference = "REF-123"
    cashout.save()
    assert "REF-123" in messages(customer).first().body


def test_loyalty_reward_and_credit_ledger_events(customer):
    LoyaltyTransaction.objects.create(
        loyalty_account=customer.loyalty_account, points=200, transaction_type="ADJUST"
    )
    assert "+200" in messages(customer).get().body
    reward = LoyaltyReward.objects.create(name="Free wash", track="BADGE")
    grant = LoyaltyRewardGrant.objects.create(user=customer, reward=reward)
    assert messages(customer).first().title == "New loyalty reward"
    grant.is_redeemed = True
    grant.save()
    assert messages(customer).first().title == "Reward redeemed"
    account = CreditAccount.objects.create(user=customer)
    CreditTransaction.objects.create(credit_account=account, transaction_type="CHARGE", amount=400)
    assert messages(customer).first().notification_type == "PAYMENT"
    assert "400" in messages(customer).first().body


def campaign(**kwargs):
    return DiscountCampaign.objects.create(
        name="Weekend offer",
        discount_type="PERCENTAGE",
        value=10,
        start_date=timezone.now() - timedelta(minutes=1),
        end_date=timezone.now() + timedelta(days=7),
        **kwargs,
    )


def opt_in(user):
    user.profile.marketing_opt_in = True
    user.profile.save()
    Notification.objects.all().delete()


@pytest.mark.parametrize(
    "segment,eligible",
    [("ALL", True), ("NEW_CUSTOMERS", False), ("LOYALTY_GOLD", False), ("LAPSED", False)],
)
def test_campaign_segments_and_retry_deduplication(customer, order, segment, eligible):
    opt_in(customer)
    offer = campaign(target_segment=segment)
    announce_campaign(offer.pk)
    announce_campaign(offer.pk)
    assert messages(customer).filter(notification_type="PROMO").count() == int(eligible)


def test_campaign_consent_timing_and_cancellation(customer):
    offer = campaign()
    announce_campaign(offer.pk)
    assert not messages(customer).exists()
    opt_in(customer)
    prefs = NotificationPreference.objects.create(user=customer, promo_opt_in=False)
    announce_campaign(offer.pk)
    assert not messages(customer).exists()
    prefs.promo_opt_in = True
    prefs.save()
    offer.start_date = timezone.now() + timedelta(days=1)
    offer.save()
    announce_campaign(offer.pk)
    assert not messages(customer).exists()
    assert Job.objects.filter(
        task_name=announce_campaign.name, run_at__gte=offer.start_date
    ).exists()
    offer.start_date = timezone.now() - timedelta(minutes=1)
    offer.is_active = False
    offer.save()
    announce_campaign(offer.pk)
    assert not messages(customer).exists()


@pytest.mark.parametrize("segment", ["NEW_CUSTOMERS", "LOYALTY_GOLD", "LAPSED"])
def test_matching_campaign_audiences(customer, segment):
    opt_in(customer)
    if segment == "LOYALTY_GOLD":
        customer.loyalty_account.tier = "GOLD"
        customer.loyalty_account.save()
    if segment == "LAPSED":
        old_order = Order.objects.create(user=customer, pickup_address="A", delivery_address="B")
        Order.objects.filter(pk=old_order.pk).update(created_at=timezone.now() - timedelta(days=91))
    offer = campaign(target_segment=segment)
    announce_campaign(offer.pk)
    assert messages(customer).filter(notification_type="PROMO").count() == 1


def test_notification_rollback_and_deduplication(customer):
    delivery_jobs_before = Job.objects.filter(idempotency_key__startswith="notification/").count()
    try:
        with transaction.atomic():
            notify(customer, key="rollback", title=("Test", "Test"), body=("Test", "Test"))
            raise ValueError("abort")
    except ValueError:
        pass
    assert not messages(customer).exists()
    assert (
        Job.objects.filter(idempotency_key__startswith="notification/").count()
        == delivery_jobs_before
    )
    for _ in range(2):
        notify(customer, key="same-event", title=("Test", "Test"), body=("Test", "Test"))
    assert messages(customer).count() == 1


def test_seed_mode_does_not_create_inbox_or_campaign_jobs(customer, settings):
    settings.SEED_DATA_ACTIVE = True
    customer.first_name = "Seed"
    customer.save()
    campaign()
    assert not messages(customer).exists()
    assert not Job.objects.filter(task_name=announce_campaign.name).exists()


@pytest.mark.parametrize(
    "task,service",
    [
        (send_sms, "services.sms.send_sms"),
        (send_push, "services.push.send_push"),
        (send_whatsapp, "services.whatsapp.send_whatsapp"),
    ],
)
def test_promotion_delivery_rechecks_consent(customer, task, service):
    opt_in(customer)
    notification = notify(
        customer, key="promo", kind="PROMO", title=("Offer", "Offre"), body=("Test", "Test")
    )
    customer.profile.marketing_opt_in = False
    customer.profile.save()
    with patch(service) as deliver:
        task(notification.pk)
        deliver.assert_not_called()


def test_inbox_is_private_and_read_actions_are_scoped(customer):
    other = CustomUser.objects.create_user(phone_number="237677910002", password="test")
    notification = notify(
        customer, key="private", title=("Private", "Privé"), body=("Test", "Test"), path="loyalty"
    )
    client = APIClient()
    client.force_authenticate(other)
    assert client.post(f"/api/v1/notifications/{notification.pk}/read/").status_code == 404
    client.force_authenticate(customer)
    response = client.get("/api/v1/notifications/?is_read=false")
    assert response.status_code == 200
    assert response.data["results"][0]["action_path"] == "loyalty"
    assert client.post(f"/api/v1/notifications/{notification.pk}/read/").status_code == 200
    assert client.get("/api/v1/notifications/?is_read=false").data["count"] == 0


def test_status_delivery_uses_saved_event_and_preferences(customer, order):
    NotificationPreference.objects.create(user=customer, sms_enabled=False)
    order.status = "READY"
    order.save(update_fields=["status"])
    ready = messages(customer).get()
    order.status = "DELIVERED"
    order.save(update_fields=["status"])
    with patch("services.sms.send_sms") as deliver:
        send_sms(ready.pk)
        deliver.assert_not_called()
    customer.notification_preference.sms_enabled = True
    customer.notification_preference.save()
    with patch("services.sms.send_sms") as deliver:
        send_sms(ready.pk)
        assert "ready" in deliver.call_args.args[1]
        assert "delivered" not in deliver.call_args.args[1]


def test_guest_order_receives_transactional_notifications(customer):
    customer.is_guest = True
    customer.save(update_fields=["is_guest"])
    order = Order.objects.create(user=customer, pickup_address="A", delivery_address="B")
    assert messages(customer).get().related_order == order
    with patch("services.sms.send_sms") as deliver:
        send_sms(messages(customer).get().pk)
        deliver.assert_called_once()


def test_voided_payment_sends_a_clear_notification(customer, order):
    payment = Payment.objects.create(order=order, gateway="CASH", amount=5000, status="SUCCEEDED")
    Notification.objects.all().delete()
    payment.voided_at = timezone.now()
    payment.save(update_fields=["voided_at"])
    notification = messages(customer).get()
    assert notification.title == "Payment voided"
    assert "Voided" in notification.body
    assert "Succeeded" not in notification.body
