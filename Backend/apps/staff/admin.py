from django.contrib import admin

from .models import StaffActivityLog, StaffInvite, StaffProfile


@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "role", "is_active", "invited_by", "joined_at"]
    list_filter = ["role", "is_active"]
    search_fields = ["user__phone_number", "user__first_name", "user__last_name"]


@admin.register(StaffInvite)
class StaffInviteAdmin(admin.ModelAdmin):
    list_display = ["phone_number", "full_name", "role", "status", "invited_by", "expires_at"]
    list_filter = ["role", "status"]
    search_fields = ["phone_number", "full_name"]


@admin.register(StaffActivityLog)
class StaffActivityLogAdmin(admin.ModelAdmin):
    list_display = ["staff", "action", "description", "created_at"]
    list_filter = ["action"]
    search_fields = ["staff__phone_number"]
