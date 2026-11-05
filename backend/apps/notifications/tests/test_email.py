from datetime import timedelta
from unittest.mock import patch

import pytest
import requests
from django.core import mail
from django.db import transaction
from django.test import override_settings
from django.utils import timezone

from apps.jobs.models import Job
from apps.notifications.models import Notification, NotificationPreference
from apps.notifications.tasks import deliver_email, send_email
from apps.orders.models import Order
from apps.payments.models import Payment, Refund, Subscription
from core.constants import PaymentStatus
from services.email import queue_email, render_email, send_payload
from services.email_copy import COPY


@pytest.mark.parametrize("event", COPY)
@pytest.mark.parametrize("language", ["en", "fr"])
@override_settings(FRONTEND_URL="https://wedemboyz-lavomatique.com")
def test_every_template_renders_escaped_html_and_plaintext(event, language):
    result = render_email(
        event, language=language, name='<script>alert("x")</script>', body="<b>hello</b>"
    )
    assert f'lang="{language}"' in result["html"]
    assert 'src="https://wedemboyz-lavomatique.com/logo.png"' in result["html"]
    assert 'alt="Wedemboyz Lavomatique"' in result["html"]
    assert "<script>" not in result["html"]
    assert "&lt;b&gt;hello&lt;/b&gt;" in result["html"]
    assert "<b>hello</b>" in result["text"]
    assert f"https://wedemboyz-lavomatique.com/{language}/dashboard" in result["html"]
    assert COPY[event][language][0] == result["subject"]


@override_settings(EMAIL_BACKEND="services.email_backend.EmailBackend", RESEND_API_KEY="test-key")
def test_transport_uses_resend_with_stable_key_and_alternatives():
    payload = {**render_email("welcome"), "to": ["customer@example.com"]}
    with patch("services.email_backend.requests.post") as post:
        assert send_payload(payload, key="welcome/42") == 1
    options = post.call_args.kwargs
    assert options["headers"]["Idempotency-Key"] == "welcome/42"
    assert options["headers"]["Authorization"] == "Bearer test-key"
    assert options["json"]["html"] == payload["html"]
    assert options["json"]["text"] == payload["text"]
    assert options["json"]["reply_to"] == [
        "owner@wedemboyz-lavomatique.com",
        "dev@wedemboyz-lavomatique.com",
    ]


@override_settings(EMAIL_BACKEND="services.email_backend.EmailBackend", RESEND_API_KEY="test-key")
def test_transport_does_not_swallow_provider_errors():
    with patch("services.email_backend.requests.post", side_effect=requests.Timeout):
        with pytest.raises(requests.Timeout):
            send_payload({**render_email("welcome"), "to": ["a@example.com"]}, key="test")


pytestmark_db = pytest.mark.django_db


def email_jobs():
    return Job.objects.filter(task_name=deliver_email.name)


def deliver(job):
    return deliver_email(*job.args, **job.kwargs)


@pytestmark_db
def test_registration_welcome_is_idempotent_and_localized(create_user):
    user = create_user(email="ada@example.com", first_name="Ada")
    welcome = email_jobs().get(idempotency_key=f"email/welcome/{user.pk}")
    queue_email(user, "welcome", key=f"welcome/{user.pk}")
    assert email_jobs().count() == 1
    deliver(welcome)
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["ada@example.com"]
    assert "Ada" in mail.outbox[0].body
    user.profile.preferred_language = "fr"
    user.profile.save()
    job = queue_email(user, "order_ready", key="french-order")
    assert job.args[2]["subject"] == "Votre linge est prêt"


@pytestmark_db
def test_queue_rolls_back_with_business_transaction(create_user):
    user = create_user()
    user.email = "ada@example.com"
    user.save()
    # The account edit has its own notification email; isolate the rollback event.
    email_jobs().delete()
    with pytest.raises(ValueError):
        with transaction.atomic():
            queue_email(user, "welcome", key="rollback")
            raise ValueError("rollback")
    assert not email_jobs().exists()


