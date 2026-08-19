from django.db.models.signals import post_save
from django.dispatch import receiver

from core.tasks_utils import safe_delay

from .models import Message


@receiver(post_save, sender=Message)
def on_message_created(sender, instance, created, **kwargs):
    if not created:
        return

    from .tasks import notify_agent_new_message

    safe_delay(notify_agent_new_message, instance.pk)
