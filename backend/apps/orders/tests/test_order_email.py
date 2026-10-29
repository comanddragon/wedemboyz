from unittest.mock import patch

import pytest
import requests
from django.test import override_settings

from apps.jobs.models import Job
from core.jobs import RetryJob
from apps.orders.tasks import send_owner_order_email
from services.order_email import send_order_email


@pytest.mark.django_db
def test_order_submission_queues_owner_email(api_client, create_user):
    user = create_user(first_name="Mary")
    api_client.force_authenticate(user)
    response = api_client.post("/api/v1/orders/", {
        "pickup_address": "Simbock",
        "delivery_address": "Yaounde",
        "notes": "Handle gently",
        "items": [{"service_type": "LAVAGE_ESSORAGE", "weight_kg": "5", "quantity": 2}],
    }, format="json")
    assert response.status_code == 201, response.data
    job = Job.objects.get(task_name=send_owner_order_email.name)
    payload = job.args[1]
    assert payload["to"] == ["ntsemancho@gmail.com"]
    assert response.data["ticket_number"] in payload["subject"]
    assert "Mary" in payload["text"]
    assert "2 x" in payload["text"]
    assert "Handle gently" in payload["text"]
    assert "Simbock" in payload["text"]
    assert job.max_attempts == 4


@override_settings(RESEND_API_KEY="test-key", RESEND_FROM="Orders <orders@example.com>")
def test_resend_request():
    payload = {"to": ["ntsemancho@gmail.com"], "subject": "Order", "text": "Details"}
    with patch("services.order_email.requests.post") as post:
        post.return_value.json.return_value = {"id": "email-123"}
        assert send_order_email(42, payload) == "email-123"
    assert post.call_args.kwargs["headers"]["Idempotency-Key"] == "owner-order/42"
    assert post.call_args.kwargs["json"] == {"from": "Orders <orders@example.com>", **payload}
    post.return_value.raise_for_status.assert_called_once()


def test_delivery_failure_retries():
    with patch("services.order_email.send_order_email", side_effect=requests.Timeout):
        with pytest.raises(RetryJob):
            send_owner_order_email(42, {})