@pytestmark_db
def test_opt_out_and_marketing_consent(create_user):
    user = create_user(email="ada@example.com")
    email_jobs().delete()
    prefs = NotificationPreference.objects.create(user=user, email_enabled=False)
    job = queue_email(user, "order_ready", key="order")
    deliver(job)
    assert len(mail.outbox) == 0
    receipt = queue_email(user, "payment_receipt", key="receipt", essential=True)
    deliver(receipt)
    assert len(mail.outbox) == 1
    prefs.email_enabled = True
    prefs.save()
    promo = queue_email(user, "promotion", key="promo")
    deliver(promo)
    assert len(mail.outbox) == 1
    user.profile.marketing_opt_in = True
    user.profile.save()
    deliver(promo)
    assert len(mail.outbox) == 2


@pytestmark_db
def test_changed_recipient_inactive_and_seed_accounts_are_skipped(create_user):
    user = create_user(email="ada@example.com")
    job = email_jobs().get()
    user.email = "changed@example.com"
    user.save()
    deliver(job)
    assert len(mail.outbox) == 0
    with override_settings(SEED_DATA_ACTIVE=True):
        assert queue_email(user, "welcome", key="seed") is None
    user.email = "seed@seed.wedemboyz.invalid"
    assert queue_email(user, "welcome", key="invalid") is None


@pytestmark_db
def test_order_submission_and_status_snapshots(api_client, create_user):
    user = create_user(email="ada@example.com")
    email_jobs().delete()
    api_client.force_authenticate(user)
    response = api_client.post(
        "/api/v1/orders/",
        {
            "pickup_address": "Simbock",
            "delivery_address": "Yaounde",
            "items": [{"service_type": "LAVAGE_ESSORAGE", "weight_kg": "5", "quantity": 2}],
        },
        format="json",
    )
    assert response.status_code == 201, response.data
    job = email_jobs().get(idempotency_key=f"email/order/{response.data['id']}/received")
    assert job.args[1] == "order_received"
    assert "2 ×" in job.args[2]["text"]
    order = Order.objects.get(pk=response.data["id"])
    for state in ["CONFIRMED", "IN_PROGRESS", "READY", "OUT_FOR_DELIVERY", "DELIVERED"]:
        order.status = state
        order.save(update_fields=["status"])
    events = list(email_jobs().values_list("args", flat=True))
    assert {
        args[1] for args in events if args[1].startswith("order_") or args[1] == "invoice_issued"
    } == {
        "invoice_issued",
        "order_received",
        "order_confirmed",
        "order_in_progress",
        "order_ready",
        "order_out_for_delivery",
        "order_delivered",
    }
    assert job.args[2]["subject"] == "We’ve received your order"
    count = email_jobs().count()
    order.save(update_fields=["notes"])
    assert email_jobs().count() == count


@pytestmark_db
def test_payment_receipt_failure_and_refund_transitions(create_user):
    user = create_user(email="ada@example.com")
    order = Order.objects.create(
        user=user, pickup_address="A", delivery_address="B", total_amount=5000
    )
    email_jobs().delete()
    payment = Payment.objects.create(
        order=order, amount=5000, gateway="CASH", status=PaymentStatus.PENDING
    )
    payment.status = PaymentStatus.FAILED
    payment.save()
    assert email_jobs().get().args[1] == "payment_failed"
    payment.status = PaymentStatus.SUCCEEDED
    payment.save()
    payment.save()
    assert email_jobs().count() == 2
    assert (
        email_jobs().get(idempotency_key=f"email/payment/{payment.pk}/payment_receipt").args[-1]
        is True
    )
    refund = Refund.objects.create(payment=payment, amount=1000, reason="One item")
    for status in ["APPROVED", "PROCESSED"]:
        refund.status = status
        refund.save()
    assert (
        email_jobs().filter(idempotency_key__startswith=f"email/refund/{refund.pk}/").count() == 3
    )


