import secrets

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import TimeStampedModel


def generate_invite_token() -> str:
    return secrets.token_urlsafe(32)


def default_invite_expiry():
    return timezone.now() + timezone.timedelta(days=7)


class StaffRole(models.TextChoices):
    OWNER = "OWNER", "Owner"
    MANAGER = "MANAGER", "Manager"
    ATTENDANT = "ATTENDANT", "Attendant"


class StaffProfile(TimeStampedModel):
    """
    One row per staff user (CustomUser.is_staff=True), carrying the role +
    admin-management metadata that a plain `is_staff` boolean can't. Created
    automatically the moment a StaffInvite is accepted (see signals.py).
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="staff_profile"
    )
    role = models.CharField(max_length=10, choices=StaffRole.choices, default=StaffRole.ATTENDANT)
    is_active = models.BooleanField(
        default=True,
        help_text="Deactivating here revokes admin-area access without deleting the account.",
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="staff_members_invited",
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} — {self.role}"


class StaffInvite(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACCEPTED = "ACCEPTED", "Accepted"
        REVOKED = "REVOKED", "Revoked"
        EXPIRED = "EXPIRED", "Expired"

    phone_number = models.CharField(max_length=15)
    full_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=10, choices=StaffRole.choices, default=StaffRole.ATTENDANT)
    token = models.CharField(max_length=64, unique=True, default=generate_invite_token)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="staff_invites_sent",
    )
    expires_at = models.DateTimeField(default=default_invite_expiry)
    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="staff_invite_accepted",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Invite<{self.phone_number}> ({self.status})"

    def is_valid_now(self):
        return self.status == self.Status.PENDING and self.expires_at > timezone.now()


class StaffActivityLog(TimeStampedModel):
    """Lightweight audit trail for per-staff activity (invite, role change,
    order status change, promo created, etc). Populated by signals across
    apps rather than one central place, so it stays decoupled."""

    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="activity_logs"
    )
    action = models.CharField(max_length=100)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.staff} — {self.action}"


def log_activity(staff, action: str, description: str = ""):
    """Convenience helper other apps can import to record staff activity
    without needing to know about the model's field names."""
    if staff is None or not getattr(staff, "is_authenticated", False):
        return None
    return StaffActivityLog.objects.create(staff=staff, action=action, description=description)
