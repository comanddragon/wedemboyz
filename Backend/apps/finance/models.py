from django.conf import settings
from django.db import models

from core.constants import Currency
from core.models import TimeStampedModel


class ExpenseCategory(models.TextChoices):
    SUPPLIES = "SUPPLIES", "Supplies (detergent, softener, packaging)"
    UTILITIES = "UTILITIES", "Utilities (water, electricity)"
    SALARIES = "SALARIES", "Salaries"
    MAINTENANCE = "MAINTENANCE", "Equipment maintenance"
    RENT = "RENT", "Rent"
    OTHER = "OTHER", "Other"


class Expense(TimeStampedModel):
    category = models.CharField(max_length=20, choices=ExpenseCategory.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=0)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.XAF)
    date = models.DateField(help_text="Date the expense was incurred (not necessarily today).")
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses_recorded",
    )

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [models.Index(fields=["date", "category"])]

    def __str__(self):
        return f"{self.category} — {self.amount} {self.currency} ({self.date})"


class CreditAccount(TimeStampedModel):
    """One per customer. `balance` is the amount currently owed to the
    business (positive = customer owes money; it never goes negative — an
    overpayment should be recorded as a refund/adjustment instead)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="credit_account"
    )
    balance = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    credit_limit = models.DecimalField(
        max_digits=10, decimal_places=0, default=0, help_text="0 = no limit enforced."
    )

    class Meta:
        ordering = ["-balance"]

    def __str__(self):
        return f"CreditAccount<{self.user}> owes {self.balance}"


class CreditTransaction(TimeStampedModel):
    class TransactionType(models.TextChoices):
        CHARGE = "CHARGE", "Charge (customer took goods/services on credit)"
        PAYMENT = "PAYMENT", "Payment (customer paid down their balance)"
        ADJUSTMENT = "ADJUSTMENT", "Manual adjustment"

    credit_account = models.ForeignKey(
        CreditAccount, on_delete=models.CASCADE, related_name="transactions"
    )
    transaction_type = models.CharField(max_length=10, choices=TransactionType.choices)
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=0,
        help_text=(
            "For CHARGE/PAYMENT, a positive magnitude (sign is derived from "
            "transaction_type). For ADJUSTMENT, may be signed directly: "
            "positive increases the balance owed, negative reduces it."
        ),
    )
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="credit_transactions",
    )
    note = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="credit_transactions_recorded",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.transaction_type} {self.amount} — {self.credit_account}"

    def signed_amount(self):
        if self.transaction_type == self.TransactionType.PAYMENT:
            return -self.amount
        if self.transaction_type == self.TransactionType.ADJUSTMENT:
            return self.amount  # positive increases debt, negative reduces it
        return self.amount  # CHARGE
