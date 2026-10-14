from core.jobs import app


@app.task
def expire_promos():
    """
    Periodic database job that deactivates promo codes past valid_until.
    """
    from django.utils import timezone

    from apps.discounts.models import PromoCode

    expired_count = PromoCode.objects.filter(is_active=True, valid_until__lt=timezone.now()).update(
        is_active=False
    )
    return expired_count
