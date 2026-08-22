import uuid

from django.conf import settings
from django.db import models


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        REPORT_SUBMITTED = "report_submitted", "Report Submitted"
        CASE_ASSIGNED = "case_assigned", "Case Assigned"
        OFFICER_REPLIED = "officer_replied", "Officer Replied"
        INFO_REQUESTED = "info_requested", "Information Requested"
        STATUS_CHANGED = "status_changed", "Status Changed"
        CASE_CLOSED = "case_closed", "Case Closed"
        NEW_REPORT_OFFICER = "new_report_officer", "New Report for Officers"
        REPORTER_REPLIED = "reporter_replied", "Reporter Replied"
        EVIDENCE_UPLOADED = "evidence_uploaded", "Evidence Uploaded"
        CRITICAL_INCIDENT_ALERT = "critical_incident_alert", "Critical Incident Alert"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    recipient_anonymous_reporter = models.ForeignKey(
        "accounts.AnonymousReporter",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
    )
    payload = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        verbose_name = "Notification"
        constraints = [
            models.CheckConstraint(
                name="chk_notification_single_recipient",
                condition=(
                    models.Q(recipient_user__isnull=False, recipient_anonymous_reporter__isnull=True)
                    | models.Q(recipient_user__isnull=True, recipient_anonymous_reporter__isnull=False)
                ),
            ),
        ]

    def __str__(self):
        return f"{self.notification_type} for {self.recipient_user_id or self.recipient_anonymous_reporter_id}"
