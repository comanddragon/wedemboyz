from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def broadcast_message(message):
    """Push `message` (with its attachments already saved) onto the room's
    channel group. Mirrors the payload shape ChatConsumer.receive() already
    sends for text messages, plus an `attachments` list."""
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return  # channel layer not configured (e.g. some test setups) — skip silently

    async_to_sync(channel_layer.group_send)(
        f"chat_{message.room_id}",
        {
            "type": "chat_message",
            "message": {
                "id": message.pk,
                "room_id": message.room_id,
                "sender_id": message.sender_id,
                "content": message.content,
                "created_at": message.created_at.isoformat(),
                "attachments": [
                    {
                        "id": a.pk,
                        "file": a.file.url,
                        "file_name": a.file_name,
                        "content_type": a.content_type,
                    }
                    for a in message.attachments.all()
                ],
            },
        },
    )
