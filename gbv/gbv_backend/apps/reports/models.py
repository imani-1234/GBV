from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.core.models import BaseModel


class IncidentCategory(BaseModel):
    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, default="")
    default_priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )

    class Meta:
        db_table = "incident_categories"
        verbose_name = "Incident Category"
        verbose_name_plural = "Incident Categories"

    def __str__(self):
        return self.name


class Campus(BaseModel):
    """An administrator-managed reporting campus available to reporters."""

    name = models.CharField(max_length=255, unique=True)
    code = models.CharField(max_length=30, unique=True, blank=True, default="")

    class Meta:
        db_table = "campuses"
        verbose_name = "Campus"
        verbose_name_plural = "Campuses"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Department(BaseModel):
    """An administrator-managed department scoped to one reporting campus."""

    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="departments")
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=30, blank=True, default="")

    class Meta:
        db_table = "departments"
        verbose_name = "Department"
        verbose_name_plural = "Departments"
        ordering = ["campus__name", "name"]
        constraints = [
            models.UniqueConstraint(fields=["campus", "name"], name="uq_department_campus_name"),
        ]

    def __str__(self):
        return f"{self.name} — {self.campus.name}"


class Report(BaseModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        UNDER_REVIEW = "under_review", "Under Review"
        ASSIGNED = "assigned", "Assigned"
        RESOLVED = "resolved", "Resolved"
        CLOSED = "closed", "Closed"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    class Gender(models.TextChoices):
        FEMALE = "female", "Girl / woman"
        MALE = "male", "Boy / man"
        NON_BINARY = "non_binary", "Non-binary / another identity"
        SELF_DESCRIBE = "self_describe", "Self-describe"
        PREFER_NOT_TO_SAY = "prefer_not_to_say", "Prefer not to say"

    class SuspectType(models.TextChoices):
        STUDENT = "student", "Student"
        LECTURER = "lecturer", "Lecturer"
        STAFF = "staff", "Staff member"
        VISITOR = "visitor", "Visitor"
        OTHER = "other", "Other / not sure"

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="reports_as_reporter",
    )
    anonymous_reporter = models.ForeignKey(
        "accounts.AnonymousReporter",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reports",
    )
    case_number = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
    )
    category = models.ForeignKey(
        IncidentCategory,
        on_delete=models.PROTECT,
        related_name="reports",
    )
    incident_date = models.DateField()
    # Legacy location snapshots remain for historical reports and auditing.
    # New reports populate these from the administrator-managed foreign keys.
    campus = models.CharField(max_length=255)
    department = models.CharField(max_length=255)
    campus_option = models.ForeignKey(
        Campus,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reports",
    )
    department_option = models.ForeignKey(
        Department,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reports",
    )
    location_text = models.CharField(max_length=500)
    description = models.TextField()
    victim_is_reporter = models.BooleanField(default=True)
    victim_details = models.JSONField(default=dict, blank=True)
    victim_gender = models.CharField(max_length=24, choices=Gender.choices, blank=True, default="")
    offender_known = models.BooleanField(default=False)
    offender_details = models.JSONField(default=dict, blank=True)
    suspect_type = models.CharField(max_length=24, choices=SuspectType.choices, blank=True, default="")
    suspect_campus = models.ForeignKey(
        Campus,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="suspect_reports",
    )
    suspect_department = models.ForeignKey(
        Department,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="suspect_department_reports",
    )
    suspect_details = models.JSONField(default=dict, blank=True)
    witnesses = models.JSONField(default=list, blank=True)
    needs_immediate_help = models.BooleanField(default=False)
    consent_to_contact = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    assigned_officer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_reports",
    )

    class Meta:
        db_table = "reports"
        verbose_name = "Report"
        verbose_name_plural = "Reports"
        constraints = [
            models.CheckConstraint(
                name="chk_report_single_reporter",
                condition=(
                    models.Q(reporter__isnull=False, anonymous_reporter__isnull=True)
                    | models.Q(reporter__isnull=True, anonymous_reporter__isnull=False)
                ),
            )
        ]

    def clean(self):
        if self.reporter and self.anonymous_reporter:
            raise ValidationError("Only one of reporter or anonymous_reporter may be set")
        if not self.reporter and not self.anonymous_reporter:
            raise ValidationError("Either reporter or anonymous_reporter must be set")
        if self.department_option and self.campus_option and self.department_option.campus_id != self.campus_option_id:
            raise ValidationError("Selected department must belong to the selected campus")
        if self.suspect_department and self.suspect_campus and self.suspect_department.campus_id != self.suspect_campus_id:
            raise ValidationError("Suspect department must belong to the selected suspect campus")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.case_number or f"DRAFT-{self.id}"


class Evidence(BaseModel):
    class FileType(models.TextChoices):
        IMAGE = "image", "Image"
        PDF = "pdf", "PDF"
        VIDEO = "video", "Video"
        AUDIO = "audio", "Audio"
        DOCUMENT = "document", "Document"

    report = models.ForeignKey(
        Report,
        on_delete=models.CASCADE,
        related_name="evidence",
    )
    file = models.FileField(
        upload_to="evidence/",
        max_length=500,
    )
    file_type = models.CharField(
        max_length=20,
        choices=FileType.choices,
    )
    uploaded_by_actor_type = models.CharField(max_length=50, blank=True, default="")

    class Meta:
        db_table = "evidence"
        verbose_name = "Evidence"
        verbose_name_plural = "Evidence"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Evidence {self.id} for Report {self.report_id}"
