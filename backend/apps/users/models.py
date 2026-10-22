from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.validators import RegexValidator
from django.db import models

from core.models import TimeStampedModel

from .managers import CustomUserManager

phone_validator = RegexValidator(
    regex=r"^\d{9,15}$",
    message="Phone number must be 9-15 digits, no spaces or symbols (country code included).",
)


class CustomUser(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    phone_number = models.CharField(
        max_length=15, unique=True, validators=[phone_validator]
    )
    email = models.EmailField(blank=True, null=True)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_phone_verified = models.BooleanField(default=False)
    is_walk_in = models.BooleanField(default=False)
    # Created by POST /auth/guest/ so someone can book without registering.
    # Has a placeholder phone_number and no usable password until the guest
    # claims the account (POST /auth/guest/claim/), which keeps the same row —
    # and therefore all of its orders, payments and chats.
    is_guest = models.BooleanField(default=False)

    USERNAME_FIELD = "phone_number"
    REQUIRED_FIELDS = []  # phone_number + password is all createsuperuser needs

    objects = CustomUserManager()

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"
        ordering = ["-created_at"]

    def __str__(self):
        return self.get_full_name() or self.phone_number

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        return self.first_name or self.phone_number


class UserProfile(TimeStampedModel):
    LANGUAGE_CHOICES = [("en", "English"), ("fr", "Français")]

    user = models.OneToOneField(
        CustomUser, on_delete=models.CASCADE, related_name="profile"
    )
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    use_profile_photo = models.BooleanField(
        default=False,
        help_text="Use the uploaded photo instead of the generated illustrated avatar.",
    )
    address_line = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, default="Yaoundé")
    date_of_birth = models.DateField(blank=True, null=True)
    preferred_language = models.CharField(
        max_length=2, choices=LANGUAGE_CHOICES, default="en"
    )
    water_temperature = models.CharField(
        max_length=10,
        choices=[("COLD", "Cold"), ("WARM", "Warm"), ("HOT", "Hot")],
        default="COLD",
    )
    spin_speed = models.CharField(
        max_length=10,
        choices=[("GENTLE", "Gentle"), ("NORMAL", "Normal"), ("HIGH", "High")],
        default="NORMAL",
    )
    detergent_preference = models.CharField(
        max_length=20,
        choices=[
            ("STANDARD", "Standard"),
            ("HYPOALLERGENIC", "Hypoallergenic"),
            ("SCENT_FREE", "Scent-free"),
        ],
        default="STANDARD",
    )
    folding_style = models.CharField(
        max_length=20,
        choices=[
            ("BY_GARMENT", "By garment type"),
            ("BY_OUTFIT", "By outfit"),
            ("HANGER_READY", "Hanger-ready"),
        ],
        default="BY_GARMENT",
    )
    notes = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True)
    source = models.CharField(
        max_length=20,
        choices=[("ONLINE", "Online"), ("WALK_IN", "Walk-in"), ("REFERRAL", "Referral"), ("OTHER", "Other")],
        default="ONLINE",
    )
    referred_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="referred_customers",
    )
    is_blocked = models.BooleanField(default=False)
    blocked_reason = models.TextField(blank=True)
    marketing_opt_in = models.BooleanField(default=False)
    whatsapp_number = models.CharField(max_length=15, blank=True)
    secondary_phone = models.CharField(max_length=15, blank=True)
    gender = models.CharField(
        max_length=20,
        choices=[("FEMALE", "Female"), ("MALE", "Male"), ("OTHER", "Other"), ("PREFER_NOT", "Prefer not to say")],
        blank=True,
    )
    default_pickup_address = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"Profile<{self.user}>"


class LoyaltyAccount(TimeStampedModel):
    class Tier(models.TextChoices):
        BRONZE = "BRONZE", "Bronze"
        SILVER = "SILVER", "Silver"
        GOLD = "GOLD", "Gold"

    user = models.OneToOneField(
        CustomUser, on_delete=models.CASCADE, related_name="loyalty_account"
    )
    points_balance = models.PositiveIntegerField(default=0)
    lifetime_points_earned = models.PositiveIntegerField(default=0)
    tier = models.CharField(max_length=10, choices=Tier.choices, default=Tier.BRONZE)

    def __str__(self):
        return f"{self.user} — {self.points_balance} pts ({self.tier})"
