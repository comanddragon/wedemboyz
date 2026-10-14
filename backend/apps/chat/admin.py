from django.contrib import admin

from .models import ChatRoom, Message, MessageAttachment


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ["sender", "content", "created_at", "read_at"]
    can_delete = False


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ["id", "customer", "agent", "order", "status", "updated_at"]
    list_filter = ["status"]
    search_fields = ["customer__phone_number", "agent__phone_number"]
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["room", "sender", "created_at", "read_at"]
    search_fields = ["content"]


@admin.register(MessageAttachment)
class MessageAttachmentAdmin(admin.ModelAdmin):
    list_display = ["message", "file_name", "content_type"]
