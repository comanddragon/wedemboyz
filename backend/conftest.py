"""Root pytest fixtures shared across all apps' tests."""

import pytest


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient

    return APIClient()


@pytest.fixture
def create_user(db, django_user_model):
    def _create_user(**kwargs):
        defaults = {
            "phone_number": "237677000000",
            "password": "testpass123",
        }
        defaults.update(kwargs)
        password = defaults.pop("password")
        user = django_user_model.objects.create_user(password=password, **defaults)
        return user

    return _create_user
