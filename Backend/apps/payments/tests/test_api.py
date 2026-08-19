from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from apps.payments.models import Subscription

pytestmark = pytest.mark.django_db


@pytest.fixture
def auth_client(create_user):
    user = create_user(phone_number="237677200001")
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


class TestSubscriptionCreate:
    def test_creates_pending_subscription_with_no_allowance(self, auth_client):
        client, user = auth_client
        resp = client.post(
            "/api/v1/subscriptions/", {"plan": "ESSENTIEL", "billing_cycle": "ONE_TIME"}, format="json"
        )
        assert resp.status_code == 201, resp.data
        assert resp.data["status"] == "PENDING"
        assert Subscription.objects.get(pk=resp.data["id"]).kg_remaining == 0

    def test_defaults_to_one_time_billing(self, auth_client):
        client, user = auth_client
        resp = client.post("/api/v1/subscriptions/", {"plan": "CONFORT"}, format="json")
        assert resp.status_code == 201, resp.data
        assert resp.data["billing_cycle"] == "ONE_TIME"


class TestSubscriptionCheckoutGatewayValidation:
    def _pending_subscription(self, user, billing_cycle):
        from datetime import timedelta

        from django.utils import timezone

        today = timezone.localdate()
        return Subscription.objects.create(
            user=user,
            plan=Subscription.Plan.ESSENTIEL,
            billing_cycle=billing_cycle,
            status=Subscription.Status.PENDING,
            start_date=today,
            end_date=today + timedelta(days=30),
        )

    def test_monthly_rejects_mtn_momo(self, auth_client):
        client, user = auth_client
        sub = self._pending_subscription(user, Subscription.BillingCycle.MONTHLY)
        resp = client.post(f"/api/v1/subscriptions/{sub.pk}/checkout/", {"gateway": "MTN_MOMO"}, format="json")
        assert resp.status_code == 400
        assert "gateway" in resp.data["error"]["detail"]

    def test_monthly_rejects_orange_money(self, auth_client):
        client, user = auth_client
        sub = self._pending_subscription(user, Subscription.BillingCycle.MONTHLY)
        resp = client.post(f"/api/v1/subscriptions/{sub.pk}/checkout/", {"gateway": "ORANGE_MONEY"}, format="json")
        assert resp.status_code == 400

    @patch("services.billing.campay_gateway.initiate_collection")
    def test_one_time_allows_mtn_momo(self, mock_initiate, auth_client):
        mock_initiate.return_value = {"reference": "cp_ref_123", "ussd_code": "*126#", "operator": "MTN"}
        client, user = auth_client
        sub = self._pending_subscription(user, Subscription.BillingCycle.ONE_TIME)
        resp = client.post(f"/api/v1/subscriptions/{sub.pk}/checkout/", {"gateway": "MTN_MOMO"}, format="json")
        assert resp.status_code == 201, resp.data
        sub.refresh_from_db()
        assert sub.gateway == "MTN_MOMO"

    @patch("services.billing.stripe_gateway.stripe.checkout.Session.create")
    def test_monthly_stripe_creates_checkout_session(self, mock_create, auth_client, settings):
        settings.STRIPE_PRICE_ID_ESSENTIEL = "price_test_essentiel"

        class FakeSession:
            id = "cs_test_123"
            url = "https://checkout.stripe.com/cs_test_123"

        mock_create.return_value = FakeSession()

        client, user = auth_client
        sub = self._pending_subscription(user, Subscription.BillingCycle.MONTHLY)
        resp = client.post(f"/api/v1/subscriptions/{sub.pk}/checkout/", {"gateway": "STRIPE"}, format="json")

        assert resp.status_code == 201, resp.data
        assert resp.data["checkout_url"] == "https://checkout.stripe.com/cs_test_123"
        mock_create.assert_called_once()
        assert mock_create.call_args.kwargs["mode"] == "subscription"

    def test_rejects_checkout_on_already_active_subscription(self, auth_client):
        from datetime import timedelta

        from django.utils import timezone

        client, user = auth_client
        today = timezone.localdate()
        sub = Subscription.objects.create(
            user=user,
            plan=Subscription.Plan.ESSENTIEL,
            status=Subscription.Status.ACTIVE,
            start_date=today,
            end_date=today + timedelta(days=30),
        )
        resp = client.post(f"/api/v1/subscriptions/{sub.pk}/checkout/", {"gateway": "STRIPE"}, format="json")
        assert resp.status_code == 400
