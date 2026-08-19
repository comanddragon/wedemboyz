from config.celery import app


@app.task(bind=True, max_retries=3, default_retry_delay=30)
def notify_agent_new_message(self, message_id: int):
    from apps.chat.models import Message
    from apps.notifications.models import Notification

    try:
        message = Message.objects.select_related("room", "room__agent", "sender").get(pk=message_id)
        room = message.room

        # Customer messaged in -> notify the assigned agent (if any).
        # Agent messaged in -> notify the customer. Never notify the sender themselves.
        recipient = room.agent if message.sender_id == room.customer_id else room.customer
        if recipient is None or recipient.pk == message.sender_id:
            return

        Notification.objects.create(
            user=recipient,
            notification_type=Notification.NotificationType.CHAT,
            title="New chat message",
            body=message.content[:200] if message.content.strip() else "📎 Sent an attachment",
        )
    except Exception as exc:
        raise self.retry(exc=exc)
