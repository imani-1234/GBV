from rest_framework import serializers

from apps.reports.models import Evidence, IncidentCategory, Report


class IncidentCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidentCategory
        fields = ("id", "name", "description", "default_priority")


class ReportCreateSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=IncidentCategory.objects.all())
    # Accept both plain dates (YYYY-MM-DD) and ISO-8601 datetimes so clients
    # (e.g. the Expo frontend's toISOString()) don't get a 400 for a valid date.
    incident_date = serializers.DateField(
        input_formats=[
            "%Y-%m-%d",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%dT%H:%M:%S.%fZ",
        ]
    )

    class Meta:
        model = Report
        fields = (
            "category",
            "incident_date",
            "campus",
            "department",
            "location_text",
            "description",
            "victim_is_reporter",
            "victim_details",
            "offender_known",
            "offender_details",
            "witnesses",
            "needs_immediate_help",
            "consent_to_contact",
            "priority",
        )

class EvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evidence
        fields = ("id", "report", "file", "file_type", "uploaded_by_actor_type", "created_at")
        read_only_fields = ("id", "report", "file_type", "uploaded_by_actor_type", "created_at")


class ReportDetailSerializer(serializers.ModelSerializer):
    category = IncidentCategorySerializer(read_only=True)
    reporter_info = serializers.SerializerMethodField()
    evidence = EvidenceSerializer(many=True, read_only=True)

    class Meta:
        model = Report
        fields = "__all__"

    def get_reporter_info(self, obj):
        if obj.reporter:
            return {
                "id": str(obj.reporter.id),
                "email": obj.reporter.email,
                "full_name": obj.reporter.full_name,
            }
        if obj.anonymous_reporter:
            return {
                "reporter_code": obj.anonymous_reporter.reporter_code,
            }
        return None


class ReportSubmitSerializer(serializers.Serializer):
    pass
