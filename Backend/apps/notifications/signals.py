from django.db.models.signals import post_save
from django.dispatch import receiver

from core.tasks_utils import safe_delay

from .models import Notification


@receiver(post_save, sender=Notification)
def on_notification_created(sender, instance, created, **kwargs):
    if not created:
        return

    from .tasks import send_email, send_push, send_sms, send_whatsapp

    # Each task checks its own NotificationPreference flag before actually
    # sending, so it's safe to always enqueue all four — the ones that are
    # disabled or unconfigured (e.g. no email on file) just no-op.
    safe_delay(send_sms, instance.pk)
    safe_delay(send_email, instance.pk)
    safe_delay(send_whatsapp, instance.pk)
    safe_delay(send_push, instance.pk)
