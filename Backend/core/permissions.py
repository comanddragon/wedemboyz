from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsOwner(BasePermission):
    """Object-level permission: only the owning user may access/modify it."""

    owner_field = "user"

    def has_object_permission(self, request, view, obj):
        owner = getattr(obj, self.owner_field, None)
        return owner == request.user


class IsOwnerOrReadOnly(IsOwner):
    """Owner can write; anyone authenticated can read."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return super().has_object_permission(request, view, obj)


class IsStaffOrReadOnly(BasePermission):
    """Only staff users may create/update/delete; reads are open to authenticated users."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return bool(request.user and request.user.is_staff)
