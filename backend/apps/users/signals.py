from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from core.tasks_utils import safe_delay

from .models import CustomUser, LoyaltyAccount, UserProfile


@receiver(post_save, sender=CustomUser)
def on_user_created(sender, instance, created, **kwargs):
    if not created:
        return
    UserProfile.objects.get_or_create(user=instance)
    LoyaltyAccount.objects.get_or_create(user=instance)

    # Demo seeding creates non-routable contacts and must never enqueue
    # provider traffic in an internet-facing environment.
    if getattr(settings, "SEED_DATA_ACTIVE", False):
        return

    from .tasks import send_welcome_sms

    safe_delay(send_welcome_sms, instance.pk)
