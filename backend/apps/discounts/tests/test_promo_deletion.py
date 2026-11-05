from datetime import timedelta

import pytest
from django.utils import timezone

from apps.discounts.models import AmbassadorProfile, PromoCode

pytestmark = pytest.mark.django_db


def make_code(code):
    return PromoCode.objects.create(code=code, discount_type="PERCENTAGE", value=5,
        valid_from=timezone.now(), valid_until=timezone.now() + timedelta(days=30))


def test_ordinary_promo_can_be_deleted(api_client, create_user):
    owner = create_user(is_staff=True, is_superuser=True)
    api_client.force_authenticate(owner)
    promo = make_code("ORDINARY")
    response = api_client.delete(f"/api/v1/discounts/promo-codes/{promo.pk}/")
    assert response.status_code == 204
    assert not PromoCode.objects.filter(pk=promo.pk).exists()


def test_ambassador_promo_returns_actionable_conflict_and_preserves_balance(api_client, create_user):
    owner = create_user(is_staff=True, is_superuser=True)
    ambassador = create_user(phone_number="237699111222")
    promo = make_code("AMBASSADOR")
    profile = AmbassadorProfile.objects.create(user=ambassador, promo_code=promo, credit_balance=800)
    api_client.force_authenticate(owner)
    response = api_client.delete(f"/api/v1/discounts/promo-codes/{promo.pk}/")
    assert response.status_code == 409
    assert "Pause" in str(response.data)
    profile.refresh_from_db()
    assert profile.credit_balance == 800
    assert profile.promo_code_id == promo.pk
    response = api_client.patch(f"/api/v1/discounts/promo-codes/{promo.pk}/", {"is_active": False}, format="json")
    assert response.status_code == 200
    promo.refresh_from_db()
    assert not promo.is_active
