from core.jobs import app


@app.task(bind=True, max_retries=3, default_retry_delay=30)
def notify_agent_new_message(self, message_id: int):
    from apps.chat.models import Message
    from services.notifications import notify

    try:
        message = Message.objects.select_related("room", "room__agent", "sender").get(pk=message_id)
        room = message.room

        # Customer messaged in -> notify the assigned agent (if any).
        # Agent messaged in -> notify the customer. Never notify the sender themselves.
        recipient = room.agent if message.sender_id == room.customer_id else room.customer
        if recipient is None or recipient.pk == message.sender_id:
            return

        preview = message.content[:200] if message.content.strip() else "Attachment"
        notify(
            recipient,
            key=f"chat/message/{message.pk}/user/{recipient.pk}",
            kind="CHAT",
            title=("New chat message", "Nouveau message"),
            body=(preview, preview),
            path=f"{'admin/' if recipient.is_staff else ''}chat/{room.pk}",
        )
    except Exception as exc:
        raise self.retry(exc=exc)
