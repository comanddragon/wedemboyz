from django.db.models import F
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import CreditAccount, CreditTransaction


@receiver(post_save, sender=CreditTransaction)
def on_credit_transaction_created(sender, instance, created, **kwargs):
    """Keep CreditAccount.balance as a running total of its transactions.
    Only applied once, on creation — transactions are treated as immutable
    ledger entries (correct mistakes with a new offsetting ADJUSTMENT)."""
    if not created:
        return

    CreditAccount.objects.filter(pk=instance.credit_account_id).update(
        balance=F("balance") + instance.signed_amount()
    )
