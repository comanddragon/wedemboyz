import pytest

from apps.staff.models import StaffProfile
from apps.users.api.serializers.profile import ProfileSerializer
from apps.users.models import CustomUser

pytestmark = pytest.mark.django_db


def test_django_staff_account_gets_roster_profile(create_user):
    staff = create_user(is_staff=True)
    assert StaffProfile.objects.get(user=staff).role == "ATTENDANT"


def test_owner_can_create_external_customer_and_select_for_sale(api_client, create_user):
    owner = create_user(is_staff=True, is_superuser=True)
    api_client.force_authenticate(owner)
    response = api_client.post("/api/v1/users/customers/", {
        "phone_number": "237699010203", "first_name": "External", "source": "WALK_IN",
        "is_walk_in": True,
    }, format="json")
    assert response.status_code == 201, response.data
    payload = response.json()
    customer = payload.get("data", payload)
    assert not CustomUser.objects.get(pk=customer["id"]).has_usable_password()
    response = api_client.post("/api/v1/orders/quick-sale/", {
        "customer": customer["id"],
        "items": [{"service_type": "LAVAGE_ESSORAGE", "weight_kg": "2", "unit_price": "600"}],
        "payment_method": "PAY_AT_PICKUP", "paid_now": False,
    }, format="json")
    assert response.status_code == 201, response.data
    payload = response.json()
    assert payload.get("data", payload)["order"]["user"] == customer["id"]


def test_profile_updates_gender_and_defaults_to_basic_badge(create_user):
    user = create_user()
    serializer = ProfileSerializer(user, data={"gender": "MALE"}, partial=True)
    assert serializer.is_valid(), serializer.errors
    serializer.save()
    assert serializer.data["gender"] == "MALE"
    assert serializer.data["loyalty"]["badge_tier"] == "BASIC"
