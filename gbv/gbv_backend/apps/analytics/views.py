from datetime import timedelta

from django.db.models import Avg, Count, DurationField, ExpressionWrapper, F, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.models import AuditLog
from apps.core.permissions import IsAdminUser
from apps.reports.models import Report
from apps.cases.models import Case


class AnalyticsPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


@extend_schema(tags=["analytics"])
class AnalyticsViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]

    @extend_schema(summary="System summary statistics")
    @action(detail=False, methods=["get"])
    def summary(self, request):
        total = Report.objects.count()

        by_status = dict(
            Report.objects.values("status")
            .annotate(count=Count("id"))
            .values_list("status", "count")
        )

        by_category = list(
            Report.objects.values("category__name")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        by_priority = dict(
            Report.objects.values("priority")
            .annotate(count=Count("id"))
            .values_list("priority", "count")
        )

        reporter_counts = Report.objects.aggregate(
            anonymous=Count("id", filter=Q(anonymous_reporter__isnull=False)),
            identified=Count("id", filter=Q(reporter__isnull=False)),
        )

        resolved_cases = Case.objects.filter(
            status=Case.Status.CLOSED,
            closed_at__isnull=False,
            opened_at__isnull=False,
        )
        avg_resolution = resolved_cases.annotate(
            diff=ExpressionWrapper(
                F("closed_at") - F("opened_at"),
                output_field=DurationField(),
            )
        ).aggregate(avg_seconds=Avg("diff"))

        avg_seconds = avg_resolution["avg_seconds"]
        if avg_seconds is not None:
            avg_seconds = int(avg_seconds.total_seconds())

        return Response({
            "total_reports": total,
            "by_status": by_status,
            "by_category": by_category,
            "by_priority": by_priority,
            "anonymous_reports": reporter_counts["anonymous"],
            "identified_reports": reporter_counts["identified"],
            "avg_resolution_time_seconds": avg_seconds,
        })

    @extend_schema(summary="Reports by department")
    @action(detail=False, methods=["get"], url_path="by-department")
    def by_department(self, request):
        data = list(
            Report.objects.values("department")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        return Response(data)

    @extend_schema(summary="Reports by month")
    @action(detail=False, methods=["get"], url_path="by-month")
    def by_month(self, request):
        twelve_months_ago = timezone.now() - timedelta(days=365)
        rows = (
            Report.objects.filter(created_at__gte=twelve_months_ago)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(
                count=Count("id"),
                resolved=Count("id", filter=Q(case__status=Case.Status.CLOSED)),
            )
            .order_by("month")
        )
        result = []
        for row in rows:
            count = row["count"]
            resolved = row["resolved"]
            rate = round(resolved / count * 100, 1) if count else 0.0
            result.append({
                "month": row["month"].isoformat() if row["month"] else None,
                "count": count,
                "resolved": resolved,
                "resolution_rate": rate,
            })
        return Response(result)

    @extend_schema(summary="Audit log entries")
    @action(detail=False, methods=["get"], url_path="audit-logs")
    def audit_logs(self, request):
        queryset = AuditLog.objects.select_related("actor").all()

        actor_type = request.query_params.get("actor_type")
        if actor_type:
            queryset = queryset.filter(actor_type=actor_type)

        action_filter = request.query_params.get("action")
        if action_filter:
            queryset = queryset.filter(action=action_filter)

        resource_type = request.query_params.get("resource_type")
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)

        date_from = request.query_params.get("date_from")
        if date_from:
            queryset = queryset.filter(timestamp__gte=date_from)

        date_to = request.query_params.get("date_to")
        if date_to:
            queryset = queryset.filter(timestamp__lte=date_to)

        paginator = AnalyticsPagination()
        page = paginator.paginate_queryset(queryset, request)
        data = [
            {
                "id": str(entry.id),
                "actor_type": entry.actor_type,
                "actor_identifier": entry.actor_identifier,
                "action": entry.action,
                "resource_type": entry.resource_type,
                "resource_id": entry.resource_id,
                "timestamp": entry.timestamp.isoformat(),
                "ip_address": str(entry.ip_address) if entry.ip_address else None,
                "metadata": entry.metadata,
            }
            for entry in page
        ]
        return paginator.get_paginated_response(data)
