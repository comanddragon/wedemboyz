"""Shared choices/enums referenced by more than one app's models."""

from django.db import models


class Currency(models.TextChoices):
    XAF = "XAF", "Central African CFA Franc"


class ServiceType(models.TextChoices):
    """Source of truth: the "NOUVEAUX PRIX" (per-piece pressing) and "GRILLE
    DE PRIX" (per-kg lavomatique) flyers. Priced in services.pricing —
    PRICE_PER_PIECE for the flat-rate items below, PRICE_PER_KG for the
    weight-based grille services."""

    # Per-piece pressing/garment-care items ("NOUVEAUX PRIX" flyer).
    VESTE = "VESTE", "Veste (Jacket)"
    TSHIRT = "TSHIRT", "T-Shirt"
    CHEMISE = "CHEMISE", "Chemise (Shirt)"
    PANTALON = "PANTALON", "Pantalon (Trousers)"
    PULL = "PULL", "Pull (Sweater)"
    ROBE = "ROBE", "Robe / Grande Robe / Robe de Soirée"
    ENSEMBLE = "ENSEMBLE", "Ensemble"
    DRAPS_COMPLET = "DRAPS_COMPLET", "Draps Complet (Bed Sheet Set)"
    COUETTE_1P = "COUETTE_1P", "Couette 1 Place"
    COUETTE_2P = "COUETTE_2P", "Couette 2 Places"
    COUETTE_3P = "COUETTE_3P", "Couette 3 Places"

    # Per-kg self-service lavomatique lines ("GRILLE DE PRIX" flyer).
    LAVAGE_ESSORAGE = "LAVAGE_ESSORAGE", "Lavage et Essorage (Wash & Spin)"
    LAVAGE_SECHAGE = "LAVAGE_SECHAGE", "Lavage, Essorage et Séchage (Wash & Dry)"
    REPASSAGE_PLASTIF = "REPASSAGE_PLASTIF", "Repassage et Plastification (Press & Wrap)"


class OrderStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    CONFIRMED = "CONFIRMED", "Confirmed"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    READY = "READY", "Ready"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY", "Out for Delivery"
    DELIVERED = "DELIVERED", "Delivered"
    CANCELLED = "CANCELLED", "Cancelled"


class PaymentStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    SUCCEEDED = "SUCCEEDED", "Succeeded"
    FAILED = "FAILED", "Failed"
    REFUNDED = "REFUNDED", "Refunded"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED", "Partially Refunded"


class PaymentGateway(models.TextChoices):
    STRIPE = "STRIPE", "Card (Stripe)"
    PAYPAL = "PAYPAL", "PayPal"
    MTN_MOMO = "MTN_MOMO", "MTN Mobile Money"
    ORANGE_MONEY = "ORANGE_MONEY", "Orange Money"
    CASH = "CASH", "Cash on Delivery/Pickup"
    CREDIT = "CREDIT", "Pay Later (Store Credit)"