@pytestmark_db
def test_subscription_lifecycle_and_expiry(create_user):
    from apps.payments.tasks import expire_subscriptions

    user = create_user(email="ada@example.com")
    email_jobs().delete()
    today = timezone.localdate()
    sub = Subscription.objects.create(
        user=user,
        plan="ESSENTIEL",
        status="PENDING",
        start_date=today,
        end_date=today + timedelta(days=30),
    )
    sub.status = "ACTIVE"
    sub.save()
    sub.end_date += timedelta(days=30)
    sub.save()
    sub.cancel_at_period_end = True
    sub.save()
    assert {job.args[1] for job in email_jobs()} == {
        "subscription_active",
        "subscription_renewed",
        "subscription_cancelling",
    }
    Subscription.objects.filter(pk=sub.pk).update(end_date=today - timedelta(days=1))
    expire_subscriptions()
    assert email_jobs().filter(args__isnull=False).count() == 4
    assert email_jobs().latest("pk").args[1] == "subscription_expired"


@pytestmark_db
def test_existing_notifications_route_to_email(create_user):
    user = create_user(email="ada@example.com")
    email_jobs().delete()
    notification = Notification.objects.create(
        user=user, notification_type="CHAT", title="New message", body="Hello"
    )
    send_email(notification.pk)
    job = email_jobs().get()
    assert job.args[1] == "chat_message"
    assert job.args[2]["text"].endswith("/en/settings")
    assert "/en/chat" in job.args[2]["html"]


@pytestmark_db
def test_schedule_email_contains_dates_and_ignores_note_only_updates(create_user):
    from apps.orders.models import PickupDeliverySchedule

    user = create_user(email="ada@example.com")
    order = Order.objects.create(user=user, pickup_address="A", delivery_address="B")
    email_jobs().delete()
    today = timezone.localdate()
    schedule = PickupDeliverySchedule.objects.create(
        order=order,
        pickup_date=today,
        pickup_time_slot="MORNING",
        delivery_date=today + timedelta(days=2),
        delivery_time_slot="EVENING",
    )
    job = email_jobs().get()
    assert job.args[1] == "order_scheduled"
    assert str(today) in job.args[2]["text"]
    schedule.driver_notes = "Call first"
    schedule.save()
    assert email_jobs().count() == 1
    schedule.pickup_time_slot = "MIDDAY"
    schedule.save()
    assert email_jobs().count() == 2


