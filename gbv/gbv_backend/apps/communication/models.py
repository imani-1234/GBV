from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class Conversation(BaseModel):
    case = models.OneToOneField(
        "cases.Case",
        on_delete=models.CASCADE,
        related_name="conversation",
    )

    class Meta:
        db_table = "conversations"
        verbose_name = "Conversation"

    def __str__(self):
        return f"Conversation for Case {self.case_id}"


class Message(BaseModel):
    class ActorType(models.TextChoices):
        REPORTER = "REPORTER", "Reporter"
        ANONYMOUS_REPORTER = "ANONYMOUS_REPORTER", "Anonymous Reporter"
        OFFICER = "OFFICER", "Officer"
        ADMIN = "ADMIN", "Admin"

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender_actor_type = models.CharField(
        max_length=50,
        choices=ActorType.choices,
    )
    sender_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sent_messages",
    )
    sender_anonymous_reporter = models.ForeignKey(
        "accounts.AnonymousReporter",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sent_messages",
    )
    body = models.TextField(blank=True, null=True)
    sent_at = models.DateTimeField(auto_now_add=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "messages"
        ordering = ["sent_at"]
        verbose_name = "Message"
        constraints = [
            models.CheckConstraint(
                name="chk_message_single_sender",
                condition=(
                    models.Q(sender_user__isnull=False, sender_anonymous_reporter__isnull=True)
                    | models.Q(sender_user__isnull=True, sender_anonymous_reporter__isnull=False)
                ),
            ),
        ]

    def __str__(self):
        return f"Message {self.id} in Conversation {self.conversation_id}"


class MessageAttachment(BaseModel):
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.FileField(upload_to="message_attachments/", max_length=500)
    file_type = models.CharField(max_length=20, blank=True, default="")

    class Meta:
        db_table = "message_attachments"
        verbose_name = "Message Attachment"
        verbose_name_plural = "Message Attachments"

    def __str__(self):
        return f"Attachment {self.id} for Message {self.message_id}"
