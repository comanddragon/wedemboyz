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
    address_line = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, default="Bamenda")
    date_of_birth = models.DateField(blank=True, null=True)
    preferred_language = models.CharField(
        max_length=2, choices=LANGUAGE_CHOICES, default="en"
    )

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
