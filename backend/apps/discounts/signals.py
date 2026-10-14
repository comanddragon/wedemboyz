from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import PromoUsage


@receiver(post_save, sender=PromoUsage)
def on_promo_used(sender, instance, created, **kwargs):
    """
    Deactivate a single-use promo once it hits max_uses. Bulk/unlimited promos
    (max_uses=None) are left alone.
    """
    if not created:
        return

    promo = instance.promo_code
    if promo.max_uses is not None and promo.times_used() >= promo.max_uses:
        promo.is_active = False
        promo.save(update_fields=["is_active"])
