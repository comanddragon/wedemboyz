from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.payments.models import Subscription

pytestmark = pytest.mark.django_db

VALID_ORDER_PAYLOAD = {
    "pickup_address": "123 Rue de la Paix, Bamenda",
    "delivery_address": "123 Rue de la Paix, Bamenda",
    "items": [{"service_type": "LAVAGE_ESSORAGE", "weight_kg": "5.0", "quantity": 1}],
}


@pytest.fixture
def auth_client(create_user):
    user = create_user(phone_number="237677300001")
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def _active_subscription(user, **kwargs):
    today = timezone.localdate()
    defaults = dict(
        user=user,
        plan=Subscription.Plan.ESSENTIEL,
        status=Subscription.Status.ACTIVE,
        kg_remaining=Decimal("10"),
        start_date=today,
        end_date=today + timedelta(days=30),
    )
    defaults.update(kwargs)
    return Subscription.objects.create(**defaults)


class TestOrderConsumesSubscription:
    def test_order_is_free_and_decrements_subscription_when_active(self, auth_client):
        client, user = auth_client
        sub = _active_subscription(user, kg_remaining=Decimal("10"))

        resp = client.post("/api/v1/orders/", VALID_ORDER_PAYLOAD, format="json")

        assert resp.status_code == 201, resp.data
        assert resp.data["total_amount"] == "0"
        assert resp.data["subscription"] == sub.pk

        sub.refresh_from_db()
        assert sub.kg_remaining == Decimal("5")  # 10kg allowance - 5kg order weight

    def test_order_charges_normally_with_no_active_subscription(self, auth_client):
        client, user = auth_client

        resp = client.post("/api/v1/orders/", VALID_ORDER_PAYLOAD, format="json")

        assert resp.status_code == 201, resp.data
        assert resp.data["subscription"] is None
        assert float(resp.data["total_amount"]) > 0

    def test_order_ignores_exhausted_subscription(self, auth_client):
        client, user = auth_client
        _active_subscription(user, kg_remaining=Decimal("0"))

        resp = client.post("/api/v1/orders/", VALID_ORDER_PAYLOAD, format="json")

        assert resp.status_code == 201, resp.data
        assert resp.data["subscription"] is None
        assert float(resp.data["total_amount"]) > 0

    def test_use_subscription_false_forces_normal_payment(self, auth_client):
        client, user = auth_client
        sub = _active_subscription(user, kg_remaining=Decimal("10"))

        payload = {**VALID_ORDER_PAYLOAD, "use_subscription": False}
        resp = client.post("/api/v1/orders/", payload, format="json")

        assert resp.status_code == 201, resp.data
        assert resp.data["subscription"] is None
        assert float(resp.data["total_amount"]) > 0

        sub.refresh_from_db()
        assert sub.kg_remaining == Decimal("10")  # untouched
