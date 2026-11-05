from decimal import Decimal

import pytest

from apps.jobs.models import Job
from apps.orders.models import Order, OrderItem
from apps.payments.models import Payment
from services.email_events import order_email, payment_email


@pytest.mark.django_db
def test_submission_issues_itemized_invoice_once(create_user):
    user = create_user(email="customer@example.com")
    order = Order.objects.create(user=user, total_amount=1000)
    OrderItem.objects.create(
        order=order,
        service_type="LAVAGE_ESSORAGE",
        label="Shirts",
        quantity=2,
        unit_price=500,
    )
    order.subtotal = Decimal("1000")
    order.save(update_fields=["subtotal"])
    order_email(order, received=True)
    order_email(order, received=True)
    job = Job.objects.get(idempotency_key=f"email/invoice/{order.invoice.pk}/issued")
    payload = job.args[2]
    assert "Shirts" in payload["text"]
    assert "1000 XAF" in payload["text"]
    assert order.invoice.invoice_number in payload["text"]
    assert job.args[4] is True


@pytest.mark.django_db
def test_partial_payment_receipt_has_current_balance_and_stable_number(create_user):
    order = Order.objects.create(
        user=create_user(email="customer@example.com"),
        total_amount=1000,
    )
    payment = Payment.objects.create(
        order=order,
        amount=400,
        currency="XAF",
        gateway="CASH",
        status="SUCCEEDED",
    )
    payment_email(payment)
    job = Job.objects.get(idempotency_key=f"email/payment/{payment.pk}/payment_receipt")
    assert f"REC-{payment.pk:06d}" in job.args[2]["text"]
    assert "600 XAF" in job.args[2]["text"]
    assert order.invoice.invoice_number in job.args[2]["text"]


@pytest.mark.django_db
def test_invoice_without_email_does_not_queue_delivery(create_user):
    order = Order.objects.create(user=create_user(), total_amount=1000)
    order_email(order, received=True)
    assert not Job.objects.filter(idempotency_key__startswith="email/invoice/").exists()
