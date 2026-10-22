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


class LoyaltyTierConfig(TimeStampedModel):
    tier = models.CharField(max_length=10, choices=[("BRONZE", "Bronze"), ("SILVER", "Silver"), ("GOLD", "Gold")], unique=True)
    minimum_lifetime_points = models.PositiveIntegerField(default=0)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    bonus_points_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    priority_service = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["minimum_lifetime_points"]

    def __str__(self):
        return f"{self.tier} from {self.minimum_lifetime_points} points"


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


class LoyaltyProgramSettings(TimeStampedModel):
    """Global switches for the two independent loyalty programmes."""

    credit_points_enabled = models.BooleanField(default=True)
    badge_tiers_enabled = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "loyalty programme settings"

    @classmethod
    def get_current(cls):
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings


class LoyaltyReward(TimeStampedModel):
    class Track(models.TextChoices):
        CREDIT = "CREDIT", "Credit points"
        BADGE = "BADGE", "Completed badge card"

    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    track = models.CharField(max_length=10, choices=Track.choices)
    points_cost = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["track", "points_cost", "name"]

    def __str__(self):
        return self.name


class LoyaltyRewardGrant(TimeStampedModel):
    reward = models.ForeignKey(
        LoyaltyReward, on_delete=models.PROTECT, related_name="grants"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="loyalty_reward_grants"
    )
    order = models.ForeignKey(
        "orders.Order", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="loyalty_reward_grants",
    )
    is_redeemed = models.BooleanField(default=False)
    redeemed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]


class BadgeAccount(TimeStampedModel):
    class Tier(models.TextChoices):
        BASIC = "BASIC", "Basic"
        BRONZE = "BRONZE", "Bronze"
        SILVER = "SILVER", "Silver"
        GOLD = "GOLD", "Gold"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="badge_account"
    )
    tier = models.CharField(max_length=10, choices=Tier.choices, default=Tier.BASIC)
    badges = models.PositiveSmallIntegerField(default=0)
    lifetime_badges = models.PositiveIntegerField(default=0)
    completed_cards = models.PositiveIntegerField(default=0)


class BadgeAward(TimeStampedModel):
    badge_account = models.ForeignKey(
        BadgeAccount, on_delete=models.CASCADE, related_name="awards"
    )
    order = models.OneToOneField(
        "orders.Order", on_delete=models.CASCADE, related_name="badge_award"
    )


class AmbassadorProfile(TimeStampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ambassador_profile"
    )
    promo_code = models.OneToOneField(
        PromoCode, on_delete=models.PROTECT, related_name="ambassador_profile"
    )
    credit_balance = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    lifetime_credits = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["user__first_name", "user__last_name", "user_id"]


class AmbassadorCredit(TimeStampedModel):
    ambassador = models.ForeignKey(
        AmbassadorProfile, on_delete=models.CASCADE, related_name="credits"
    )
    order = models.OneToOneField(
        "orders.Order", on_delete=models.PROTECT, related_name="ambassador_credit"
    )
    order_amount = models.DecimalField(max_digits=10, decimal_places=0)
    credit_amount = models.DecimalField(max_digits=10, decimal_places=0)

    class Meta:
        ordering = ["-created_at"]


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
