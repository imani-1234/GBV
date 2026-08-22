from django.contrib.auth import get_user_model
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.cases.models import Case
from apps.communication.models import Conversation, Message, MessageAttachment
from apps.communication.permissions import CanAccessConversation
from apps.communication.serializers import MessageListSerializer
from apps.core.permissions import AuditLogMixin, _audit_log
from apps.core.utils import MAX_FILE_SIZE, validate_file_type

User = get_user_model()


@extend_schema(tags=["communication"])
class MessageViewSet(AuditLogMixin, viewsets.GenericViewSet):
    serializer_class = MessageListSerializer
    permission_classes = [CanAccessConversation]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    resource_type = "message"
    resource_actions = {
        "list": "read",
        "create": "send",
        "mark_read": "read",
    }

    def get_queryset(self):
        return (
            Message.objects.filter(conversation__case_id=self.kwargs["case_pk"])
            .select_related("sender_user", "sender_anonymous_reporter")
            .prefetch_related("attachments")
            .order_by("sent_at")
        )

    def _get_case(self, case_pk):
        try:
            return Case.objects.get(pk=case_pk)
        except Case.DoesNotExist:
            return None

    @extend_schema(summary="List messages for a case")
    def list(self, request, case_pk=None):
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @extend_schema(summary="Send a message")
    def create(self, request, case_pk=None):
        case = self._get_case(case_pk)
        if case is None:
            return Response(
                {"error": "Case not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        body = request.data.get("body", "")
        if not body and not request.FILES.getlist("attachments"):
            return Response(
                {"error": "Message must have a body or at least one attachment"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sender_user = None
        sender_anonymous_reporter = None
        sender_actor_type = ""

        if request.auth and request.auth.get("actor_type") == "anonymous_reporter":
            from apps.accounts.models import AnonymousReporter

            reporter_code = request.auth.get("reporter_code", "")
            try:
                sender_anonymous_reporter = AnonymousReporter.objects.get(
                    reporter_code=reporter_code
                )
            except AnonymousReporter.DoesNotExist:
                return Response(
                    {"error": "Anonymous reporter not found"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            sender_actor_type = Message.ActorType.ANONYMOUS_REPORTER
        else:
            sender_user = request.user
            role = getattr(request.user, "role", "")
            sender_actor_type = role

        conversation, _ = Conversation.objects.get_or_create(case=case)

        message = Message.objects.create(
            conversation=conversation,
            sender_actor_type=sender_actor_type,
            sender_user=sender_user,
            sender_anonymous_reporter=sender_anonymous_reporter,
            body=body or None,
        )
        self.log_audit_create(message)

        files = request.FILES.getlist("attachments")
        for f in files:
            if f.size > MAX_FILE_SIZE:
                return Response(
                    {
                        "error": f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            file_type = validate_file_type(f)
            if not file_type:
                return Response(
                    {"error": f"File type not allowed: {f.name}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            MessageAttachment.objects.create(
                message=message,
                file=f,
                file_type=file_type,
            )

        serializer = MessageListSerializer(message, context={"request": request})
        _audit_log(
            request,
            "MESSAGE_SENT",
            instance=message,
            metadata={"message_id": str(message.id)},
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(summary="Mark message as read")
    def mark_read(self, request, case_pk=None, message_id=None):
        message = (
            self.get_queryset().filter(pk=message_id).first()
        )
        if not message:
            return Response(
                {"error": "Message not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        if message.read_at is None:
            message.read_at = timezone.now()
            message.save(update_fields=["read_at"])
            self.log_audit_update(message, extra={"action": "mark_read"})
        return Response({"status": "ok"})
