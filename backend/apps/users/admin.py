from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import CustomUser, LoyaltyAccount, UserProfile


@admin.register(CustomUser)
class CustomUserAdmin(DjangoUserAdmin):
    ordering = ["-created_at"]
    list_display = ["phone_number", "first_name", "last_name", "is_phone_verified", "is_staff"]
    search_fields = ["phone_number", "first_name", "last_name", "email"]
    fieldsets = (
        (None, {"fields": ("phone_number", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "email")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "is_phone_verified",
                    "groups",
                    "user_permissions",
                )
            },
        ),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("phone_number", "password1", "password2"),
            },
        ),
    )


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "city", "preferred_language"]
    search_fields = ["user__phone_number"]


@admin.register(LoyaltyAccount)
class LoyaltyAccountAdmin(admin.ModelAdmin):
    list_display = ["user", "points_balance", "tier"]
    list_filter = ["tier"]
    search_fields = ["user__phone_number"]
