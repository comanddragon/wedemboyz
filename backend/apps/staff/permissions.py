from rest_framework.permissions import BasePermission


class StaffPermission:
    DASHBOARD_VIEW = "dashboard.view"
    ORDERS_VIEW = "orders.view"
    ORDERS_MANAGE = "orders.manage"
    SALES_CREATE = "sales.create"
    PAYMENTS_VIEW = "payments.view"
    CHAT_MANAGE = "chat.manage"
    CUSTOMERS_VIEW = "customers.view"
    INVENTORY_VIEW = "inventory.view"
    INVENTORY_MANAGE = "inventory.manage"
    DISCOUNTS_MANAGE = "discounts.manage"
    FINANCE_VIEW = "finance.view"
    FINANCE_MANAGE = "finance.manage"
    REFUNDS_MANAGE = "refunds.manage"
    STAFF_MANAGE = "staff.manage"

    ALL = (
        DASHBOARD_VIEW, ORDERS_VIEW, ORDERS_MANAGE, SALES_CREATE,
        PAYMENTS_VIEW, CHAT_MANAGE, CUSTOMERS_VIEW, INVENTORY_VIEW,
        INVENTORY_MANAGE, DISCOUNTS_MANAGE, FINANCE_VIEW,
        FINANCE_MANAGE, REFUNDS_MANAGE, STAFF_MANAGE,
    )


ROLE_PERMISSIONS = {
    "MANAGER": {
        StaffPermission.DASHBOARD_VIEW, StaffPermission.ORDERS_VIEW,
        StaffPermission.ORDERS_MANAGE, StaffPermission.SALES_CREATE,
        StaffPermission.PAYMENTS_VIEW, StaffPermission.CHAT_MANAGE,
        StaffPermission.CUSTOMERS_VIEW, StaffPermission.INVENTORY_VIEW,
        StaffPermission.INVENTORY_MANAGE, StaffPermission.DISCOUNTS_MANAGE,
        StaffPermission.FINANCE_VIEW,
    },
    "ATTENDANT": {
        StaffPermission.DASHBOARD_VIEW, StaffPermission.ORDERS_VIEW,
        StaffPermission.ORDERS_MANAGE, StaffPermission.SALES_CREATE,
        StaffPermission.PAYMENTS_VIEW, StaffPermission.CHAT_MANAGE,
        StaffPermission.CUSTOMERS_VIEW, StaffPermission.INVENTORY_VIEW,
    },
}


def get_staff_role(user):
    if not user or not user.is_authenticated or not user.is_active:
        return None
    if user.is_superuser:
        return "OWNER"
    if not user.is_staff:
        return None
    profile = getattr(user, "staff_profile", None)
    return profile.role if profile and profile.is_active else None


def get_staff_permissions(user):
    role = get_staff_role(user)
    if role == "OWNER":
        return list(StaffPermission.ALL)
    return sorted(ROLE_PERMISSIONS.get(role, set()))


def has_staff_permission(user, permission):
    return permission in get_staff_permissions(user)


class HasStaffPermission(BasePermission):
    message = "Your staff role does not allow this action."

    def has_permission(self, request, view):
        required = getattr(view, "required_staff_permission", None)
        return bool(required and has_staff_permission(request.user, required))


class IsStaffManager(BasePermission):
    """Owner-only authority for staff accounts, roles, and invitations."""

    message = "Only the account owner can manage staff access."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_active and user.is_superuser)