@pytestmark_db
def test_welcome_delivery_runs_only_after_commit(create_user, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        user = create_user(email="ada@example.com")
        job = email_jobs().get(idempotency_key=f"email/welcome/{user.pk}")
        assert job.status == Job.Status.PENDING
        assert len(mail.outbox) == 0
    job.refresh_from_db()
    assert job.status == Job.Status.SUCCEEDED
    assert job.attempts == 1
    assert len(mail.outbox) == 1
    # Neither a repeated enqueue nor a scheduled retry can resend a succeeded job.
    from apps.jobs.services import run_job

    with django_capture_on_commit_callbacks(execute=True):
        queue_email(user, "welcome", key=f"welcome/{user.pk}")
    assert run_job(job.pk) == "skipped"
    assert len(mail.outbox) == 1


@pytestmark_db
def test_immediate_delivery_failure_keeps_account_and_retries(
    create_user,
    django_capture_on_commit_callbacks,
):
    from apps.users.models import CustomUser

    with patch("services.email.send_payload", side_effect=requests.Timeout("Provider timed out")):
        with django_capture_on_commit_callbacks(execute=True):
            user = create_user(email="ada@example.com")
    assert CustomUser.objects.filter(pk=user.pk).exists()
    job = email_jobs().get(idempotency_key=f"email/welcome/{user.pk}")
    assert job.status == Job.Status.RETRY
    assert job.attempts == 1
    assert job.run_at > timezone.now()
    assert "timed out" in job.last_error


@pytestmark_db
def test_immediate_email_does_not_drain_unrelated_jobs(
    create_user,
    django_capture_on_commit_callbacks,
):
    from core.jobs import enqueue

    unrelated = enqueue("apps.users.tasks.send_welcome_sms", args=[999999])
    with django_capture_on_commit_callbacks(execute=True):
        create_user(email="ada@example.com")
    unrelated.refresh_from_db()
    assert unrelated.status == Job.Status.PENDING
    assert unrelated.attempts == 0
    assert len(mail.outbox) == 1


@pytestmark_db
def test_rolled_back_transaction_does_not_send(create_user, django_capture_on_commit_callbacks):
    user = create_user()
    user.email = "ada@example.com"
    user.save()
    # The account edit has its own notification email; isolate the rollback event.
    email_jobs().delete()
    with django_capture_on_commit_callbacks(execute=True):
        with pytest.raises(ValueError):
            with transaction.atomic():
                queue_email(user, "welcome", key="rolled-back-immediate")
                raise ValueError("Rollback")
    assert len(mail.outbox) == 0
    assert not email_jobs().exists()


@pytestmark_db
def test_notification_email_has_no_scheduler_only_dispatch_hop(
    create_user,
    django_capture_on_commit_callbacks,
):
    user = create_user(email="ada@example.com")
    email_jobs().delete()
    with django_capture_on_commit_callbacks(execute=True):
        notification = Notification.objects.create(
            user=user,
            notification_type="SYSTEM",
            title="Account update",
            body="Your update",
        )
        job = email_jobs().get(idempotency_key=f"email/notification/{notification.pk}")
        assert job.status == Job.Status.PENDING
    job.refresh_from_db()
    assert job.status == Job.Status.SUCCEEDED
    assert len(mail.outbox) == 1
    assert not Job.objects.filter(task_name=send_email.name).exists()


@pytestmark_db
def test_scheduler_retries_a_failed_immediate_email(create_user):
    from apps.jobs.services import run_due_jobs, run_job

    user = create_user(email="ada@example.com")
    job = email_jobs().get(idempotency_key=f"email/welcome/{user.pk}")
    Job.objects.exclude(pk=job.pk).delete()
    with patch("services.email.send_payload", side_effect=requests.Timeout("Try again")):
        assert run_job(job.pk) == "retried"
    Job.objects.filter(pk=job.pk).update(run_at=timezone.now())
    with patch("apps.jobs.services.enqueue_periodic_jobs"):
        result = run_due_jobs(batch_size=1)
    job.refresh_from_db()
    assert result == {"claimed": 1, "succeeded": 1, "retried": 0, "failed": 0}
    assert job.status == Job.Status.SUCCEEDED
    assert job.attempts == 2
    assert len(mail.outbox) == 1


@pytestmark_db
def test_owner_order_email_attempted_after_commit(
    api_client,
    create_user,
    django_capture_on_commit_callbacks,
):
    user = create_user()
    api_client.force_authenticate(user)
    with override_settings(
        RESEND_API_KEY="test-key", RESEND_FROM="hello@wedemboyz-lavomatique.com"
    ):
        with patch("services.order_email.requests.post") as post:
            post.return_value.json.return_value = {"id": "owner-email-test"}
            with django_capture_on_commit_callbacks(execute=True):
                response = api_client.post(
                    "/api/v1/orders/",
                    {
                        "pickup_address": "Simbock",
                        "delivery_address": "Yaounde",
                        "items": [
                            {"service_type": "LAVAGE_ESSORAGE", "weight_kg": "5", "quantity": 2}
                        ],
                    },
                    format="json",
                )
                post.assert_not_called()
            assert response.status_code == 201
            post.assert_called_once()
            payload = post.call_args.kwargs["json"]
            assert payload["to"] == [
                "owner@wedemboyz-lavomatique.com",
                "dev@wedemboyz-lavomatique.com",
            ]
            assert '/logo.png"' in payload["html"]
    job = Job.objects.get(idempotency_key=f"owner-order-email/{response.data['id']}")
    assert job.status == Job.Status.SUCCEEDED


@pytest.mark.parametrize(
    "domain", ["wedemboyz-lavomatique.com", "updates.wedemboyz-lavomatique.com"]
)
def test_readiness_accepts_root_and_transactional_subdomain(domain):
    from io import StringIO

    from django.core.management import call_command

    with override_settings(
        RESEND_API_KEY="test-key",
        RESEND_FROM=f"Wedemboyz <notifications@{domain}>",
        EMAIL_BACKEND="services.email_backend.EmailBackend",
        FRONTEND_URL="https://wedemboyz-lavomatique.com",
    ):
        call_command("check_email_setup", stdout=StringIO())
