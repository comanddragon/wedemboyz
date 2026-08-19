import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer


class ChatConsumer(AsyncWebsocketConsumer):
    """
    ws://host/ws/chat/<room_id>/

    Broadcasts every message to everyone in the room's channel group and
    persists it via Message.objects.create so the REST API's message history
    stays consistent with what went over the socket.
    """

    async def connect(self):
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.group_name = f"chat_{self.room_id}"

        user = self.scope.get("user")
        if user is None or not user.is_authenticated:
            await self.close(code=4001)
            return

        has_access = await self._user_can_access_room(user, self.room_id)
        if not has_access:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        content = (data.get("content") or "").strip()
        if not content:
            return

        user = self.scope["user"]
        message = await self._save_message(self.room_id, user.pk, content)

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat_message",
                "message": {
                    "id": str(message.id) if hasattr(message, "id") else message.pk,
                    "room_id": self.room_id,
                    "sender_id": user.pk,
                    "content": content,
                    "created_at": message.created_at.isoformat(),
                },
            },
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    @database_sync_to_async
    def _user_can_access_room(self, user, room_id):
        from .models import ChatRoom

        if user.is_staff:
            return ChatRoom.objects.filter(pk=room_id).exists()
        return ChatRoom.objects.filter(pk=room_id).filter(_access_filter(user)).exists()

    @database_sync_to_async
    def _save_message(self, room_id, sender_id, content):
        from .models import ChatRoom, Message

        room = ChatRoom.objects.get(pk=room_id)
        return Message.objects.create(room=room, sender_id=sender_id, content=content)


def _access_filter(user):
    from django.db.models import Q

    return Q(customer=user) | Q(agent=user)