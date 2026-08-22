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
    campus = models.CharField(max_length=255)
    department = models.CharField(max_length=255)
    location_text = models.CharField(max_length=500)
    description = models.TextField()
    victim_is_reporter = models.BooleanField(default=True)
    victim_details = models.JSONField(default=dict, blank=True)
    offender_known = models.BooleanField(default=False)
    offender_details = models.JSONField(default=dict, blank=True)
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
