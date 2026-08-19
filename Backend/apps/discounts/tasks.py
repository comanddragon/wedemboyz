from config.celery import app


@app.task
def expire_promos():
    """
    Periodic (Celery beat) task — deactivates promo codes past their
    valid_until date. Register in django-celery-beat's admin, e.g. daily.
    """
    from django.utils import timezone

    from apps.discounts.models import PromoCode

    expired_count = PromoCode.objects.filter(
        is_active=True, valid_until__lt=timezone.now()
    ).update(is_active=False)
    return expired_count
