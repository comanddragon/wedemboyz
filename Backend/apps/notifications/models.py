from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class Notification(TimeStampedModel):
    class NotificationType(models.TextChoices):
        ORDER_UPDATE = "ORDER_UPDATE", "Order Update"
        PAYMENT = "PAYMENT", "Payment"
        PROMO = "PROMO", "Promotion"
        CHAT = "CHAT", "Chat Message"
        SYSTEM = "SYSTEM", "System"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    notification_type = models.CharField(max_length=20, choices=NotificationType.choices)
    title = models.CharField(max_length=150)
    body = models.TextField(blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    # Loose optional links — keeps this model decoupled from every other app's FK graph.
    related_order = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "is_read"])]

    def __str__(self):
        return f"{self.notification_type} → {self.user}: {self.title}"

    def mark_read(self):
        from django.utils import timezone

        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at"])


class NotificationPreference(TimeStampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_preference"
    )
    sms_enabled = models.BooleanField(default=True)
    email_enabled = models.BooleanField(default=True)
    push_enabled = models.BooleanField(default=True)
    whatsapp_enabled = models.BooleanField(
        default=False, help_text="Opt-in — not everyone has WhatsApp, so this defaults off."
    )
    promo_opt_in = models.BooleanField(default=True)

    def __str__(self):
        return f"NotificationPreference<{self.user}>"


class DeviceToken(TimeStampedModel):
    """A push-notification target for one device. A user can have several
    (phone + tablet + web), so this is a list, not a field on the user."""

    class Platform(models.TextChoices):
        IOS = "IOS", "iOS"
        ANDROID = "ANDROID", "Android"
        WEB = "WEB", "Web"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="device_tokens"
    )
    token = models.CharField(max_length=255, unique=True)
    platform = models.CharField(max_length=10, choices=Platform.choices)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.platform} token for {self.user}"
