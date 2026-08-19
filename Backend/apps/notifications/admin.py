from django.contrib import admin

from .models import DeviceToken, Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["user", "notification_type", "title", "is_read", "created_at"]
    list_filter = ["notification_type", "is_read"]
    search_fields = ["user__phone_number", "title"]


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "sms_enabled",
        "email_enabled",
        "push_enabled",
        "whatsapp_enabled",
        "promo_opt_in",
    ]


@admin.register(DeviceToken)
class DeviceTokenAdmin(admin.ModelAdmin):
    list_display = ["user", "platform", "is_active", "created_at"]
    list_filter = ["platform", "is_active"]
    search_fields = ["user__phone_number", "token"]
