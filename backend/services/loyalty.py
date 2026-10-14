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
    if lifetime_points >= TIER_THRESHOLDS["GOLD"]:
        return "GOLD"
    if lifetime_points >= TIER_THRESHOLDS["SILVER"]:
        return "SILVER"
    return "BRONZE"


@transaction.atomic
def award_points_for_order(order):
    """Call this once an order is marked DELIVERED and paid."""
    from apps.discounts.models import LoyaltyRule, LoyaltyTransaction
    from apps.users.models import LoyaltyAccount

    rule = LoyaltyRule.objects.filter(is_active=True, min_spend__lte=order.total_amount).order_by(
        "-min_spend"
    ).first()
    if rule is None:
        return None

    points_earned = int(Decimal(order.total_amount) * rule.points_per_currency_unit)
    if points_earned <= 0:
        return None

    account, _ = LoyaltyAccount.objects.select_for_update().get_or_create(user=order.user)
    account.points_balance += points_earned
    account.lifetime_points_earned += points_earned
    account.tier = _tier_for_lifetime_points(account.lifetime_points_earned)
    account.save(update_fields=["points_balance", "lifetime_points_earned", "tier"])

    return LoyaltyTransaction.objects.create(
        loyalty_account=account,
        points=points_earned,
        transaction_type=LoyaltyTransaction.TransactionType.EARN,
        order=order,
        note=f"Earned from Order #{order.pk}",
    )


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
