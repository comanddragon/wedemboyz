from django.conf import settings
from django.db import models

from core.constants import Currency, PaymentGateway, PaymentStatus
from core.models import TimeStampedModel


class PaymentMethod(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payment_methods"
    )
    gateway = models.CharField(max_length=20, choices=PaymentGateway.choices)
    # Never store raw card/MoMo numbers — only what's needed to display/identify it.
    display_label = models.CharField(
        max_length=50, help_text="e.g. 'MTN •••• 4521' or 'Visa •••• 1234'"
    )
    provider_token = models.CharField(
        max_length=255,
        blank=True,
        help_text="Opaque token/customer ID from the gateway (Stripe customer id, etc).",
    )
    is_default = models.BooleanField(default=False)

    class Meta:
        ordering = ["-is_default", "-created_at"]

    def __str__(self):
        return f"{self.display_label} ({self.user})"


class Payment(TimeStampedModel):
    # Exactly one of order/subscription is set — a Payment either settles a
    # one-off laundry order or activates a subscription plan. Both are
    # nullable so the same model/gateway/webhook plumbing can serve either
    # (see the CheckConstraint below).
    order = models.ForeignKey(
        "orders.Order", on_delete=models.PROTECT, null=True, blank=True, related_name="payments"
    )
    subscription = models.ForeignKey(
        "Subscription", on_delete=models.PROTECT, null=True, blank=True, related_name="payments"
    )
    method = models.ForeignKey(
        PaymentMethod, on_delete=models.SET_NULL, null=True, blank=True, related_name="payments"
    )
    gateway = models.CharField(max_length=20, choices=PaymentGateway.choices)
    gateway_reference = models.CharField(
        max_length=255, blank=True, help_text="Transaction ID returned by the gateway."
    )
    amount = models.DecimalField(max_digits=10, decimal_places=0)
    currency = models.CharField(
        max_length=3, choices=Currency.choices, default=Currency.XAF
    )
    status = models.CharField(
        max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["gateway", "gateway_reference"])]
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(order__isnull=False, subscription__isnull=True)
                    | models.Q(order__isnull=True, subscription__isnull=False)
                ),
                name="payment_targets_exactly_one_of_order_or_subscription",
            )
        ]

    def __str__(self):
        target = f"Order #{self.order_id}" if self.order_id else f"Subscription #{self.subscription_id}"
        return f"Payment<{self.pk}> {self.amount} {self.currency} — {self.status} ({target})"


class Invoice(TimeStampedModel):
    order = models.OneToOneField(
        "orders.Order", on_delete=models.CASCADE, related_name="invoice"
    )
    invoice_number = models.CharField(max_length=30, unique=True)
    pdf_file = models.FileField(upload_to="invoices/%Y/%m/", blank=True, null=True)
    amount_due = models.DecimalField(max_digits=10, decimal_places=0)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-issued_at"]

    def __str__(self):
        return self.invoice_number

    @property
    def is_settled(self):
        return self.amount_paid >= self.amount_due


class Refund(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        PROCESSED = "PROCESSED", "Processed"

    payment = models.ForeignKey(Payment, on_delete=models.PROTECT, related_name="refunds")
    amount = models.DecimalField(max_digits=10, decimal_places=0)
    reason = models.TextField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    processed_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="refunds_processed",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Refund<{self.pk}> {self.amount} for Payment #{self.payment_id}"


class Subscription(TimeStampedModel):
    class Plan(models.TextChoices):
        ESSENTIEL = "ESSENTIEL", "Pack Essentiel — 10kg / month"
        CONFORT = "CONFORT", "Pack Confort — 20kg / month"
        FAMILLE = "FAMILLE", "Pack Famille — 30kg / month"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending Payment"
        ACTIVE = "ACTIVE", "Active"
        PAUSED = "PAUSED", "Paused"
        CANCELLED = "CANCELLED", "Cancelled"
        EXPIRED = "EXPIRED", "Expired"

    class BillingCycle(models.TextChoices):
        ONE_TIME = "ONE_TIME", "One-time (single 30-day period)"
        MONTHLY = "MONTHLY", "Monthly auto-billing"

    # Recurring (MONTHLY) auto-billing is only offered through gateways that
    # actually support it on our side (Stripe Billing / PayPal Subscriptions).
    # MTN/Orange Mobile Money have no recurring-mandate API here, so they're
    # one-time-only — see SubscriptionCreateSerializer.validate and
    # SubscriptionCheckoutView.
    RECURRING_CAPABLE_GATEWAYS = (PaymentGateway.STRIPE, PaymentGateway.PAYPAL)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subscriptions"
    )
    plan = models.CharField(max_length=20, choices=Plan.choices)
    billing_cycle = models.CharField(
        max_length=10, choices=BillingCycle.choices, default=BillingCycle.ONE_TIME
    )
    # A subscription starts life PENDING (no pickups granted yet) and only
    # becomes ACTIVE once its payment succeeds — see
    # apps.payments.signals.on_payment_saved / apps.payments.tasks.activate_subscription.
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    # Kilos left on this plan for the current 30-day period (see
    # services.pricing.PLAN_KG_ALLOWANCE). Decimal, not an integer count of
    # pickups — kilos don't roll over between periods, and a pickup can
    # consume a fractional amount (e.g. 3.5kg).
    kg_remaining = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    start_date = models.DateField()
    end_date = models.DateField()

    # Set once checkout is initiated — which gateway is billing this plan,
    # and (for MONTHLY) the gateway-side subscription id used to renew/cancel
    # it (Stripe "sub_...", PayPal "I-..."). Blank for ONE_TIME plans once
    # paid, since there's nothing left to manage gateway-side afterwards.
    gateway = models.CharField(max_length=20, choices=PaymentGateway.choices, blank=True)
    external_subscription_id = models.CharField(max_length=255, blank=True)
    # MONTHLY cancel keeps billing/access through the period already paid
    # for, then stops renewing — this flags that intent without cutting the
    # user off immediately. ONE_TIME cancel just goes straight to CANCELLED.
    cancel_at_period_end = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} — {self.plan} ({self.status})"

    @property
    def is_recurring(self):
        return self.billing_cycle == self.BillingCycle.MONTHLY

    @classmethod
    def find_usable_for(cls, user, *, required_kg=None, today=None):
        """The subscription (if any) that should cover the user's next
        pickup: active, unexpired, with enough kilos left to cover
        required_kg (pass None to just check for a plan with any kilos
        remaining). Used by order creation to decide whether a pickup is
        covered by a plan. Callers placing an order should wrap this in
        `select_for_update()` via `.select_for_update().filter(...)`
        semantics — see OrderCreateSerializer."""
        from django.utils import timezone

        today = today or timezone.localdate()
        qs = cls.objects.select_for_update().filter(
            user=user,
            status=cls.Status.ACTIVE,
            start_date__lte=today,
            end_date__gte=today,
        )
        if required_kg is not None:
            qs = qs.filter(kg_remaining__gte=required_kg)
        else:
            qs = qs.filter(kg_remaining__gt=0)
        return qs.order_by("end_date").first()
