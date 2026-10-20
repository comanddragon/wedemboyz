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
    MANAGER = "MANAGER", "Manager"
    ATTENDANT = "ATTENDANT", "Attendant"
    CASHIER = "CASHIER", "Cashier"
    DRIVER = "DRIVER", "Driver"


class StaffProfile(TimeStampedModel):
    class EmploymentStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        ON_LEAVE = "ON_LEAVE", "On leave"
        SUSPENDED = "SUSPENDED", "Suspended"
        TERMINATED = "TERMINATED", "Terminated"

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
    hire_date = models.DateField(null=True, blank=True)
    employment_status = models.CharField(
        max_length=12,
        choices=EmploymentStatus.choices,
        default=EmploymentStatus.ACTIVE,
    )
    base_salary = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True)
    address = models.CharField(max_length=255, blank=True)
    emergency_contact_name = models.CharField(max_length=150, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    is_available_for_chat = models.BooleanField(
        default=True,
        help_text="Available to receive new customer chat assignments.",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} — {self.role}"

    @property
    def can_receive_chats(self):
        return (
            self.is_active
            and self.employment_status == self.EmploymentStatus.ACTIVE
            and self.is_available_for_chat
            and self.user.is_active
        )


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


class BusinessSettings(TimeStampedModel):
    business_name = models.CharField(max_length=150, default="Wedemboyz Lavomatique")
    address = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    tax_number = models.CharField(max_length=80, blank=True)
    receipt_footer = models.TextField(blank=True)
    delivery_fee_flat = models.DecimalField(max_digits=10, decimal_places=0, default=1500)
    free_delivery_threshold = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True)
    tax_rate_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    subscription_period_days = models.PositiveIntegerField(default=30)
    operating_hours = models.JSONField(default=dict, blank=True)
    closed_days = models.JSONField(default=list, blank=True)
    slot_capacities = models.JSONField(default=dict, blank=True)
    notification_channels = models.JSONField(default=dict, blank=True)
    notification_templates = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name_plural = "business settings"

    @classmethod
    def load(cls):
        instance, _ = cls.objects.get_or_create(pk=1)
        return instance


class PriceItem(TimeStampedModel):
    class UnitMode(models.TextChoices):
        PIECE = "PIECE", "Per piece"
        KILOGRAM = "KILOGRAM", "Per kilogram"

    service_type = models.CharField(max_length=40)
    label = models.CharField(max_length=120)
    unit_mode = models.CharField(max_length=12, choices=UnitMode.choices)
    price = models.DecimalField(max_digits=10, decimal_places=0)
    minimum_charge = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    effective_from = models.DateField(default=timezone.localdate)
    effective_until = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["service_type", "-effective_from"]
        indexes = [models.Index(fields=["service_type", "is_active", "effective_from"])]


class SubscriptionPlanSetting(TimeStampedModel):
    plan = models.CharField(max_length=20, unique=True)
    label = models.CharField(max_length=120)
    price = models.DecimalField(max_digits=10, decimal_places=0)
    kilos = models.DecimalField(max_digits=6, decimal_places=2)
    is_active = models.BooleanField(default=True)


def log_activity(staff, action: str, description: str = ""):
    """Convenience helper other apps can import to record staff activity
    without needing to know about the model's field names."""
    if staff is None or not getattr(staff, "is_authenticated", False):
        return None
    return StaffActivityLog.objects.create(staff=staff, action=action, description=description)
