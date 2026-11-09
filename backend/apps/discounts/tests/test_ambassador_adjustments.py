from datetime import datetime, timezone as dt_timezone

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.discounts.api.serializers.loyalty import AmbassadorCreateSerializer
from apps.discounts.models import AmbassadorCredit, AmbassadorCreditAdjustment
from apps.orders.models import Order
from apps.users.models import CustomUser

pytestmark = pytest.mark.django_db


@pytest.fixture
def manual_credits():
    user = CustomUser.objects.create_user(phone_number="237677333001", password="pass")
    owner = CustomUser.objects.create_superuser(phone_number="237677333002", password="pass")
    serializer = AmbassadorCreateSerializer(data={"user_id": user.pk})
    serializer.is_valid(raise_exception=True)
    profile = serializer.save()
    client = APIClient()
    client.force_authenticate(owner)
    return profile, client


def edit(profile, client, balance):
    return client.patch(f"/api/v1/loyalty/admin/ambassadors/{profile.pk}/", {"credit_balance": balance})


def test_repeated_save_does_not_double_count_manual_credits(manual_credits):
    profile, client = manual_credits
    before = timezone.now()
    assert edit(profile, client, 1500).status_code == 200
    assert edit(profile, client, 1500).status_code == 200
    row = AmbassadorCreditAdjustment.objects.get(ambassador=profile)
    assert before <= row.created_at <= timezone.now()
    assert row.amount == 1500
    assert edit(profile, client, 1700).status_code == 200
    assert list(profile.credit_adjustments.order_by("pk").values_list("amount", flat=True)) == [1500, 200]
    result = client.get("/api/v1/loyalty/ambassadors/leaderboard/?period=all").data["results"][0]
    assert result["period_credits"] == 1700
    assert result["orders"] == 0
    assert result["referred_revenue"] == 0
    other = CustomUser.objects.create_user(phone_number="237677333003", password="pass")
    serializer = AmbassadorCreateSerializer(data={"user_id": other.pk})
    serializer.is_valid(raise_exception=True)
    competitor = serializer.save()
    assert edit(competitor, client, 1800).status_code == 200
    for period in ("month", "year", "all"):
        rows = client.get(f"/api/v1/loyalty/ambassadors/leaderboard/?period={period}").data["results"]
        assert rows[0]["ambassador"]["id"] == competitor.pk
        assert rows[0]["rank"] == 1
        assert rows[1]["ambassador"]["id"] == profile.pk


def test_manual_and_referral_credits_follow_month_year_and_local_timezone(manual_credits):
    profile, client = manual_credits
    assert edit(profile, client, 1000).status_code == 200
    first = profile.credit_adjustments.get()
    # 00:30 on Jan 1 in Cameroon: must count in January 2026, not December 2025.
    profile.credit_adjustments.filter(pk=first.pk).update(
        created_at=datetime(2025, 12, 31, 23, 30, tzinfo=dt_timezone.utc)
    )
    assert edit(profile, client, 1400).status_code == 200
    profile.credit_adjustments.exclude(pk=first.pk).update(
        created_at=datetime(2026, 2, 15, 12, tzinfo=dt_timezone.utc)
    )
    assert edit(profile, client, 1300).status_code == 200
    last = profile.credit_adjustments.order_by("pk").last()
    profile.credit_adjustments.filter(pk=last.pk).update(
        created_at=datetime(2026, 2, 16, 12, tzinfo=dt_timezone.utc)
    )
    order = Order.objects.create(user=profile.user, pickup_address="A", delivery_address="B")
    credit = AmbassadorCredit.objects.create(ambassador=profile, order=order, order_amount=2000, credit_amount=100)
    AmbassadorCredit.objects.filter(pk=credit.pk).update(created_at=datetime(2026, 2, 15, 12, tzinfo=dt_timezone.utc))
    for query, expected in [
        ("period=month&year=2025&month=12", 0),
        ("period=month&year=2026&month=1", 1000),
        ("period=month&year=2026&month=2", 400),
        ("period=year&year=2026", 1400),
        ("period=all", 1400),
    ]:
        response = client.get(f"/api/v1/loyalty/ambassadors/leaderboard/?{query}")
        assert response.status_code == 200
        assert response.data["results"][0]["period_credits"] == expected


def test_invalid_combined_edit_rolls_back_balance_and_adjustment(manual_credits):
    profile, client = manual_credits
    response = client.patch(f"/api/v1/loyalty/admin/ambassadors/{profile.pk}/", {
        "credit_balance": 1000, "promo_code": "bad code!",
    })
    assert response.status_code == 400
    profile.refresh_from_db()
    assert profile.credit_balance == 0
    assert not profile.credit_adjustments.exists()
