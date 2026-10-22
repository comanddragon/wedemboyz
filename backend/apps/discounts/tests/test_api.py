import io
import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.discounts.models import AmbassadorProfile
from apps.users.models import CustomUser

pytestmark = pytest.mark.django_db


def _make_image_file(name="photo.png"):
    file = io.BytesIO()
    image = Image.new("RGBA", size=(50, 50), color=(255, 0, 0, 255))
    image.save(file, "png")
    file.seek(0)
    return SimpleUploadedFile(name, file.read(), content_type="image/png")


def test_admin_can_assign_ambassador_without_profile_photo():
    admin = CustomUser.objects.create_superuser(phone_number="237699000001", password="admin-pass")
    customer = CustomUser.objects.create_user(
        phone_number="237677000001",
        password="customer-pass",
        first_name="Jean",
        last_name="Paul",
    )
    assert not customer.profile.avatar

    client = APIClient()
    client.force_authenticate(user=admin)
    res = client.post("/api/v1/loyalty/admin/ambassadors/", {"user_id": customer.id}, format="json")
    assert res.status_code == 201, res.content

    profile = AmbassadorProfile.objects.get(user=customer)
    assert profile.is_active is True
    assert profile.promo_code.code.startswith("JEAN-")
    assert profile.user.profile.avatar == "" or not bool(profile.user.profile.avatar)


def test_ambassador_without_photo_is_forbidden_on_leaderboard():
    customer = CustomUser.objects.create_user(phone_number="237677000002", password="customer-pass")
    client = APIClient()
    client.force_authenticate(user=customer)

    # Not an ambassador yet -> 403 Ambassador access required
    res = client.get("/api/v1/loyalty/ambassadors/leaderboard/")
    assert res.status_code == 403
    payload = res.json().get("data", res.json())
    assert "Ambassador access required" in str(payload)

    # Assign as ambassador without photo
    admin = CustomUser.objects.create_superuser(phone_number="237699000002", password="admin-pass")
    admin_client = APIClient()
    admin_client.force_authenticate(user=admin)
    admin_client.post("/api/v1/loyalty/admin/ambassadors/", {"user_id": customer.id}, format="json")

    # Now an ambassador, but no photo -> 403 Upload a profile photo
    res = client.get("/api/v1/loyalty/ambassadors/leaderboard/")
    assert res.status_code == 403
    payload = res.json().get("data", res.json())
    assert "Upload a profile photo before entering the ambassador leaderboard" in str(payload)


def test_ambassador_without_photo_must_upload_photo_on_profile_update():
    customer = CustomUser.objects.create_user(phone_number="237677000003", password="customer-pass")
    admin = CustomUser.objects.create_superuser(phone_number="237699000003", password="admin-pass")
    admin_client = APIClient()
    admin_client.force_authenticate(user=admin)
    admin_client.post("/api/v1/loyalty/admin/ambassadors/", {"user_id": customer.id}, format="json")

    client = APIClient()
    client.force_authenticate(user=customer)

    # Attempting to update other profile fields without uploading avatar fails
    res = client.patch("/api/v1/users/me/", {"first_name": "UpdatedName"})
    assert res.status_code == 400
    err = res.json().get("error", res.json())
    assert "avatar" in str(err)


def test_ambassador_can_upload_photo_and_access_leaderboard_with_photo_displayed():
    customer = CustomUser.objects.create_user(
        phone_number="237677000004", password="customer-pass", first_name="Sarah"
    )
    admin = CustomUser.objects.create_superuser(phone_number="237699000004", password="admin-pass")
    admin_client = APIClient()
    admin_client.force_authenticate(user=admin)
    admin_client.post("/api/v1/loyalty/admin/ambassadors/", {"user_id": customer.id}, format="json")

    client = APIClient()
    client.force_authenticate(user=customer)

    # Ambassador uploads photo and chooses to use illustrated avatar for general display
    photo = _make_image_file("sarah.png")
    res = client.patch(
        "/api/v1/users/me/",
        {"avatar": photo, "use_profile_photo": "false"},
        format="multipart",
    )
    assert res.status_code == 200, res.content
    customer.profile.refresh_from_db()
    assert bool(customer.profile.avatar)
    assert customer.profile.use_profile_photo is False

    # Leaderboard is now accessible and displays the ambassador's picture
    res = client.get("/api/v1/loyalty/ambassadors/leaderboard/")
    assert res.status_code == 200
    data = res.json().get("data", res.json())
    assert len(data["results"]) == 1
    leaderboard_row = data["results"][0]
    assert leaderboard_row["ambassador"]["name"] == "Sarah"
    # Even though user.use_profile_photo is False, leaderboard row profile_photo contains the picture!
    assert leaderboard_row["ambassador"]["profile_photo"] is not None
    assert "sarah" in leaderboard_row["ambassador"]["profile_photo"]


def test_user_can_upload_photo_and_toggle_display_choice():
    user = CustomUser.objects.create_user(phone_number="237677000005", password="user-pass")
    client = APIClient()
    client.force_authenticate(user=user)

    # Cannot enable profile photo display without having a photo
    res = client.patch("/api/v1/users/me/", {"use_profile_photo": True}, format="json")
    assert res.status_code == 400
    err = res.json().get("error", res.json())
    assert "use_profile_photo" in str(err)

    # Upload photo and enable
    photo = _make_image_file("me.png")
    res = client.patch(
        "/api/v1/users/me/",
        {"avatar": photo, "use_profile_photo": "true"},
        format="multipart",
    )
    assert res.status_code == 200
    user.profile.refresh_from_db()
    assert user.profile.use_profile_photo is True

    # Switch display choice back to illustrated avatar
    res = client.patch("/api/v1/users/me/", {"use_profile_photo": False}, format="json")
    assert res.status_code == 200
    user.profile.refresh_from_db()
    assert user.profile.use_profile_photo is False
    assert bool(user.profile.avatar)  # avatar is kept
