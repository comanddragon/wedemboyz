"""
Pricing logic lives here rather than on the Order/OrderItem models so it can be
unit-tested without touching the DB, and so pricing rules can change without
touching migrations.

Source of truth for every figure below: the WEDEMBOYZ Lavomatique price
flyers (NOUVEAUX PRIX / GRILLE DE PRIX / ABONNEMENTS MENSUELS), updated
2026-07-17. Update this file (not the flyers) if prices change again.
"""

from decimal import Decimal

from core.constants import ServiceType
from core.utils import round_money

# --- Per-piece pressing/garment-care items ("NOUVEAUX PRIX" flyer) --------
# Flat price per piece — weight_kg is still recorded on the OrderItem for
# logistics, but it does NOT factor into the price for these service types.
PRICE_PER_PIECE = {
    ServiceType.VESTE: Decimal("2000"),
    ServiceType.TSHIRT: Decimal("500"),
    ServiceType.CHEMISE: Decimal("600"),
    ServiceType.PANTALON: Decimal("500"),
    ServiceType.PULL: Decimal("1000"),
    ServiceType.ROBE: Decimal("2500"),
    ServiceType.ENSEMBLE: Decimal("2000"),
    ServiceType.DRAPS_COMPLET: Decimal("1500"),
    ServiceType.COUETTE_1P: Decimal("2000"),
    ServiceType.COUETTE_2P: Decimal("3000"),
    ServiceType.COUETTE_3P: Decimal("4000"),
}

# --- Per-kg self-service lavomatique lines ("GRILLE DE PRIX" flyer) -------
PRICE_PER_KG = {
    ServiceType.LAVAGE_ESSORAGE: Decimal("600"),
    ServiceType.LAVAGE_SECHAGE: Decimal("1000"),
    ServiceType.REPASSAGE_PLASTIF: Decimal("1000"),
}

# Avoids unprofitable micro-orders on the per-kg grille lines. Doesn't apply
# to per-piece items — those are already flat-priced.
MINIMUM_CHARGE_PER_KG_ITEM = Decimal("1000")

# Flat pickup + home delivery fee ("RAMASSAGE DE VOS HABITS & LIVRAISON ...
# À SEULEMENT 1500 FCFA"). No free-delivery threshold is advertised on the
# flyer, so it's charged on every order that isn't fully covered by a
# subscription (see OrderCreateSerializer.create).
DELIVERY_FEE_FLAT = Decimal("1500")

# Subscription plans — single source of truth for what a plan costs and how
# many kilos it grants per month, shared by the subscription serializer
# (create) and the payments app (activation on successful payment). Every
# plan runs for a fixed 30-day period from activation. Per the flyer: kilos
# don't roll over to the next month, and any usage beyond the plan's
# allowance is billed at the standard GRILLE DE PRIX rates.
SUBSCRIPTION_PERIOD_DAYS = 30

PLAN_PRICE = {
    "ESSENTIEL": Decimal("17500"),
    "CONFORT": Decimal("34000"),
    "FAMILLE": Decimal("49000"),
}

PLAN_KG_ALLOWANCE = {
    "ESSENTIEL": Decimal("10"),
    "CONFORT": Decimal("20"),
    "FAMILLE": Decimal("30"),
}


def price_for_subscription_plan(plan: str) -> Decimal:
    if plan not in PLAN_PRICE:
        raise ValueError(f"Unknown subscription plan: {plan}")
    return PLAN_PRICE[plan]


def kg_allowance_for_plan(plan: str) -> Decimal:
    if plan not in PLAN_KG_ALLOWANCE:
        raise ValueError(f"Unknown subscription plan: {plan}")
    return PLAN_KG_ALLOWANCE[plan]


def price_for_item(service_type: str, weight_kg: Decimal, quantity: int = 1) -> Decimal:
    """Unit price for a single OrderItem line (pre-quantity)."""
    if service_type in PRICE_PER_PIECE:
        return round_money(PRICE_PER_PIECE[service_type])

    if service_type in PRICE_PER_KG:
        rate = PRICE_PER_KG[service_type]
        raw = rate * Decimal(weight_kg)
        return round_money(max(raw, MINIMUM_CHARGE_PER_KG_ITEM))

    raise ValueError(f"Unknown service_type: {service_type}")


def calculate_delivery_fee(subtotal: Decimal) -> Decimal:
    return DELIVERY_FEE_FLAT


def apply_discount(subtotal: Decimal, discount_type: str, value: Decimal) -> Decimal:
    """Returns the discount amount (not the discounted subtotal)."""
    if discount_type == "PERCENTAGE":
        discount = subtotal * (Decimal(value) / Decimal("100"))
    elif discount_type == "FIXED":
        discount = Decimal(value)
    else:
        raise ValueError(f"Unknown discount_type: {discount_type}")

    return round_money(min(discount, subtotal))  # never discount below zero


def price_order_items(items: list[dict]) -> Decimal:
    """
    items: [{"service_type": "TSHIRT", "weight_kg": 0.3, "quantity": 2}, ...]
    Returns the subtotal across all items.
    """
    total = Decimal("0")
    for item in items:
        unit_price = price_for_item(item["service_type"], item["weight_kg"])
        total += unit_price * item.get("quantity", 1)
    return round_money(total)


def total_weight_kg(items: list[dict]) -> Decimal:
    """Total kg across order items — used to draw down a subscription's kg
    allowance. Per-piece items still carry a weight_kg (for logistics), so
    it's included the same as grille items."""
    total = Decimal("0")
    for item in items:
        total += Decimal(item["weight_kg"]) * item.get("quantity", 1)
    return total
