import pytest

from apps.staff.models import StaffProfile
from apps.staff.permissions import get_staff_permissions, get_staff_role

pytestmark = pytest.mark.django_db


def test_legacy_staff_without_profile_can_open_dashboard(create_user):
    user = create_user(is_staff=True)
    StaffProfile.objects.filter(user=user).delete()
    user.refresh_from_db()
    assert get_staff_role(user) == "ATTENDANT"
    assert "dashboard.view" in get_staff_permissions(user)
    assert "staff.manage" not in get_staff_permissions(user)
    assert StaffProfile.objects.filter(user=user).count() == 1


def test_disabled_staff_profile_is_not_reenabled(create_user):
    user = create_user(is_staff=True)
    StaffProfile.objects.filter(user=user).update(is_active=False)
    user.refresh_from_db()
    assert get_staff_role(user) is None
    assert get_staff_permissions(user) == []


def test_customer_and_inactive_staff_do_not_get_profiles(create_user):
    customer = create_user()
    inactive = create_user(phone_number="237677000001", is_staff=True, is_active=False)
    StaffProfile.objects.filter(user=inactive).delete()
    inactive.refresh_from_db()
    assert get_staff_role(customer) is None
    assert get_staff_role(inactive) is None
    assert not StaffProfile.objects.filter(user__in=[customer, inactive]).exists()
