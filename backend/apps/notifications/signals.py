from django.db.models.signals import post_save
from django.dispatch import receiver

from core.jobs import enqueue

from .models import Notification


@receiver(post_save, sender=Notification)
def on_notification_created(sender, instance, created, raw=False, **kwargs):
    from django.conf import settings

    if not created or raw or getattr(settings, "SEED_DATA_ACTIVE", False):
        return

    from .tasks import send_email, send_push, send_sms, send_whatsapp

    # Persist delivery jobs in the business transaction. A worker cannot see
    # them before commit, and a rollback removes the inbox row and its jobs.
    # Every delivery task rechecks the current preferences before sending.
    def queue(task):
        enqueue(
            task.name,
            args=[instance.pk],
            max_attempts=task.max_attempts,
            idempotency_key=f"notification/{instance.pk}/{task.name}",
        )

    if not getattr(instance, "_skip_sms", False):
        queue(send_sms)
    # Freeze and queue the email inside the notification transaction. Its first
    # delivery attempt runs after commit, without an extra queued dispatch hop.
    if not getattr(instance, "_skip_email", False):
        send_email(instance.pk)
    queue(send_whatsapp)
    queue(send_push)
