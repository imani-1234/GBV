from django.contrib.auth import get_user_model
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema

from apps.cases.models import ALLOWED_TRANSITIONS, Case, CaseNote, InformationRequest
from apps.cases.serializers import (
    CaseAssignSerializer,
    CaseCreateSerializer,
    CaseDetailSerializer,
    CaseListSerializer,
    CaseNoteCreateSerializer,
    CaseNoteSerializer,
    CasePrioritySerializer,
    CaseTransitionSerializer,
    InformationRequestCreateSerializer,
    InformationRequestSerializer,
    InformationRespondSerializer,
)
from apps.core.permissions import AuditLogMixin, _audit_log

User = get_user_model()


@extend_schema(tags=["cases"])
class CaseViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = (
        Case.objects.select_related(
            "report__reporter",
            "report__anonymous_reporter",
            "report__category",
            "assigned_officer",
        )
        .prefetch_related("notes", "information_requests")
        .all()
        .order_by("-created_at")
    )
    resource_type = "case"
    # See ReportViewSet.resource_actions: "list" maps to the coarse read_own
    # action so REPORTERs can list their own (scoped by get_queryset), while
    # read_all stays out of reach for them. Object-level permission is only
    # evaluated on detail routes by DRF, so list must be gated here.
    resource_actions = {
        "list": "read_own",
        "retrieve": "read_own",
        "create": "create",
        "destroy": "close",
        "assign": "assign",
        "unassign": "assign",
        "transition": "transition",
        "overwrite_priority": "update",
        "notes": "read_notes",
        "request_information": "request_information",
        "respond_to_info_request": "respond",
    }

    def get_permissions(self):
        if self.action == "respond_to_info_request":
            permission_classes = []
        else:
            from apps.core.permissions import HasResourcePermission
            permission_classes = [HasResourcePermission]
        return [p() for p in permission_classes]

    def get_serializer_class(self):
        if self.action in ("create",):
            return CaseCreateSerializer
        if self.action == "list":
            return CaseListSerializer
        if self.action == "assign":
            return CaseAssignSerializer
        if self.action == "overwrite_priority":
            return CasePrioritySerializer
        if self.action == "transition":
            return CaseTransitionSerializer
        if self.action == "notes":
            return CaseNoteCreateSerializer if self.request.method == "POST" else CaseNoteSerializer
        if self.action == "request_information":
            return InformationRequestCreateSerializer
        if self.action == "respond_to_info_request":
            return InformationRespondSerializer
        return CaseDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_anonymous:
            return qs.none()
        role = getattr(user, "role", None)
        if role == "ADMIN":
            return qs
        if role == "OFFICER":
            return qs.filter(assigned_officer=user) | qs.filter(
                assigned_officer__isnull=True
            )
        return qs.filter(report__reporter=user)

    @extend_schema(summary="Create a case")
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        self.log_audit_create(instance)
        detail = CaseDetailSerializer(instance, context={"request": request})
        return Response(detail.data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        self.log_audit_delete(instance)
        instance.delete()

    @extend_schema(summary="Assign officer to case")
    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        case = self.get_object()
        serializer = CaseAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            officer = User.objects.get(pk=serializer.validated_data["assigned_officer"])
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if officer.role != "OFFICER":
            return Response(
                {"error": "Assigned officer must have role OFFICER"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        case.assigned_officer = officer
        if case.status == Case.Status.PENDING_REVIEW:
            case.status = Case.Status.ASSIGNED
        case.save(update_fields=["assigned_officer", "status", "updated_at"])
        self.log_audit_update(case, extra={"action": "assign", "officer": str(officer.id)})
        detail = CaseDetailSerializer(case, context={"request": request})
        return Response(detail.data)

    @extend_schema(summary="Unassign officer from case")
    @action(detail=True, methods=["post"])
    def unassign(self, request, pk=None):
        case = self.get_object()
        previous = str(case.assigned_officer.id) if case.assigned_officer else None
        case.assigned_officer = None
        if case.status == Case.Status.ASSIGNED:
            case.status = Case.Status.PENDING_REVIEW
        case.save(update_fields=["assigned_officer", "status", "updated_at"])
        self.log_audit_update(
            case,
            extra={"action": "unassign", "previous_officer": previous},
        )
        detail = CaseDetailSerializer(case, context={"request": request})
        return Response(detail.data)

    @extend_schema(summary="Overwrite case priority")
    @action(detail=True, methods=["post"], url_path="overwrite-priority")
    def overwrite_priority(self, request, pk=None):
        case = self.get_object()
        serializer = CasePrioritySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        previous = case.priority
        case.priority = serializer.validated_data["priority"]
        case.save(update_fields=["priority", "updated_at"])
        self.log_audit_update(
            case,
            extra={"action": "overwrite_priority", "from": previous, "to": case.priority},
        )
        detail = CaseDetailSerializer(case, context={"request": request})
        return Response(detail.data)

    @extend_schema(summary="Transition case status")
    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        case = self.get_object()
        serializer = CaseTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["new_status"]
        note_text = serializer.validated_data.get("note", "")
        try:
            case.transition(new_status, request.user)
        except ValueError as e:
            return Response(
                {"error": str(e), "allowed_transitions": ALLOWED_TRANSITIONS.get(case.status, [])},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if note_text:
            CaseNote.objects.create(
                case=case,
                author=request.user,
                note_text=note_text,
                is_internal=True,
            )
        detail = CaseDetailSerializer(case, context={"request": request})
        return Response(detail.data)

    @extend_schema(summary="List or add case notes")
    @action(detail=True, methods=["get", "post"], url_path="notes")
    def notes(self, request, pk=None):
        case = self.get_object()
        if request.method == "GET":
            notes_qs = CaseNote.objects.filter(case=case).select_related("author")
            role = getattr(request.user, "role", None)
            if role == "REPORTER":
                notes_qs = notes_qs.filter(is_internal=False)
            serializer = CaseNoteSerializer(notes_qs, many=True)
            return Response(serializer.data)

        role = getattr(request.user, "role", None)
        if role not in ("OFFICER", "ADMIN"):
            return Response(
                {"error": "Only officers and admins can add notes"},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = CaseNoteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = serializer.save(case=case, author=request.user)
        self.log_audit_create(note)
        result = CaseNoteSerializer(note)
        return Response(result.data, status=status.HTTP_201_CREATED)

    @extend_schema(summary="Request information from reporter")
    @action(detail=True, methods=["post"], url_path="request-information")
    def request_information(self, request, pk=None):
        case = self.get_object()
        serializer = InformationRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        info_req = serializer.save(case=case, requested_by=request.user)
        self.log_audit_create(info_req)
        result = InformationRequestSerializer(info_req)
        return Response(result.data, status=status.HTTP_201_CREATED)

    @extend_schema(summary="Respond to information request")
    def respond_to_info_request(self, request, pk=None, req_id=None):
        self.action = "respond_to_info_request"
        case = self.get_object()
        role = getattr(request.user, "role", None)
        is_own_reporter = case.report.reporter == request.user if case.report.reporter else False
        is_anon_reporter = (
            request.auth
            and request.auth.get("actor_type") == "anonymous_reporter"
            and case.report.anonymous_reporter is not None
            and request.auth.get("reporter_code") == case.report.anonymous_reporter.reporter_code
        )
        if role not in ("ADMIN", "REPORTER") and not is_own_reporter and not is_anon_reporter:
            return Response(
                {"error": "Only the case reporter or an admin can respond"},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            info_req = InformationRequest.objects.get(pk=req_id, case=case)
        except InformationRequest.DoesNotExist:
            return Response(
                {"error": "Information request not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        if info_req.status != InformationRequest.Status.PENDING:
            return Response(
                {"error": "This information request has already been fulfilled"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = InformationRespondSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        from django.utils import timezone
        info_req.reporter_response = serializer.validated_data["reporter_response"]
        info_req.status = InformationRequest.Status.FULFILLED
        info_req.responded_at = timezone.now()
        info_req.save(update_fields=["reporter_response", "status", "responded_at", "updated_at"])
        self.log_audit_update(
            info_req,
            extra={"action": "respond_to_info_request", "info_request_id": str(info_req.id)},
        )
        result = InformationRequestSerializer(info_req)
        return Response(result.data)
