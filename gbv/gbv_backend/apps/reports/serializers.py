from rest_framework import serializers

from apps.reports.models import Campus, Department, Evidence, IncidentCategory, Report


class IncidentCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidentCategory
        fields = ("id", "name", "description", "default_priority")


class CampusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campus
        fields = ("id", "name", "code", "is_active")
        read_only_fields = ("id",)


class DepartmentSerializer(serializers.ModelSerializer):
    campus_name = serializers.CharField(source="campus.name", read_only=True)

    class Meta:
        model = Department
        fields = ("id", "campus", "campus_name", "name", "code", "is_active")
        read_only_fields = ("id", "campus_name")


class ReportCreateSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=IncidentCategory.objects.all())
    # Older released clients send location snapshots as text. The refreshed
    # reporter wizard always sends configured IDs; retaining these write-only
    # fields prevents abandoning a draft after a server upgrade.
    campus = serializers.CharField(required=False, write_only=True)
    department = serializers.CharField(required=False, write_only=True)
    campus_option = serializers.PrimaryKeyRelatedField(
        queryset=Campus.objects.filter(is_active=True), required=False, allow_null=False
    )
    department_option = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.filter(is_active=True), required=False, allow_null=False
    )
    suspect_campus = serializers.PrimaryKeyRelatedField(
        queryset=Campus.objects.filter(is_active=True), required=False, allow_null=True
    )
    suspect_department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.filter(is_active=True), required=False, allow_null=True
    )
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
            "campus_option",
            "department_option",
            "campus",
            "department",
            "location_text",
            "description",
            "victim_is_reporter",
            "victim_details",
            "victim_gender",
            "offender_known",
            "offender_details",
            "suspect_type",
            "suspect_campus",
            "suspect_department",
            "suspect_details",
            "witnesses",
            "needs_immediate_help",
            "consent_to_contact",
            "priority",
        )

    def validate(self, attrs):
        campus = attrs.get("campus_option") or getattr(self.instance, "campus_option", None)
        department = attrs.get("department_option") or getattr(self.instance, "department_option", None)
        legacy_campus = attrs.get("campus", "")
        legacy_department = attrs.get("department", "")

        if not self.instance and not campus and not legacy_campus:
            raise serializers.ValidationError({"campus_option": "Please select a configured campus."})
        if not self.instance and not department and not legacy_department:
            raise serializers.ValidationError({"department_option": "Please select a configured department."})
        if campus and department and department.campus_id != campus.id:
            raise serializers.ValidationError({"department_option": "The selected department does not belong to this campus."})

        suspect_campus = attrs.get("suspect_campus")
        suspect_department = attrs.get("suspect_department")
        if suspect_department:
            if suspect_campus and suspect_department.campus_id != suspect_campus.id:
                raise serializers.ValidationError({"suspect_department": "The selected suspect department does not belong to the suspect campus."})
            # A department uniquely identifies its campus; derive it when the reporter
            # chose only a department to avoid unnecessary duplicate input.
            attrs["suspect_campus"] = suspect_department.campus

        if campus:
            attrs["campus"] = campus.name
        if department:
            attrs["department"] = department.name
        return attrs

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
