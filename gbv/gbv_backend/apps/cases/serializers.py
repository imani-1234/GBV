from rest_framework import serializers

from apps.cases.models import Case, CaseNote, InformationRequest
from apps.reports.serializers import ReportDetailSerializer


class CaseNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = CaseNote
        fields = (
            "id",
            "case",
            "author",
            "author_name",
            "note_text",
            "is_internal",
            "created_at",
        )
        read_only_fields = ("id", "case", "author", "author_name", "created_at")

    def get_author_name(self, obj):
        if obj.author:
            return obj.author.full_name or obj.author.email
        return "Unknown"


class CaseNoteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseNote
        fields = ("note_text", "is_internal")


class InformationRequestSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.SerializerMethodField()

    class Meta:
        model = InformationRequest
        fields = (
            "id",
            "case",
            "requested_by",
            "requested_by_name",
            "request_text",
            "status",
            "reporter_response",
            "responded_at",
            "created_at",
        )
        read_only_fields = (
            "id",
            "case",
            "requested_by",
            "requested_by_name",
            "status",
            "reporter_response",
            "responded_at",
            "created_at",
        )

    def get_requested_by_name(self, obj):
        if obj.requested_by:
            return obj.requested_by.full_name or obj.requested_by.email
        return "Unknown"


class InformationRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InformationRequest
        fields = ("request_text",)


class CaseTransitionSerializer(serializers.Serializer):
    new_status = serializers.ChoiceField(choices=Case.Status.choices)
    note = serializers.CharField(required=False, allow_blank=True)


class CaseAssignSerializer(serializers.Serializer):
    assigned_officer = serializers.UUIDField()


class CasePrioritySerializer(serializers.Serializer):
    priority = serializers.ChoiceField(choices=Case.Priority.choices)


class CaseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = ("report", "assigned_officer", "priority")


class CaseDetailSerializer(serializers.ModelSerializer):
    report = ReportDetailSerializer(read_only=True)
    assigned_officer_name = serializers.SerializerMethodField()
    notes = CaseNoteSerializer(many=True, read_only=True)
    information_requests = InformationRequestSerializer(many=True, read_only=True)

    class Meta:
        model = Case
        fields = "__all__"

    def get_assigned_officer_name(self, obj):
        if obj.assigned_officer:
            return (
                obj.assigned_officer.full_name or obj.assigned_officer.email
            )
        return None


class CaseListSerializer(serializers.ModelSerializer):
    case_number = serializers.SerializerMethodField()
    reporter_email = serializers.SerializerMethodField()

    class Meta:
        model = Case
        fields = (
            "id",
            "report",
            "case_number",
            "status",
            "priority",
            "assigned_officer",
            "reporter_email",
            "opened_at",
            "closed_at",
            "created_at",
        )

    def get_case_number(self, obj):
        return obj.report.case_number if obj.report else None

    def get_reporter_email(self, obj):
        if obj.report and obj.report.reporter:
            return obj.report.reporter.email
        return None


class InformationRespondSerializer(serializers.Serializer):
    reporter_response = serializers.CharField()
