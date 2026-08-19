from django.conf import settings
from django.db import models

from core.models import TimeStampedModel


class DiscountType(models.TextChoices):
    PERCENTAGE = "PERCENTAGE", "Percentage"
    FIXED = "FIXED", "Fixed amount"


class PromoCode(TimeStampedModel):
    code = models.CharField(max_length=30, unique=True)
    description = models.CharField(max_length=255, blank=True)
    discount_type = models.CharField(max_length=10, choices=DiscountType.choices)
    value = models.DecimalField(
        max_digits=10, decimal_places=2, help_text="Percentage (0-100) or fixed XAF amount."
    )
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    max_uses = models.PositiveIntegerField(
        null=True, blank=True, help_text="Leave blank for unlimited uses."
    )
    max_uses_per_user = models.PositiveIntegerField(default=1)
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.code

    def times_used(self):
        return self.usages.count()

    def is_valid_now(self):
        from django.utils import timezone

        now = timezone.now()
        if not self.is_active or not (self.valid_from <= now <= self.valid_until):
            return False
        if self.max_uses is not None and self.times_used() >= self.max_uses:
            return False
        return True


class PromoUsage(TimeStampedModel):
    promo_code = models.ForeignKey(
        PromoCode, on_delete=models.CASCADE, related_name="usages"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="promo_usages"
    )
    order = models.ForeignKey(
        "orders.Order", on_delete=models.CASCADE, related_name="promo_usages"
    )
    discount_applied = models.DecimalField(max_digits=10, decimal_places=0)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["promo_code", "order"], name="unique_promo_per_order"
            )
        ]

    def __str__(self):
        return f"{self.promo_code} used on Order #{self.order_id}"


class LoyaltyRule(TimeStampedModel):
    """Defines how many points a user earns per currency unit spent."""

    name = models.CharField(max_length=100)
    points_per_currency_unit = models.DecimalField(
        max_digits=6,
        decimal_places=4,
        default=0.01,
        help_text="e.g. 0.01 = 1 point per 100 XAF spent.",
    )
    min_spend = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class LoyaltyTransaction(TimeStampedModel):
    class TransactionType(models.TextChoices):
        EARN = "EARN", "Earned"
        REDEEM = "REDEEM", "Redeemed"
        EXPIRE = "EXPIRE", "Expired"
        ADJUST = "ADJUST", "Manual Adjustment"

    loyalty_account = models.ForeignKey(
        "users.LoyaltyAccount", on_delete=models.CASCADE, related_name="transactions"
    )
    points = models.IntegerField(help_text="Positive for earn/adjust-up, negative for redeem/expire.")
    transaction_type = models.CharField(max_length=10, choices=TransactionType.choices)
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="loyalty_transactions",
    )
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.loyalty_account} {self.transaction_type} {self.points}"


class StampCardConfig(TimeStampedModel):
    """Reinterprets the existing points/tier system as a physical-style
    stamp card, per product decision: no separate stamp-earning mechanism —
    `points_per_stamp` points = 1 stamp, `stamps_required` stamps = 1 free
    wash. Multiple rows can exist (e.g. to preview a future config change);
    the most recently created row with is_active=True is the live one."""

    points_per_stamp = models.PositiveIntegerField(
        default=100, help_text="Points needed to earn 1 stamp."
    )
    stamps_required = models.PositiveIntegerField(
        default=10, help_text="Stamps needed to redeem 1 free wash."
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.stamps_required} stamps @ {self.points_per_stamp} pts (active={self.is_active})"

    @property
    def points_per_reward(self):
        return self.points_per_stamp * self.stamps_required

    @classmethod
    def get_active(cls):
        return cls.objects.filter(is_active=True).order_by("-created_at").first()


class DiscountCampaign(TimeStampedModel):
    class Segment(models.TextChoices):
        ALL = "ALL", "All customers"
        NEW_CUSTOMERS = "NEW_CUSTOMERS", "New customers"
        LAPSED = "LAPSED", "Lapsed customers"
        LOYALTY_GOLD = "LOYALTY_GOLD", "Gold tier loyalty members"

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    discount_type = models.CharField(max_length=10, choices=DiscountType.choices)
    value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Percentage (0-100) or fixed XAF amount, depending on discount_type.",
    )
    target_segment = models.CharField(
        max_length=20, choices=Segment.choices, default=Segment.ALL
    )
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return self.name
