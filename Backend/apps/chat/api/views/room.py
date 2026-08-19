from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.chat.api.serializers import (
    ChatRoomCreateSerializer,
    ChatRoomSerializer,
    MessageCreateSerializer,
    MessageSerializer,
)
from apps.chat.constants import (
    ALLOWED_ATTACHMENT_CONTENT_TYPES,
    MAX_ATTACHMENT_SIZE_BYTES,
    MAX_ATTACHMENTS_PER_MESSAGE,
)
from apps.chat.models import ChatRoom, Message, MessageAttachment
from apps.chat.realtime import broadcast_message


def _assert_room_access(request, room):
    if not (request.user.is_staff or room.customer_id == request.user.id or room.agent_id == request.user.id):
        raise PermissionDenied("You do not have access to this chat room.")


def _validate_attachment_files(files):
    if len(files) > MAX_ATTACHMENTS_PER_MESSAGE:
        raise ValidationError(f"A message can have at most {MAX_ATTACHMENTS_PER_MESSAGE} attachments.")
    for f in files:
        if f.size > MAX_ATTACHMENT_SIZE_BYTES:
            raise ValidationError(f"'{f.name}' is too large (max {MAX_ATTACHMENT_SIZE_BYTES // (1024 * 1024)}MB).")
        content_type = getattr(f, "content_type", "") or ""
        if content_type not in ALLOWED_ATTACHMENT_CONTENT_TYPES:
            raise ValidationError(
                f"'{f.name}' has unsupported type '{content_type}'. "
                f"Allowed: images (jpeg/png/webp/gif) and PDF."
            )


class ChatRoomListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/chat/rooms/"""

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ChatRoom.objects.select_related("customer", "agent", "order")
        if user.is_staff:
            return qs
        return qs.filter(Q(customer=user) | Q(agent=user))

    def get_serializer_class(self):
        return ChatRoomCreateSerializer if self.request.method == "POST" else ChatRoomSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        room = serializer.save()
        output = ChatRoomSerializer(room, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_201_CREATED)


class ChatRoomDetailView(generics.RetrieveAPIView):
    """GET /api/v1/chat/rooms/{id}/"""

    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ChatRoom.objects.select_related("customer", "agent", "order")
        if user.is_staff:
            return qs
        return qs.filter(Q(customer=user) | Q(agent=user))


class ChatRoomCloseView(APIView):
    """POST /api/v1/chat/rooms/{id}/close/ — assigned agent or staff only."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        room = get_object_or_404(ChatRoom, pk=pk)
        if not (request.user.is_staff or room.agent_id == request.user.id):
            raise PermissionDenied("Only an assigned agent or staff can close a chat.")

        room.status = ChatRoom.Status.CLOSED
        room.save(update_fields=["status"])
        return Response(ChatRoomSerializer(room, context={"request": request}).data)


class MessageListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/chat/rooms/{room_id}/messages/ — message history plus
    a REST fallback for sending (see MessageCreateSerializer). Also the
    upload path for attachments: send multipart/form-data with an optional
    `content` field and one or more files under the `attachments` key.
    """

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_room(self):
        room = get_object_or_404(ChatRoom, pk=self.kwargs["room_id"])
        _assert_room_access(self.request, room)
        return room

    def get_queryset(self):
        room = self.get_room()
        return Message.objects.filter(room=room).select_related("sender").prefetch_related("attachments")

    def get_serializer_class(self):
        return MessageCreateSerializer if self.request.method == "POST" else MessageSerializer

    def create(self, request, *args, **kwargs):
        room = self.get_room()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        content = serializer.validated_data.get("content", "")

        files = request.FILES.getlist("attachments")
        if not content.strip() and not files:
            raise ValidationError("Message must include text or at least one attachment.")
        _validate_attachment_files(files)

        message = Message.objects.create(room=room, sender=request.user, content=content)
        for f in files:
            MessageAttachment.objects.create(
                message=message,
                file=f,
                file_name=f.name,
                content_type=getattr(f, "content_type", "") or "",
            )

        message = (
            Message.objects.select_related("sender").prefetch_related("attachments").get(pk=message.pk)
        )
        broadcast_message(message)

        return Response(
            MessageSerializer(message, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )


class MarkMessagesReadView(APIView):
    """POST /api/v1/chat/rooms/{room_id}/read/ — marks every message not
    sent by the caller as read."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_id):
        room = get_object_or_404(ChatRoom, pk=room_id)
        _assert_room_access(request, room)

        updated = Message.objects.filter(room=room, read_at__isnull=True).exclude(sender=request.user).update(
            read_at=timezone.now()
        )
        return Response({"marked_read": updated})
