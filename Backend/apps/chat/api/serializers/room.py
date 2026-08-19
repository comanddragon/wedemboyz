from rest_framework import serializers
from django.contrib.auth import get_user_model

from apps.chat.models import ChatRoom, Message, MessageAttachment
from apps.orders.api.serializers import OrderDetailSerializer
User = get_user_model()

class ChatCustomerSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name"]

class MessageAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageAttachment
        fields = ["id", "file", "file_name", "content_type", "created_at"]
        read_only_fields = ["id", "created_at"]


class MessageSerializer(serializers.ModelSerializer):
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    sender_name = serializers.CharField(source="sender.get_full_name", read_only=True)

    class Meta:
        model = Message
        fields = ["id", "room", "sender", "sender_name", "content", "attachments", "read_at", "created_at"]
        read_only_fields = ["id", "room", "sender", "sender_name", "attachments", "read_at", "created_at"]


class MessageCreateSerializer(serializers.ModelSerializer):
    """REST fallback for sending a message — the websocket at
    ws/chat/<room_id>/ is the primary live channel for text-only messages;
    this also handles attachment uploads (multipart), which the websocket
    protocol doesn't carry. `content` is optional here because an
    attachment-only message (just a photo, no caption) is valid — enforced
    together with the files check in the view, not at the field level."""

    class Meta:
        model = Message
        fields = ["id", "content"]
        read_only_fields = ["id"]
        extra_kwargs = {"content": {"required": False, "allow_blank": True}}


class ChatRoomSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    order = OrderDetailSerializer()
    customer = ChatCustomerSerializer(read_only=True)

    class Meta:
        model = ChatRoom
        fields = [
            "id",
            "customer",
            "agent",
            "order",
            "status",
            "last_message",
            "unread_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "customer",
            "agent",
            "status",
            "last_message",
            "unread_count",
            "created_at",
            "updated_at",
        ]

    def get_last_message(self, obj):
        message = obj.messages.order_by("-created_at").first()
        return MessageSerializer(message).data if message else None

    def get_unread_count(self, obj):
        user = self.context["request"].user
        return obj.messages.filter(read_at__isnull=True).exclude(sender=user).count()


class ChatRoomCreateSerializer(serializers.ModelSerializer):
    """POST /api/v1/chat/rooms/ — the caller always becomes the customer;
    an agent gets assigned separately (e.g. via admin or a dispatch flow)."""

    class Meta:
        model = ChatRoom
        fields = ["id", "order"]
        read_only_fields = ["id"]

    def validate_order(self, order):
        if order is not None and order.user_id != self.context["request"].user.id:
            raise serializers.ValidationError("You do not own this order.")
        return order

    def create(self, validated_data):
        return ChatRoom.objects.create(customer=self.context["request"].user, **validated_data)
