import pytest
from rest_framework.test import APIClient

from apps.orders.models import Order
from apps.users.models import CustomUser
from core.utils import contact_phone, is_guest_placeholder_phone

pytestmark = pytest.mark.django_db

GUEST_URL = "/api/v1/auth/guest/"
CLAIM_URL = "/api/v1/auth/guest/claim/"


def _guest_client(**payload):
    client = APIClient()
    res = client.post(GUEST_URL, payload, format="json")
    assert res.status_code == 201, res.content
    data = res.json()["data"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {data['access']}")
    return client, data


def test_guest_session_creates_guest_user_with_tokens():
    _, data = _guest_client(first_name="Ada", contact_phone="677123456")
    user = CustomUser.objects.get(pk=data["user"]["id"])
    assert user.is_guest and not user.has_usable_password()
    assert is_guest_placeholder_phone(user.phone_number)
    assert data["user"]["is_guest"] is True
    assert contact_phone(user) == "237677123456"


def test_guest_can_create_order_and_read_it_back():
    client, data = _guest_client()
    res = client.post(
        "/api/v1/orders/",
        {
            "pickup_address": "Rue 1",
            "delivery_address": "Rue 1",
            "items": [{"service_type": "TSHIRT", "label": "Tee", "weight_kg": 1, "quantity": 2}],
        },
        format="json",
    )
    assert res.status_code == 201, res.content
    assert Order.objects.get(pk=res.json()["data"]["id"]).user_id == data["user"]["id"]


def test_guest_refresh_token_is_long_lived_and_survives_rotation():
    client, data = _guest_client()
    res = client.post("/api/v1/auth/token/refresh/", {"refresh": data["refresh"]}, format="json")
    assert res.status_code == 200, res.content
    from rest_framework_simplejwt.tokens import RefreshToken

    new = RefreshToken(res.json()["data"]["refresh"])
    assert new.get("guest") is True
    assert new["exp"] - new["iat"] > 30 * 24 * 3600


def test_claiming_keeps_the_same_user_and_orders():
    client, data = _guest_client()
    order_res = client.post(
        "/api/v1/orders/",
        {"pickup_address": "A", "delivery_address": "B",
         "items": [{"service_type": "TSHIRT", "label": "Tee", "weight_kg": 1, "quantity": 1}]},
        format="json",
    )
    order_id = order_res.json()["data"]["id"]

    res = client.post(
        CLAIM_URL,
        {"phone_number": "677000111", "first_name": "Ada", "password": "S3cure-pass!", "password2": "S3cure-pass!"},
        format="json",
    )
    assert res.status_code == 200, res.content
    user = CustomUser.objects.get(pk=data["user"]["id"])
    assert not user.is_guest and user.phone_number == "237677000111"
    assert Order.objects.get(pk=order_id).user_id == user.pk

    login = APIClient().post(
        "/api/v1/auth/login/", {"phone_number": "677000111", "password": "S3cure-pass!"}, format="json"
    )
    assert login.status_code == 200


def test_claim_rejects_phone_already_registered():
    CustomUser.objects.create_user(phone_number="677000222", password="x-Long-pass-1")
    client, _ = _guest_client()
    res = client.post(
        CLAIM_URL,
        {"phone_number": "677000222", "password": "S3cure-pass!", "password2": "S3cure-pass!"},
        format="json",
    )
    assert res.status_code == 400


def test_registered_user_cannot_claim():
    CustomUser.objects.create_user(phone_number="677000333", password="S3cure-pass!")
    client = APIClient()
    tok = client.post("/api/v1/auth/login/", {"phone_number": "677000333", "password": "S3cure-pass!"}, format="json").json()["data"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tok['access']}")
    res = client.post(CLAIM_URL, {"phone_number": "677000444", "password": "S3cure-pass!", "password2": "S3cure-pass!"}, format="json")
    assert res.status_code == 400


def test_register_from_another_session_reconnects_guest_orders_by_contact_phone():
    guest_client, data = _guest_client(contact_phone="677000555")
    order_res = guest_client.post(
        "/api/v1/orders/",
        {"pickup_address": "A", "delivery_address": "B",
         "items": [{"service_type": "TSHIRT", "label": "Tee", "weight_kg": 1, "quantity": 2}]},
        format="json",
    )

    register = APIClient().post(
        "/api/v1/auth/register/",
        {"phone_number": "677000555", "first_name": "Ada",
         "password": "S3cure-pass!", "password2": "S3cure-pass!"},
        format="json",
    )

    assert register.status_code == 201, register.content
    user = CustomUser.objects.get(pk=data["user"]["id"])
    assert user.phone_number == "237677000555" and not user.is_guest
    assert Order.objects.get(pk=order_res.json()["data"]["id"]).user_id == user.pk


def test_sms_skips_guests_without_contact_number(settings):
    from services import sms

    assert sms.send_sms("999000123456789", "hi") is False
    assert sms.send_sms("", "hi") is False
