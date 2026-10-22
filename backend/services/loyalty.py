"""Loyalty points logic — kept out of the model layer so it can call across apps
(orders, discounts, users) without those apps importing each other directly."""

from decimal import Decimal

from django.db import transaction

# Lifetime points thresholds for tier upgrades.
TIER_THRESHOLDS = {
    "GOLD": 5000,
    "SILVER": 1500,
    "BRONZE": 0,
}


def _tier_for_lifetime_points(lifetime_points: int) -> str:
    from apps.discounts.models import LoyaltyTierConfig

    configured = LoyaltyTierConfig.objects.filter(
        is_active=True, minimum_lifetime_points__lte=lifetime_points
    ).order_by("-minimum_lifetime_points").first()
    if configured:
        return configured.tier
    if lifetime_points >= TIER_THRESHOLDS["GOLD"]:
        return "GOLD"
    if lifetime_points >= TIER_THRESHOLDS["SILVER"]:
        return "SILVER"
    return "BRONZE"


@transaction.atomic
def award_points_for_order(order):
    """Call this once an order is marked DELIVERED and paid."""
    from apps.discounts.models import LoyaltyProgramSettings, LoyaltyTransaction
    from apps.users.models import LoyaltyAccount

    if not LoyaltyProgramSettings.get_current().credit_points_enabled:
        return None

    points_earned = int(Decimal(order.total_amount))
    if points_earned <= 0:
        return None

    account, _ = LoyaltyAccount.objects.select_for_update().get_or_create(user=order.user)
    existing = LoyaltyTransaction.objects.filter(
        loyalty_account=account,
        transaction_type=LoyaltyTransaction.TransactionType.EARN,
        order=order,
    ).first()
    if existing:
        return existing
    account.points_balance += points_earned
    account.lifetime_points_earned += points_earned
    account.tier = _tier_for_lifetime_points(account.lifetime_points_earned)
    account.save(update_fields=["points_balance", "lifetime_points_earned", "tier"])

    transaction_row = LoyaltyTransaction.objects.create(
        loyalty_account=account,
        points=points_earned,
        transaction_type=LoyaltyTransaction.TransactionType.EARN,
        order=order,
        note=f"Earned from Order #{order.pk}",
    )
    return transaction_row


@transaction.atomic
def award_badge_for_order(order):
    from apps.discounts.models import (
        BadgeAccount, BadgeAward, LoyaltyProgramSettings, LoyaltyReward,
        LoyaltyRewardGrant,
    )

    if not LoyaltyProgramSettings.get_current().badge_tiers_enabled:
        return None
    account, _ = BadgeAccount.objects.select_for_update().get_or_create(user=order.user)
    if BadgeAward.objects.filter(order=order).exists():
        return None
    BadgeAward.objects.create(badge_account=account, order=order)
    account.badges += 1
    account.lifetime_badges += 1
    if account.badges >= 10:
        account.badges -= 10
        account.completed_cards += 1
        tiers = ["BASIC", "BRONZE", "SILVER", "GOLD"]
        account.tier = tiers[min(tiers.index(account.tier) + 1, len(tiers) - 1)]
        reward = LoyaltyReward.objects.filter(
            track=LoyaltyReward.Track.BADGE, is_active=True
        ).first()
        if reward:
            LoyaltyRewardGrant.objects.create(reward=reward, user=order.user, order=order)
    account.save(update_fields=["badges", "lifetime_badges", "completed_cards", "tier", "updated_at"])
    return account


@transaction.atomic
def award_ambassador_credit(promo_usage):
    from apps.discounts.models import AmbassadorCredit, AmbassadorProfile

    try:
        ambassador = AmbassadorProfile.objects.select_for_update().get(
            promo_code=promo_usage.promo_code, is_active=True
        )
    except AmbassadorProfile.DoesNotExist:
        return None
    credit = (Decimal(promo_usage.order.total_amount) * Decimal("0.10")).quantize(Decimal("1"))
    entry, created = AmbassadorCredit.objects.get_or_create(
        order=promo_usage.order,
        defaults={
            "ambassador": ambassador,
            "order_amount": promo_usage.order.total_amount,
            "credit_amount": credit,
        },
    )
    if created:
        ambassador.credit_balance += credit
        ambassador.lifetime_credits += credit
        ambassador.save(update_fields=["credit_balance", "lifetime_credits", "updated_at"])
    return entry


@transaction.atomic
def redeem_points(account, points: int, note: str = ""):
    """Deduct points for a reward/discount. Raises ValueError if balance is insufficient."""
    from apps.discounts.models import LoyaltyTransaction

    if points <= 0:
        raise ValueError("points to redeem must be positive")

    account.refresh_from_db()
    if account.points_balance < points:
        raise ValueError("Insufficient points balance")

    account.points_balance -= points
    account.save(update_fields=["points_balance"])

    return LoyaltyTransaction.objects.create(
        loyalty_account=account,
        points=-points,
        transaction_type=LoyaltyTransaction.TransactionType.REDEEM,
        note=note,
    )


def points_to_currency(points: int, xaf_per_point: Decimal = Decimal("1")) -> Decimal:
    """Convert a points amount to its XAF discount value, e.g. for checkout preview."""
    return Decimal(points) * xaf_per_point


# --- Stamp card (reinterprets the points system, per product decision) -----
# No separate stamp-earning mechanism: `StampCardConfig.points_per_stamp`
# points = 1 stamp, and `stamps_required` stamps = 1 free wash. This is a
# read-through view over the same points ledger, plus a dedicated redeem
# action that spends exactly one reward's worth of points at a time.


def stamp_card_progress(account) -> dict:
    """Returns the customer-facing stamp-card view for a LoyaltyAccount."""
    from apps.discounts.models import StampCardConfig

    config = StampCardConfig.get_active()
    if config is None:
        return {
            "configured": False,
            "points_per_stamp": None,
            "stamps_required": None,
            "stamps_on_current_card": 0,
            "points_to_next_stamp": None,
            "free_washes_available": 0,
        }

    total_stamps = account.points_balance // config.points_per_stamp
    stamps_on_current_card = total_stamps % config.stamps_required
    points_used_this_stamp = account.points_balance % config.points_per_stamp
    points_to_next_stamp = config.points_per_stamp - points_used_this_stamp
    free_washes_available = account.points_balance // config.points_per_reward

    return {
        "configured": True,
        "points_per_stamp": config.points_per_stamp,
        "stamps_required": config.stamps_required,
        "stamps_on_current_card": stamps_on_current_card,
        "points_to_next_stamp": points_to_next_stamp,
        "free_washes_available": free_washes_available,
    }


def redeem_free_wash(account, note: str = "Redeemed 1 free wash (stamp card)"):
    """Spend exactly one reward's worth of points. Raises ValueError if no
    stamp card is configured, or the balance doesn't cover a full reward."""
    from apps.discounts.models import StampCardConfig

    config = StampCardConfig.get_active()
    if config is None:
        raise ValueError("No stamp card is currently configured.")

    account.refresh_from_db()
    if account.points_balance < config.points_per_reward:
        raise ValueError(
            f"Not enough points yet — need {config.points_per_reward}, have {account.points_balance}."
        )

    return redeem_points(account, config.points_per_reward, note=note)
