from datetime import timedelta
from decimal import Decimal
from io import StringIO

import pytest
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient

from apps.discounts.models import AmbassadorCredit, AmbassadorProfile, PromoCode, PromoUsage
from apps.orders.models import Order
from apps.users.models import CustomUser
from services.loyalty import award_ambassador_credit


@pytest.fixture
def referral(db):
    ambassador_user = CustomUser.objects.create_user(phone_number="237677222001", password="pass")
    customer = CustomUser.objects.create_user(phone_number="237677222002", password="pass")
    promo = PromoCode.objects.create(code="REPAIR", discount_type="FIXED", value=0,
        valid_from=timezone.now(), valid_until=timezone.now() + timedelta(days=365))
    ambassador = AmbassadorProfile.objects.create(user=ambassador_user, promo_code=promo)
    order = Order.objects.create(user=customer, pickup_address="A", delivery_address="B", delivery_fee=1500, total_amount=1500)
    usage = PromoUsage.objects.create(promo_code=promo, user=customer, order=order, discount_applied=0)
    return ambassador, order, usage


def test_intake_total_awards_credits_and_api_exposes_balance(referral):
    ambassador, order, usage = referral
    assert not AmbassadorCredit.objects.filter(order=order).exists()
    order.total_amount = Decimal("11500")
    order.save(update_fields=["total_amount"])
    award_ambassador_credit(usage)
    ambassador.refresh_from_db()
    assert ambassador.credit_balance == ambassador.lifetime_credits == 500
    assert AmbassadorCredit.objects.filter(order=order).count() == 1
    client = APIClient()
    client.force_authenticate(ambassador.user)
    response = client.get("/api/v1/loyalty/")
    assert response.status_code == 200
    assert Decimal(response.data["ambassador"]["credit_balance"]) == 500
    response = client.get("/api/v1/loyalty/ambassadors/leaderboard/?period=all")
    assert response.data["results"][0]["period_credits"] == 500


def test_backfill_dry_run_apply_and_rerun_preserve_cashouts_and_order_month(referral):
    ambassador, order, usage = referral
    historical = timezone.now() - timedelta(days=70)
    Order.objects.filter(pk=order.pk).update(total_amount=11500, created_at=historical)
    AmbassadorCredit.objects.create(ambassador=ambassador, order=order, order_amount=0, credit_amount=0)
    ambassador.credit_balance = 20
    ambassador.lifetime_credits = 1000
    ambassador.is_active = False
    ambassador.save()
    output = StringIO()
    call_command("backfill_ambassador_credits", stdout=output)
    assert "500 credits added" in output.getvalue()
    ambassador.refresh_from_db()
    assert ambassador.credit_balance == 20
    call_command("backfill_ambassador_credits", apply=True, stdout=StringIO())
    call_command("backfill_ambassador_credits", apply=True, stdout=StringIO())
    ambassador.refresh_from_db()
    assert ambassador.credit_balance == 520
    assert ambassador.lifetime_credits == 1500


def test_missing_historical_award_uses_order_date(referral):
    ambassador, order, usage = referral
    historical = timezone.now() - timedelta(days=70)
    Order.objects.filter(pk=order.pk).update(total_amount=11500, created_at=historical)
    call_command("backfill_ambassador_credits", apply=True, stdout=StringIO())
    assert AmbassadorCredit.objects.get(order=order).created_at == historical


@pytest.mark.parametrize("excluded", ["cancelled", "seed", "staff", "deleted"])
def test_backfill_excludes_non_client_and_cancelled_orders(referral, excluded):
    ambassador, order, usage = referral
    Order.objects.filter(pk=order.pk).update(total_amount=11500)
    if excluded == "cancelled":
        Order.objects.filter(pk=order.pk).update(status="CANCELLED")
    elif excluded == "deleted":
        Order.objects.filter(pk=order.pk).update(deleted_at=timezone.now())
    elif excluded == "seed":
        order.user.email = "client@seed.wedemboyz.invalid"
        order.user.save()
    else:
        order.user.is_staff = True
        order.user.save()
    call_command("backfill_ambassador_credits", apply=True, stdout=StringIO())
    assert not AmbassadorCredit.objects.filter(order=order).exists()
