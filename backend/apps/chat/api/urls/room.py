from django.urls import path

from apps.chat.api.views import (
    ChatRoomAssignView,
    ChatRoomClaimView,
    ChatRoomCloseView,
    ChatRoomDetailView,
    ChatRoomListCreateView,
    ChatRoomReopenView,
    MarkMessagesReadView,
    MessageListCreateView,
)

urlpatterns = [
    path("rooms/", ChatRoomListCreateView.as_view(), name="chat-room-list"),
    path("rooms/<int:pk>/", ChatRoomDetailView.as_view(), name="chat-room-detail"),
    path("rooms/<int:pk>/close/", ChatRoomCloseView.as_view(), name="chat-room-close"),
    path("rooms/<int:pk>/reopen/", ChatRoomReopenView.as_view(), name="chat-room-reopen"),
    path("rooms/<int:pk>/assign/", ChatRoomAssignView.as_view(), name="chat-room-assign"),
    path("rooms/<int:pk>/claim/", ChatRoomClaimView.as_view(), name="chat-room-claim"),
    path("rooms/<int:room_id>/messages/", MessageListCreateView.as_view(), name="chat-message-list"),
    path("rooms/<int:room_id>/read/", MarkMessagesReadView.as_view(), name="chat-mark-read"),
]
