from rest_framework import serializers

from apps.communication.models import Message, MessageAttachment


class MessageAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageAttachment
        fields = ["id", "file", "created_at"]
        read_only_fields = ["id", "created_at"]


class MessageListSerializer(serializers.ModelSerializer):
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "sender_actor_type",
            "sender_name",
            "body",
            "sent_at",
            "read_at",
            "attachments",
        ]
        read_only_fields = ["id", "sent_at", "read_at", "attachments"]

    def get_sender_name(self, obj):
        if obj.sender_user:
            return obj.sender_user.full_name
        if obj.sender_anonymous_reporter:
            return "Anonymous Reporter"
        return ""
