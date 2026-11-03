from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

import pytest
from django.core.cache import cache
from django.test import override_settings
from rest_framework_simplejwt.tokens import RefreshToken

from apps.jobs.models import Job

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def clear_throttle():
    cache.clear()


def request_link(api_client, user):
    return api_client.post(
        "/api/v1/auth/password/reset/", {"email": user.email, "phone_number": user.phone_number}
    )


def reset_data(user):
    job = Job.objects.get(idempotency_key__startswith=f"email/password-reset/{user.pk}/")
    text = job.args[2]["text"]
    url = next(line.split(": ", 1)[1] for line in text.splitlines() if "/reset-password?" in line)
    query = parse_qs(urlparse(url).query)
    return {
        "uid": query["uid"][0],
        "token": query["token"][0],
        "password": "New-strong-42-password!",
    }


def test_recovery_does_not_disclose_accounts(api_client, create_user):
    user = create_user(email="ada@example.com")
    existing = request_link(api_client, user)
    unknown = api_client.post(
        "/api/v1/auth/password/reset/",
        {"email": "unknown@example.com", "phone_number": "237677111111"},
    )
    assert existing.status_code == unknown.status_code == 200
    assert existing.data == unknown.data
    assert Job.objects.filter(idempotency_key__startswith="email/password-reset/").count() == 1


def test_reset_changes_password_invalidates_tokens_and_sends_confirmation(api_client, create_user):
    user = create_user(email="ada@example.com")
    old_refresh = RefreshToken.for_user(user)
    old_access = str(old_refresh.access_token)
    assert request_link(api_client, user).status_code == 200
    data = reset_data(user)
    response = api_client.post("/api/v1/auth/password/reset/confirm/", data)
    assert response.status_code == 200, response.data
    user.refresh_from_db()
    assert user.check_password(data["password"])
    assert api_client.post("/api/v1/auth/password/reset/confirm/", data).status_code == 400
    assert (
        api_client.post("/api/v1/auth/token/refresh/", {"refresh": str(old_refresh)}).status_code
        == 401
    )
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {old_access}")
    assert api_client.get("/api/v1/users/me/").status_code == 401
    job = Job.objects.get(idempotency_key__startswith=f"email/password-changed/{user.pk}/")
    assert job.args[1] == "password_changed" and job.args[-1] is True


def test_invalid_and_expired_links_are_rejected(api_client, create_user):
    user = create_user(email="ada@example.com")
    request_link(api_client, user)
    data = reset_data(user)
    with override_settings(PASSWORD_RESET_TIMEOUT=0):
        from django.contrib.auth.tokens import default_token_generator

        original = default_token_generator._now
        from datetime import timedelta

        with patch.object(
            default_token_generator, "_now", side_effect=lambda: original() + timedelta(seconds=2)
        ):
            assert api_client.post("/api/v1/auth/password/reset/confirm/", data).status_code == 400
    data["uid"] = "bad-uid"
    assert api_client.post("/api/v1/auth/password/reset/confirm/", data).status_code == 400
    user.refresh_from_db()
    assert user.check_password("testpass123")


def test_password_validation_and_throttle(api_client, create_user):
    user = create_user(email="ada@example.com")
    request_link(api_client, user)
    data = reset_data(user)
    data["password"] = "password"
    assert api_client.post("/api/v1/auth/password/reset/confirm/", data).status_code == 400
    for _ in range(3):
        assert request_link(api_client, user).status_code == 200
    assert request_link(api_client, user).status_code == 429
