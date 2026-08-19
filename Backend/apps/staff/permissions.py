from rest_framework.permissions import BasePermission

from .models import StaffRole


class IsStaffManager(BasePermission):
    """
    Only superusers or staff whose StaffProfile.role is OWNER may invite,
    edit, or deactivate other staff. Everyone else with is_staff=True can
    still view the roster (read-only), enforced separately in the view.
    """

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated and user.is_staff):
            return False
        if user.is_superuser:
            return True
        profile = getattr(user, "staff_profile", None)
        return bool(profile and profile.is_active and profile.role == StaffRole.OWNER)
