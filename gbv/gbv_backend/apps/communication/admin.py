from django.contrib import admin

from apps.communication.models import Conversation, Message, MessageAttachment


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["id", "case", "created_at"]
    search_fields = ["case__id"]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["id", "conversation", "sender_actor_type", "sent_at", "read_at"]
    list_filter = ["sender_actor_type", "sent_at"]
    search_fields = ["id", "conversation__id"]


@admin.register(MessageAttachment)
class MessageAttachmentAdmin(admin.ModelAdmin):
    list_display = ["id", "message", "file_type", "created_at"]
    search_fields = ["message__id"]
