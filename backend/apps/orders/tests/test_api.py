import base64
from datetime import timedelta
from decimal import Decimal

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
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


class TestOrderPlacementOptions:
    def test_stores_fulfillment_and_payment_options(self, auth_client):
        client, _ = auth_client
        payload = {
            **VALID_ORDER_PAYLOAD,
            "fulfillment_type": "DROP_OFF",
            "payment_option": "PAY_AFTER_DELIVERY",
        }

        response = client.post("/api/v1/orders/", payload, format="json")

        assert response.status_code == 201, response.data
        assert response.data["fulfillment_type"] == "DROP_OFF"
        assert response.data["payment_option"] == "PAY_AFTER_DELIVERY"

    def test_accepts_multiple_photos_for_one_item(self, auth_client):
        client, _ = auth_client
        image = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
        )
        payload = {
            "pickup_address": VALID_ORDER_PAYLOAD["pickup_address"],
            "delivery_address": VALID_ORDER_PAYLOAD["delivery_address"],
            "fulfillment_type": "PICKUP",
            "payment_option": "PAY_AT_PICKUP",
            "items": '[{"service_type":"LAVAGE_ESSORAGE","weight_kg":"5.0","quantity":1}]',
            "item_photo_0_0": SimpleUploadedFile("front.png", image, content_type="image/png"),
            "item_photo_0_1": SimpleUploadedFile("stain.png", image, content_type="image/png"),
        }

        response = client.post("/api/v1/orders/", payload, format="multipart")

        assert response.status_code == 201, response.data
        assert len(response.data["items"][0]["photos"]) == 2
        listed = client.get("/api/v1/orders/")
        assert listed.status_code == 200
        previews = listed.data["results"][0]["items"]
        assert len(previews[0]["photos"]) == 2
        assert previews[0]["photos"][0]["image"].endswith(".png")
        # A different customer cannot view this order or its item gallery.
        from apps.users.models import CustomUser
        other = CustomUser.objects.create_user(phone_number="237677300099", password="testpass")
        client.force_authenticate(other)
        assert client.get(f"/api/v1/orders/{response.data['id']}/").status_code == 404
        assert client.get("/api/v1/orders/").data["results"] == []
