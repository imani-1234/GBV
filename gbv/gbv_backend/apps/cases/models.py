from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.core.models import BaseModel

ALLOWED_TRANSITIONS = {
    "PENDING_REVIEW": ["ASSIGNED", "CLOSED"],
    "ASSIGNED": [
        "UNDER_REVIEW",
        "UNDER_INVESTIGATION",
        "AWAITING_REPORTER_RESPONSE",
        "REFERRED",
        "CLOSED",
    ],
    "UNDER_REVIEW": [
        "ASSIGNED",
        "UNDER_INVESTIGATION",
        "AWAITING_REPORTER_RESPONSE",
        "REFERRED",
        "RESOLVED",
        "CLOSED",
    ],
    "AWAITING_REPORTER_RESPONSE": ["UNDER_REVIEW", "UNDER_INVESTIGATION", "CLOSED"],
    "UNDER_INVESTIGATION": [
        "ASSIGNED",
        "AWAITING_REPORTER_RESPONSE",
        "REFERRED",
        "RESOLVED",
        "CLOSED",
    ],
    "REFERRED": ["UNDER_REVIEW", "UNDER_INVESTIGATION", "RESOLVED", "CLOSED"],
    "RESOLVED": ["CLOSED", "REOPENED"],
    "CLOSED": ["REOPENED"],
    "REOPENED": [
        "ASSIGNED",
        "UNDER_REVIEW",
        "UNDER_INVESTIGATION",
        "AWAITING_REPORTER_RESPONSE",
        "REFERRED",
        "CLOSED",
    ],
}


class Case(BaseModel):
    class Status(models.TextChoices):
        PENDING_REVIEW = "PENDING_REVIEW", "Pending Review"
        ASSIGNED = "ASSIGNED", "Assigned"
        UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
        AWAITING_REPORTER_RESPONSE = (
            "AWAITING_REPORTER_RESPONSE",
            "Awaiting Reporter Response",
        )
        UNDER_INVESTIGATION = "UNDER_INVESTIGATION", "Under Investigation"
        REFERRED = "REFERRED", "Referred"
        RESOLVED = "RESOLVED", "Resolved"
        CLOSED = "CLOSED", "Closed"
        REOPENED = "REOPENED", "Reopened"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    report = models.OneToOneField(
        "reports.Report",
        on_delete=models.CASCADE,
        related_name="case",
    )
    assigned_officer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_cases",
    )
    status = models.CharField(
        max_length=50,
        choices=Status.choices,
        default=Status.PENDING_REVIEW,
    )
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    resolution_summary = models.TextField(blank=True, default="")

    class Meta:
        db_table = "cases"
        verbose_name = "Case"
        verbose_name_plural = "Cases"

    def clean(self):
        if self.assigned_officer and self.assigned_officer.role != "OFFICER":
            raise ValidationError(
                {"assigned_officer": "Assigned officer must have role OFFICER"}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def transition(self, new_status, actor):
        from apps.core.models import AuditLog

        if new_status not in dict(self.Status.choices):
            raise ValueError(f"Invalid status: {new_status}")

        allowed = ALLOWED_TRANSITIONS.get(self.status, [])
        if new_status not in allowed:
            raise ValueError(
                f"Cannot transition from {self.status} to {new_status}"
            )

        old_status = self.status
        self.status = new_status

        if new_status in ("RESOLVED", "CLOSED") and not self.closed_at:
            self.closed_at = timezone.now()
        elif new_status == "REOPENED":
            self.closed_at = None

        self.save(update_fields=["status", "closed_at", "updated_at"])

        actor_fk = actor if actor.is_authenticated else None
        actor_type = getattr(actor, "role", "user") if actor.is_authenticated else "anonymous"
        AuditLog.objects.create(
            actor=actor_fk,
            actor_type=actor_type,
            actor_identifier=str(actor),
            action="STATUS_TRANSITION",
            resource_type="case",
            resource_id=str(self.id),
            metadata={
                "from": old_status,
                "to": new_status,
            },
        )

    def __str__(self):
        return f"Case {self.id} — {self.status}"


class CaseNote(BaseModel):
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="notes",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    note_text = models.TextField()
    is_internal = models.BooleanField(default=False)

    class Meta:
        db_table = "case_notes"
        verbose_name = "Case Note"
        verbose_name_plural = "Case Notes"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Note on {self.case_id} by {self.author_id}"


class InformationRequest(BaseModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        FULFILLED = "FULFILLED", "Fulfilled"

    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name="information_requests",
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    request_text = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    reporter_response = models.TextField(blank=True, null=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "information_requests"
        verbose_name = "Information Request"
        verbose_name_plural = "Information Requests"
        ordering = ["-created_at"]

    def __str__(self):
        return f"InfoRequest {self.id} on {self.case_id}"
