from unittest.mock import patch

import pytest
from django.contrib.auth import authenticate
from django.db import connection
from django.test.utils import CaptureQueriesContext

from apps.users.models import CustomUser

pytestmark = pytest.mark.django_db


def test_authentication_preloads_payload_relations(create_user, django_assert_num_queries):
    user = create_user()
    with django_assert_num_queries(1):
        authenticated = authenticate(phone_number=user.phone_number, password="testpass123")
        assert authenticated.pk == user.pk
        assert authenticated.profile.pk == user.profile.pk
        assert getattr(authenticated, "staff_profile", None) is None
        assert getattr(authenticated, "ambassador_profile", None) is None


def test_login_preserves_security_without_last_login_write(api_client, create_user):
    user = create_user()
    with CaptureQueriesContext(connection) as queries:
        response = api_client.post("/api/v1/auth/login/", {
            "phone_number": user.phone_number, "password": "testpass123",
        })
    assert response.status_code == 200
    assert response.json()["data"]["refresh"]
    assert not any('UPDATE "users_customuser"' in query["sql"] for query in queries)
    user.refresh_from_db()
    assert user.last_login is None
    for password, active in [("wrong-password", True), ("testpass123", False)]:
        user.is_active = active
        user.save(update_fields=["is_active"])
        response = api_client.post("/api/v1/auth/login/", {
            "phone_number": user.phone_number, "password": password,
        })
        assert response.status_code == 401


def test_registration_creates_relations_and_defers_sms(
    api_client, django_capture_on_commit_callbacks,
):
    with patch("apps.users.tasks.send_welcome_sms.delay") as enqueue:
        with django_capture_on_commit_callbacks(execute=True):
            response = api_client.post("/api/v1/auth/register/", {
                "phone_number": "677123456", "password": "S3cure-pass!",
                "password2": "S3cure-pass!", "first_name": "Ada", "email": "ada@example.com",
            })
            enqueue.assert_not_called()
        assert response.status_code == 201, response.content
        user = CustomUser.objects.get(pk=response.json()["data"]["user"]["id"])
        assert user.profile.pk and user.loyalty_account.pk
        assert user.check_password("S3cure-pass!")
        enqueue.assert_called_once_with(user.pk)


def test_guests_do_not_enqueue_welcome_sms(api_client, django_capture_on_commit_callbacks):
    with patch("apps.users.tasks.send_welcome_sms.delay") as enqueue:
        with django_capture_on_commit_callbacks(execute=True):
            response = api_client.post("/api/v1/auth/guest/", {})
        assert response.status_code == 201
        enqueue.assert_not_called()


@pytest.mark.parametrize("email", [None, "", "   ", "not-an-email"])
def test_signup_rejects_invalid_email(api_client, email):
    response = api_client.post(
        "/api/v1/auth/register/",
        {
            "phone_number": "677123456",
            "password": "S3cure-pass!",
            "password2": "S3cure-pass!",
            "email": email,
        },
        format="json",
    )
    assert response.status_code == 400
    assert "email" in response.data["error"]["detail"]
    assert not CustomUser.objects.filter(phone_number="237677123456").exists()


def test_signup_requires_email_even_when_client_omits_it(api_client):
    response = api_client.post(
        "/api/v1/auth/register/",
        {
            "phone_number": "677123456",
            "password": "S3cure-pass!",
            "password2": "S3cure-pass!",
        },
        format="json",
    )
    assert response.status_code == 400
    assert "email" in response.data["error"]["detail"]
    assert not CustomUser.objects.filter(phone_number="237677123456").exists()


def test_signup_accepts_and_trims_valid_email(api_client):
    response = api_client.post(
        "/api/v1/auth/register/",
        {
            "phone_number": "677123456",
            "password": "S3cure-pass!",
            "password2": "S3cure-pass!",
            "email": " ada@example.com ",
        },
        format="json",
    )
    assert response.status_code == 201, response.data
    assert CustomUser.objects.get(phone_number="237677123456").email == "ada@example.com"
