from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationSerializer


@extend_schema(tags=["notifications"])
class NotificationViewSet(viewsets.GenericViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Notification.objects.filter(recipient_user=self.request.user)
            .order_by("-created_at")
        )

    @extend_schema(summary="List notifications")
    def list(self, request):
        queryset = self.get_queryset()
        is_read_param = request.query_params.get("is_read")
        if is_read_param is not None:
            is_read_val = is_read_param.lower() == "true"
            queryset = queryset.filter(is_read=is_read_val)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @extend_schema(summary="Mark notification as read")
    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if notification.recipient_user != request.user:
            return Response(
                {"error": "You can only mark your own notifications as read"},
                status=status.HTTP_403_FORBIDDEN,
            )
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response({"status": "ok"})

    @extend_schema(summary="Mark all notifications as read")
    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"status": "ok", "updated_count": updated})
