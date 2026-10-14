"""Unit tests for services.billing.campay_gateway — specifically that
initiate_collection() calls CamPay's /api/collect/ endpoint directly (not
the bundled campay SDK's Client.initCollect, which silently drops any
field it doesn't already know about) so the optional user-identity fields
actually reach CamPay."""

from unittest.mock import MagicMock, patch

import pytest

from services.billing import campay_gateway

pytestmark = pytest.mark.django_db


@pytest.fixture
def mock_campay_client():
    """Patches services.billing.campay_gateway._client() so no real
    /api/token/ call is made, and captures the requests.post call to
    /api/collect/."""
    with patch("services.billing.campay_gateway._client") as mock_client_factory:
        client = MagicMock()
        client.host = "https://demo.campay.net"
        client.get_token.return_value = {"token": "fake-token", "is_successful": True}
        mock_client_factory.return_value = client

        with patch("requests.post") as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = {
                "reference": "cp_ref_abc",
                "ussd_code": "*126#",
            }
            yield mock_post


class TestInitiateCollection:
    def test_sends_core_fields(self, mock_campay_client):
        result = campay_gateway.initiate_collection(
            amount=25,
            phone_number="237677300001",
            description="WEDEMBOYZ Lavomatique — Order #5409",
            external_reference="order-5409",
        )

        assert result == {"reference": "cp_ref_abc", "ussd_code": "*126#"}
        mock_campay_client.assert_called_once()
        call = mock_campay_client.call_args
        assert call.args[0] == "https://demo.campay.net/api/collect/"
        payload = call.kwargs["json"]
        assert payload["amount"] == "25"
        assert payload["currency"] == "XAF"
        assert payload["from"] == "237677300001"
        assert payload["external_reference"] == "order-5409"
        assert call.kwargs["headers"]["Authorization"] == "Token fake-token"

    def test_forwards_user_identity_when_present(self, mock_campay_client, create_user):
        user = create_user(
            phone_number="237677300099",
            email="ada@example.com",
            first_name="Ada",
            last_name="Lovelace",
        )

        campay_gateway.initiate_collection(
            amount=25,
            phone_number="237677300001",
            description="test",
            external_reference="order-1",
            user=user,
        )

        payload = mock_campay_client.call_args.kwargs["json"]
        assert payload["external_user"] == str(user.pk)
        assert payload["extra_email"] == "ada@example.com"
        assert payload["extra_first_name"] == "Ada"
        assert payload["extra_last_name"] == "Lovelace"

    def test_omits_user_identity_when_absent(self, mock_campay_client):
        campay_gateway.initiate_collection(
            amount=25,
            phone_number="237677300001",
            description="test",
            external_reference="order-1",
        )

        payload = mock_campay_client.call_args.kwargs["json"]
        assert "external_user" not in payload
        assert "extra_email" not in payload
        assert "extra_first_name" not in payload
        assert "extra_last_name" not in payload

    def test_blank_user_fields_are_not_sent(self, mock_campay_client, create_user):
        user = create_user(phone_number="237677300098")  # no email/first_name/last_name

        campay_gateway.initiate_collection(
            amount=25,
            phone_number="237677300001",
            description="test",
            external_reference="order-1",
            user=user,
        )

        payload = mock_campay_client.call_args.kwargs["json"]
        assert payload["external_user"] == str(user.pk)
        assert "extra_email" not in payload
        assert "extra_first_name" not in payload
        assert "extra_last_name" not in payload

    def test_raises_on_failure_response(self, mock_campay_client):
        mock_campay_client.return_value.status_code = 400
        mock_campay_client.return_value.json.return_value = {
            "status": "FAILED",
            "message": "Invalid phone number.",
        }

        with pytest.raises(campay_gateway.CamPayAPIError, match="Invalid phone number."):
            campay_gateway.initiate_collection(
                amount=25,
                phone_number="bad-number",
                description="test",
                external_reference="order-1",
            )
