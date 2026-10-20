from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.chat.api.serializers import (
    ChatRoomAssignmentSerializer,
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
from apps.staff.models import log_activity
from apps.staff.permissions import HasStaffPermission, StaffPermission, has_staff_permission


def _assert_room_access(request, room):
    staff_can_chat = request.user.is_staff and has_staff_permission(
        request.user, StaffPermission.CHAT_MANAGE
    )
    if not (
        staff_can_chat
        or room.customer_id == request.user.id
        or room.agent_id == request.user.id
    ):
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
        qs = ChatRoom.objects.select_related(
            "customer", "agent", "assigned_by", "order"
        )
        if user.is_staff:
            if not has_staff_permission(user, StaffPermission.CHAT_MANAGE):
                return qs.none()
            status_filter = self.request.query_params.get("status")
            assignment = self.request.query_params.get("assignment")
            agent_id = self.request.query_params.get("agent")
            search = self.request.query_params.get("search", "").strip()
            if status_filter in ChatRoom.Status.values:
                qs = qs.filter(status=status_filter)
            if assignment == "unassigned":
                qs = qs.filter(agent__isnull=True, status=ChatRoom.Status.OPEN)
            elif assignment == "mine":
                qs = qs.filter(agent=user)
            if agent_id and agent_id.isdigit():
                qs = qs.filter(agent_id=int(agent_id))
            if search:
                search_filter = (
                    Q(customer__first_name__icontains=search)
                    | Q(customer__last_name__icontains=search)
                    | Q(customer__phone_number__icontains=search)
                )
                if search.isdigit():
                    search_filter |= Q(order_id=int(search))
                qs = qs.filter(search_filter)
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
        qs = ChatRoom.objects.select_related(
            "customer", "agent", "assigned_by", "order"
        )
        if user.is_staff:
            return qs if has_staff_permission(user, StaffPermission.CHAT_MANAGE) else qs.none()
        return qs.filter(Q(customer=user) | Q(agent=user))


class ChatRoomCloseView(APIView):
    """POST /api/v1/chat/rooms/{id}/close/ — assigned agent or staff only."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        room = get_object_or_404(ChatRoom, pk=pk)
        can_manage = request.user.is_staff and has_staff_permission(
            request.user, StaffPermission.CHAT_MANAGE
        )
        if not (can_manage or room.agent_id == request.user.id):
            raise PermissionDenied("Only an assigned agent or staff can close a chat.")

        room.status = ChatRoom.Status.CLOSED
        room.closed_at = timezone.now()
        room.save(update_fields=["status", "closed_at", "updated_at"])
        log_activity(request.user, "chat.closed", f"Closed chat #{room.pk}")
        return Response(ChatRoomSerializer(room, context={"request": request}).data)


class ChatRoomReopenView(APIView):
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.CHAT_MANAGE

    def post(self, request, pk):
        room = get_object_or_404(ChatRoom, pk=pk)
        room.status = ChatRoom.Status.OPEN
        room.closed_at = None
        room.save(update_fields=["status", "closed_at", "updated_at"])
        log_activity(request.user, "chat.reopened", f"Reopened chat #{room.pk}")
        return Response(ChatRoomSerializer(room, context={"request": request}).data)


class ChatRoomAssignView(APIView):
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.CHAT_MANAGE

    def post(self, request, pk):
        room = get_object_or_404(ChatRoom, pk=pk)
        if room.status == ChatRoom.Status.CLOSED:
            raise ValidationError("Reopen this conversation before assigning it.")
        serializer = ChatRoomAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        agent_id = serializer.validated_data.get("agent_id")
        previous_agent_id = room.agent_id
        room.agent = getattr(serializer, "agent", None) if agent_id is not None else None
        room.assigned_by = request.user if agent_id is not None else None
        room.assigned_at = timezone.now() if agent_id is not None else None
        room.save(update_fields=["agent", "assigned_by", "assigned_at", "updated_at"])
        action = "chat.assigned" if agent_id is not None else "chat.unassigned"
        description = (
            f"Assigned chat #{room.pk} to user #{agent_id}"
            if agent_id is not None
            else f"Unassigned chat #{room.pk} from user #{previous_agent_id}"
        )
        log_activity(request.user, action, description)
        return Response(ChatRoomSerializer(room, context={"request": request}).data)


class ChatRoomClaimView(APIView):
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.CHAT_MANAGE

    def post(self, request, pk):
        room = get_object_or_404(ChatRoom, pk=pk)
        if room.status == ChatRoom.Status.CLOSED:
            raise ValidationError("Reopen this conversation before claiming it.")
        if room.agent_id and room.agent_id != request.user.id:
            raise ValidationError("This conversation is already assigned.")
        profile = getattr(request.user, "staff_profile", None)
        if profile is not None and not profile.can_receive_chats:
            raise ValidationError("You are not currently available for chat assignment.")
        room.agent = request.user
        room.assigned_by = request.user
        room.assigned_at = timezone.now()
        room.save(update_fields=["agent", "assigned_by", "assigned_at", "updated_at"])
        log_activity(request.user, "chat.claimed", f"Claimed chat #{room.pk}")
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
