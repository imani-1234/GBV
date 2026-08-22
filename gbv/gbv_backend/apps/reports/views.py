from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.cases.models import Case
from apps.core.permissions import AuditLogMixin, CanAccessReport, IsAdminUser, _audit_log
from apps.core.utils import MAX_FILE_SIZE, validate_file_type
from apps.reports.models import Evidence, IncidentCategory, Report
from apps.reports.serializers import (
    EvidenceSerializer,
    IncidentCategorySerializer,
    ReportCreateSerializer,
    ReportDetailSerializer,
    ReportSubmitSerializer,
)
from apps.reports.utils import generate_case_number
from drf_spectacular.utils import extend_schema


@extend_schema(tags=["reports"])
class ReportViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Report.objects.select_related(
        "reporter", "anonymous_reporter", "category", "assigned_officer"
    ).prefetch_related("evidence").all().order_by("-created_at")
    permission_classes = [CanAccessReport]
    resource_type = "report"
    # "list" is intentionally mapped to the coarse read_own action rather than
    # read_all: the permission class only gates WHICH action is allowed, while
    # get_queryset() below performs the per-user row scoping. PERMISSION_MATRIX
    # grants REPORTERs only read_own (never read_all), so mapping list to
    # read_all 403s the reporter's dashboard even though retrieve (read_own)
    # works. DRF calls has_permission for list and has_object_permission only
    # for detail, so list must be gated at the action level, not the object level.
    resource_actions = {
        "list": "read_own",
        "retrieve": "read_own",
        "create": "create",
        "update": "update_draft",
        "partial_update": "update_draft",
        "destroy": "close",
        "submit": "submit",
        "upload_evidence": "evidence_upload",
    }

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ReportCreateSerializer
        if self.action == "submit":
            return ReportSubmitSerializer
        return ReportDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if user.is_anonymous:
            if self.request.auth and self.request.auth.get("actor_type") == "anonymous_reporter":
                reporter_code = self.request.auth.get("reporter_code", "")
                return qs.filter(anonymous_reporter__reporter_code=reporter_code)
            return qs.none()

        role = getattr(user, "role", None)
        if role == "ADMIN":
            return qs
        if role == "OFFICER":
            return qs.filter(assigned_officer=user) | qs.filter(assigned_officer__isnull=True)
        if role == "REPORTER":
            return qs.filter(reporter=user)
        return qs.none()

    @extend_schema(summary="Create a draft report")
    def create(self, request, *args, **kwargs):
        create_serializer = self.get_serializer(data=request.data)
        create_serializer.is_valid(raise_exception=True)
        self.perform_create(create_serializer)
        instance = create_serializer.instance
        detail_serializer = ReportDetailSerializer(instance, context={"request": request})
        headers = self.get_success_headers(detail_serializer.data)
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @extend_schema(summary="Update a draft report")
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        if instance.status != Report.Status.DRAFT:
            _audit_log(
                request,
                "ACCESS_DENIED",
                instance=instance,
                metadata={
                    "reason": "Cannot modify a submitted report",
                    "requested_action": "update_draft",
                },
            )
            self.permission_denied(request, message="Cannot modify a submitted report")
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        detail_serializer = ReportDetailSerializer(serializer.instance, context={"request": request})
        return Response(detail_serializer.data)

    def perform_create(self, serializer):
        if self.request.auth and self.request.auth.get("actor_type") == "anonymous_reporter":
            from apps.accounts.models import AnonymousReporter

            reporter_code = self.request.auth.get("reporter_code", "")
            anon_reporter = AnonymousReporter.objects.get(reporter_code=reporter_code)
            instance = serializer.save(anonymous_reporter=anon_reporter)
        else:
            instance = serializer.save(reporter=self.request.user)
        self.log_audit_create(instance)

    def perform_update(self, serializer):
        instance = self.get_object()
        old = Report.objects.get(pk=instance.pk)
        instance = serializer.save()
        self._log_update_diff(old, instance)

    def perform_destroy(self, instance):
        self.log_audit_delete(instance)
        instance.delete()

    def _log_update_diff(self, old, new):
        changed = {}
        for field in ReportCreateSerializer.Meta.fields:
            old_val = getattr(old, field, None)
            new_val = getattr(new, field, None)
            if old_val != new_val:
                changed[field] = {"from": str(old_val), "to": str(new_val)}
        self.log_audit_update(new, extra={"changed_fields": changed})

    @extend_schema(summary="Submit a draft report")
    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        report = self.get_object()
        if report.status != Report.Status.DRAFT:
            return Response(
                {"error": "Only draft reports can be submitted"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        report.status = Report.Status.SUBMITTED
        if not report.case_number:
            report.case_number = generate_case_number()
        if report.priority == Report.Priority.MEDIUM and report.category:
            report.priority = report.category.default_priority
        report.save(update_fields=["status", "case_number", "priority", "updated_at"])
        self.log_audit_update(report, extra={"action": "submit", "case_number": report.case_number})

        # Intake: auto-create a pending, unassigned case so the report is
        # visible to officers (their list includes unassigned cases) and the
        # reporter sees Case Progress. Each report has exactly one case.
        case, _ = Case.objects.get_or_create(
            report=report,
            defaults={"priority": report.priority or Report.Priority.MEDIUM},
        )

        serializer = ReportDetailSerializer(report, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(summary="Upload evidence to a report")
    @action(
        detail=True,
        methods=["post"],
        parser_classes=[MultiPartParser, FormParser],
        url_path="evidence",
    )
    def upload_evidence(self, request, pk=None):
        report = self.get_object()
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
        if file_obj.size > MAX_FILE_SIZE:
            return Response(
                {"error": f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        file_type = validate_file_type(file_obj)
        if not file_type:
            return Response({"error": "File type not allowed"}, status=status.HTTP_400_BAD_REQUEST)

        if request.auth and request.auth.get("actor_type") == "anonymous_reporter":
            uploaded_by = "anonymous_reporter"
        else:
            uploaded_by = getattr(request.user, "role", "user")

        evidence = Evidence.objects.create(
            report=report,
            file=file_obj,
            file_type=file_type,
            uploaded_by_actor_type=uploaded_by,
        )
        serializer = EvidenceSerializer(evidence, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["reports"])
class PublicCategoryViewSet(viewsets.ModelViewSet):
    """Incident categories: any authenticated user may read (list/retrieve),
    only admins may write. The frontend's categoriesApi expects this route
    (the old admin-only /api/v1/admin/categories/ is kept for back-office use)."""

    queryset = IncidentCategory.objects.filter(is_active=True).order_by("name")
    serializer_class = IncidentCategorySerializer
    # The frontend categoriesApi expects a plain array, not a paginated envelope.
    pagination_class = None

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAdminUser()]


@extend_schema(tags=["admin"])
class CategoryViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = IncidentCategory.objects.all().order_by("name")
    serializer_class = IncidentCategorySerializer
    permission_classes = [IsAdminUser]

    @extend_schema(summary="List all incident categories")
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(summary="Create a new category")
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(summary="Retrieve a category")
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(summary="Update a category")
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(summary="Partially update a category")
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(summary="Delete a category")
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
