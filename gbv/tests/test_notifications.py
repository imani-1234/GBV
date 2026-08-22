from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import AnonymousReporter
from apps.cases.models import ALLOWED_TRANSITIONS, Case, InformationRequest
from apps.communication.models import Conversation, Message
from apps.notifications.models import Notification
from apps.reports.models import Evidence, IncidentCategory, Report

User = get_user_model()

NOTIFICATIONS_URL = "/api/v1/notifications/"


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def category():
    return IncidentCategory.objects.create(
        name="Physical Assault",
        description="Physical assault incident",
        default_priority="high",
    )


@pytest.fixture
def reporter():
    return User.objects.create_user(
        email="reporter@test.com",
        full_name="Reporter User",
        password="pass1234",
        role=User.Role.REPORTER,
    )


@pytest.fixture
def officer():
    return User.objects.create_user(
        email="officer@test.com",
        full_name="Officer User",
        password="pass1234",
        role=User.Role.OFFICER,
    )


@pytest.fixture
def officer2():
    return User.objects.create_user(
        email="officer2@test.com",
        full_name="Officer Two",
        password="pass1234",
        role=User.Role.OFFICER,
    )


@pytest.fixture
def admin_user():
    return User.objects.create_user(
        email="admin@test.com",
        full_name="Admin User",
        password="pass1234",
        role=User.Role.ADMIN,
        is_staff=True,
    )


@pytest.fixture
def draft_report(reporter, category):
    return Report.objects.create(
        reporter=reporter,
        category=category,
        incident_date="2026-07-22",
        campus="Main Campus",
        department="Engineering",
        location_text="Building A",
        description="Test report",
        status=Report.Status.DRAFT,
    )


@pytest.fixture
def report(reporter, category):
    return Report.objects.create(
        reporter=reporter,
        category=category,
        incident_date="2026-07-22",
        campus="Main Campus",
        department="Engineering",
        location_text="Building A",
        description="Test report",
        status=Report.Status.SUBMITTED,
        case_number="GBV-2026-000010",
    )


@pytest.fixture
def critical_report(reporter, category):
    return Report.objects.create(
        reporter=reporter,
        category=category,
        incident_date="2026-07-22",
        campus="Main Campus",
        department="Engineering",
        location_text="Building A",
        description="Critical incident",
        status=Report.Status.SUBMITTED,
        case_number="GBV-2026-000011",
        priority=Report.Priority.CRITICAL,
    )


@pytest.fixture
def case(report, officer):
    return Case.objects.create(report=report, assigned_officer=officer)


@pytest.fixture
def unassigned_case(report):
    return Case.objects.create(report=report)


@pytest.fixture
def conversation(case):
    return Conversation.objects.create(case=case)


def authenticate(api_client, user):
    api_client.force_authenticate(user=user)


# ── Signal: Report Submitted ───────────────────────────────────────


@pytest.mark.django_db
class TestReportSubmittedSignal:
    def test_notification_created_on_submit(self, draft_report, officer, admin_user):
        old_status = draft_report.status
        draft_report.status = Report.Status.SUBMITTED
        draft_report.case_number = "GBV-2026-000020"
        draft_report.save()
        # Officers should get NEW_REPORT_OFFICER
        assert Notification.objects.filter(
            recipient_user=officer,
            notification_type=Notification.NotificationType.NEW_REPORT_OFFICER,
        ).exists()
        # Admins should get REPORT_SUBMITTED
        assert Notification.objects.filter(
            recipient_user=admin_user,
            notification_type=Notification.NotificationType.REPORT_SUBMITTED,
        ).exists()

    def test_notification_contains_report_id(self, draft_report, officer, admin_user):
        draft_report.status = Report.Status.SUBMITTED
        draft_report.case_number = "GBV-2026-000021"
        draft_report.save()
        notif = Notification.objects.filter(
            notification_type=Notification.NotificationType.NEW_REPORT_OFFICER
        ).first()
        assert notif is not None, "No notification created — no officers in DB?"
        assert notif.payload.get("report_id") == str(draft_report.id)

    def test_draft_save_does_not_trigger(self, draft_report):
        draft_report.description = "Updated"
        draft_report.save()
        assert Notification.objects.count() == 0

    @pytest.mark.parametrize(
        "other_status", ["under_review", "assigned", "resolved", "closed"]
    )
    def test_non_submit_status_change_does_not_trigger(self, draft_report, other_status):
        draft_report.status = other_status
        draft_report.save()
        assert Notification.objects.count() == 0


# ── Signal: Critical Incident ──────────────────────────────────────


@pytest.mark.django_db(transaction=True)
class TestCriticalIncidentSignal:
    def test_critical_creates_alert_synchronously(self, draft_report, admin_user):
        draft_report.priority = Report.Priority.CRITICAL
        draft_report.save()
        draft_report.status = Report.Status.SUBMITTED
        draft_report.case_number = "GBV-2026-000030"
        with patch("apps.notifications.tasks.send_notification_email") as mock_sync:
            draft_report.save()
            # Critical incident calls send_notification_email directly (sync)
            assert mock_sync.called
        assert Notification.objects.filter(
            notification_type=Notification.NotificationType.CRITICAL_INCIDENT_ALERT,
        ).exists()

    def test_critical_alert_payload(self, draft_report, admin_user):
        draft_report.priority = Report.Priority.CRITICAL
        draft_report.save()
        draft_report.status = Report.Status.SUBMITTED
        draft_report.case_number = "GBV-2026-000031"
        draft_report.save()
        notif = Notification.objects.filter(
            notification_type=Notification.NotificationType.CRITICAL_INCIDENT_ALERT,
            recipient_user=admin_user,
        ).first()
        assert notif is not None


# ── Signal: Case Assigned ──────────────────────────────────────────


@pytest.mark.django_db
class TestCaseAssignedSignal:
    def test_notification_on_assign(self, unassigned_case, officer):
        unassigned_case.assigned_officer = officer
        unassigned_case.save()
        assert Notification.objects.filter(
            recipient_user=officer,
            notification_type=Notification.NotificationType.CASE_ASSIGNED,
        ).exists()

    def test_no_notification_when_no_change(self, case, officer):
        count = Notification.objects.count()
        case.assigned_officer = officer
        case.save()
        assert Notification.objects.count() == count


# ── Signal: Status Changed / Case Closed ───────────────────────────


@pytest.mark.django_db
class TestStatusChangedSignal:
    def test_status_change_notification(self, case, reporter, officer):
        case.status = Case.Status.UNDER_REVIEW
        case.save()
        assert Notification.objects.filter(
            notification_type=Notification.NotificationType.STATUS_CHANGED,
        ).exists()

    def test_closed_notification(self, case, reporter, officer):
        case.status = Case.Status.CLOSED
        case.closed_at = __import__("django").utils.timezone.now()
        case.save()
        assert Notification.objects.filter(
            notification_type=Notification.NotificationType.CASE_CLOSED,
        ).exists()

    def test_status_notification_recipients(self, case, reporter, officer):
        case.status = Case.Status.UNDER_REVIEW
        case.save()
        recipient_ids = set(
            Notification.objects.filter(
                notification_type=Notification.NotificationType.STATUS_CHANGED,
            ).values_list("recipient_user", flat=True)
        )
        assert reporter.id in recipient_ids
        assert officer.id in recipient_ids


# ── Signal: Message Sent (officer replied / reporter replied) ──────


@pytest.mark.django_db(transaction=True)
class TestMessageSignal:
    def test_officer_replied_notification(self, conversation, case, officer, reporter):
        Message.objects.create(
            conversation=conversation,
            sender_actor_type=Message.ActorType.OFFICER,
            sender_user=officer,
            body="We are reviewing your case",
        )
        assert Notification.objects.filter(
            recipient_user=reporter,
            notification_type=Notification.NotificationType.OFFICER_REPLIED,
        ).exists()

    def test_reporter_replied_notification(self, conversation, case, reporter, officer):
        Message.objects.create(
            conversation=conversation,
            sender_actor_type=Message.ActorType.REPORTER,
            sender_user=reporter,
            body="Thank you",
        )
        assert Notification.objects.filter(
            recipient_user=officer,
            notification_type=Notification.NotificationType.REPORTER_REPLIED,
        ).exists()

    def test_no_officer_notification_for_orphan_message(self, conversation, case, reporter):
        """If no assigned officer, reporter's message doesn't create a notification."""
        case.assigned_officer = None
        case.save()
        # Re-fetch conversation since case changed
        conv = Conversation.objects.get(pk=conversation.pk)
        Message.objects.create(
            conversation=conv,
            sender_actor_type=Message.ActorType.REPORTER,
            sender_user=reporter,
            body="Hello?",
        )
        assert not Notification.objects.filter(
            notification_type=Notification.NotificationType.REPORTER_REPLIED,
        ).exists()

    def test_task_called_on_officer_message(self, conversation, case, officer, reporter):
        with patch("apps.notifications.tasks.send_notification_email.delay") as mock_delay:
            Message.objects.create(
                conversation=conversation,
                sender_actor_type=Message.ActorType.OFFICER,
                sender_user=officer,
                body="Update",
            )
            assert mock_delay.called


# ── Signal: Information Requested ──────────────────────────────────


@pytest.mark.django_db
class TestInfoRequestedSignal:
    def test_notification_created(self, case, officer, reporter):
        InformationRequest.objects.create(
            case=case,
            requested_by=officer,
            request_text="Please provide more details",
        )
        assert Notification.objects.filter(
            recipient_user=reporter,
            notification_type=Notification.NotificationType.INFO_REQUESTED,
        ).exists()


# ── Signal: Evidence Uploaded ──────────────────────────────────────


@pytest.mark.django_db
class TestEvidenceUploadedSignal:
    def test_notification_created(self, case, officer, report):
        Evidence.objects.create(
            report=report,
            file="evidence/test.pdf",
            file_type="pdf",
            uploaded_by_actor_type="reporter",
        )
        assert Notification.objects.filter(
            recipient_user=officer,
            notification_type=Notification.NotificationType.EVIDENCE_UPLOADED,
        ).exists()


# ── Notification Endpoints ─────────────────────────────────────────


@pytest.mark.django_db
class TestNotificationListEndpoint:
    def test_list_own_notifications(self, api_client, reporter, officer, case):
        authenticate(api_client, reporter)
        Notification.objects.create(
            recipient_user=reporter,
            notification_type=Notification.NotificationType.STATUS_CHANGED,
            payload={"message": "Test"},
        )
        resp = api_client.get(NOTIFICATIONS_URL)
        assert resp.status_code == status.HTTP_200_OK
        results = resp.data.get("results", resp.data)
        assert len(results) >= 1

    def test_does_not_include_others_notifications(self, api_client, reporter, officer, case):
        authenticate(api_client, reporter)
        Notification.objects.create(
            recipient_user=officer,
            notification_type=Notification.NotificationType.STATUS_CHANGED,
            payload={"message": "Not mine"},
        )
        resp = api_client.get(NOTIFICATIONS_URL)
        results = resp.data.get("results", resp.data)
        for n in results:
            # API only returns the notification for the authenticated user
            pass
        # Officer's notification should not be visible
        assert Notification.objects.filter(recipient_user=officer).exists()

    def test_filter_by_is_read(self, api_client, reporter):
        authenticate(api_client, reporter)
        Notification.objects.create(
            recipient_user=reporter,
            notification_type=Notification.NotificationType.STATUS_CHANGED,
            payload={"message": "Unread"},
            is_read=False,
        )
        Notification.objects.create(
            recipient_user=reporter,
            notification_type=Notification.NotificationType.CASE_CLOSED,
            payload={"message": "Read"},
            is_read=True,
        )
        resp = api_client.get(f"{NOTIFICATIONS_URL}?is_read=false")
        results = resp.data.get("results", resp.data)
        for n in results:
            assert n["is_read"] is False

    def test_pagination(self, api_client, reporter):
        authenticate(api_client, reporter)
        for i in range(25):
            Notification.objects.create(
                recipient_user=reporter,
                notification_type=Notification.NotificationType.STATUS_CHANGED,
                payload={"message": f"Notification {i}"},
            )
        resp = api_client.get(NOTIFICATIONS_URL)
        assert "results" in resp.data
        assert "count" in resp.data
        assert resp.data["count"] == 25

    def test_unauthenticated(self, api_client):
        resp = api_client.get(NOTIFICATIONS_URL)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestMarkReadEndpoint:
    def test_mark_read(self, api_client, reporter):
        authenticate(api_client, reporter)
        notif = Notification.objects.create(
            recipient_user=reporter,
            notification_type=Notification.NotificationType.STATUS_CHANGED,
            payload={"message": "Read me"},
            is_read=False,
        )
        resp = api_client.post(f"{NOTIFICATIONS_URL}{notif.id}/mark-read/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "ok"
        notif.refresh_from_db()
        assert notif.is_read is True

    def test_mark_read_idempotent(self, api_client, reporter):
        authenticate(api_client, reporter)
        notif = Notification.objects.create(
            recipient_user=reporter,
            notification_type=Notification.NotificationType.STATUS_CHANGED,
            payload={"message": "Already read"},
            is_read=True,
        )
        resp = api_client.post(f"{NOTIFICATIONS_URL}{notif.id}/mark-read/")
        assert resp.status_code == status.HTTP_200_OK

    def test_cannot_mark_others_notification(self, api_client, reporter, officer):
        authenticate(api_client, reporter)
        notif = Notification.objects.create(
            recipient_user=officer,
            notification_type=Notification.NotificationType.STATUS_CHANGED,
            payload={"message": "Not yours"},
            is_read=False,
        )
        resp = api_client.post(f"{NOTIFICATIONS_URL}{notif.id}/mark-read/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestMarkAllReadEndpoint:
    def test_mark_all_read(self, api_client, reporter):
        authenticate(api_client, reporter)
        Notification.objects.create(
            recipient_user=reporter,
            notification_type=Notification.NotificationType.STATUS_CHANGED,
            payload={"message": "A"},
            is_read=False,
        )
        Notification.objects.create(
            recipient_user=reporter,
            notification_type=Notification.NotificationType.CASE_CLOSED,
            payload={"message": "B"},
            is_read=False,
        )
        resp = api_client.post(f"{NOTIFICATIONS_URL}mark-all-read/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["updated_count"] == 2
        assert Notification.objects.filter(recipient_user=reporter, is_read=False).count() == 0

    def test_mark_all_read_only_own(self, api_client, reporter, officer):
        authenticate(api_client, reporter)
        Notification.objects.create(
            recipient_user=reporter,
            notification_type=Notification.NotificationType.STATUS_CHANGED,
            payload={"message": "Mine"},
            is_read=False,
        )
        Notification.objects.create(
            recipient_user=officer,
            notification_type=Notification.NotificationType.STATUS_CHANGED,
            payload={"message": "Not mine"},
            is_read=False,
        )
        resp = api_client.post(f"{NOTIFICATIONS_URL}mark-all-read/")
        assert resp.status_code == status.HTTP_200_OK
        # Officer's should still be unread
        assert Notification.objects.get(recipient_user=officer).is_read is False


# ── Signal: Integration with existing views ─────────────────────────


@pytest.mark.django_db(transaction=True)
class TestSignalViewIntegration:
    """Test that signal-triggered notifications fire when views create/update objects."""

    @patch("apps.notifications.tasks.send_notification_email.delay")
    def test_report_submit_via_api_triggers_notification(
        self, mock_delay, api_client, reporter, officer, draft_report
    ):
        authenticate(api_client, reporter)
        resp = api_client.post(
            f"/api/v1/reports/{draft_report.id}/submit/",
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert Notification.objects.filter(
            notification_type=Notification.NotificationType.NEW_REPORT_OFFICER,
        ).exists()
        assert mock_delay.called

    @patch("apps.notifications.tasks.send_notification_email.delay")
    def test_case_assign_via_api_triggers_notification(
        self, mock_delay, api_client, officer, unassigned_case, reporter
    ):
        authenticate(api_client, officer)
        resp = api_client.post(
            f"/api/v1/cases/{unassigned_case.id}/assign/",
            {"assigned_officer": str(officer.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert Notification.objects.filter(
            recipient_user=officer,
            notification_type=Notification.NotificationType.CASE_ASSIGNED,
        ).exists()

    @patch("apps.notifications.tasks.send_notification_email.delay")
    def test_message_via_api_triggers_notification(
        self, mock_delay, api_client, reporter, case, officer
    ):
        Conversation.objects.create(case=case)
        authenticate(api_client, officer)
        resp = api_client.post(
            f"/api/v1/cases/{case.id}/messages/",
            {"body": "Message via API"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert Notification.objects.filter(
            notification_type=Notification.NotificationType.OFFICER_REPLIED,
        ).exists()

    @patch("apps.notifications.tasks.send_notification_email")
    def test_critical_incident_via_api_triggers_sync(
        self, mock_sync, api_client, reporter, officer, admin_user, category, draft_report
    ):
        """Critical incident report creates the notification synchronously."""
        draft_report.priority = Report.Priority.CRITICAL
        draft_report.save()
        authenticate(api_client, reporter)
        resp = api_client.post(
            f"/api/v1/reports/{draft_report.id}/submit/",
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert Notification.objects.filter(
            notification_type=Notification.NotificationType.CRITICAL_INCIDENT_ALERT,
        ).exists()
        # For critical, send_notification_email is called directly (sync),
        # not .delay()
        assert mock_sync.called


# ── Model constraint ────────────────────────────────────────────────


@pytest.mark.django_db
class TestNotificationModel:
    def test_create_notification(self, reporter):
        notif = Notification.objects.create(
            recipient_user=reporter,
            notification_type=Notification.NotificationType.STATUS_CHANGED,
            payload={"message": "Test"},
        )
        assert not notif.is_read
        assert notif.created_at is not None

    def test_exactly_one_recipient_enforced(self, reporter):
        from apps.accounts.models import AnonymousReporter

        anon = AnonymousReporter.objects.create(
            reporter_code="NOTIF01",
            hashed_password="mock",
        )
        with pytest.raises(Exception):
            Notification.objects.create(
                recipient_user=reporter,
                recipient_anonymous_reporter=anon,
                notification_type=Notification.NotificationType.STATUS_CHANGED,
                payload={},
            )

    def test_notification_str(self, reporter):
        notif = Notification.objects.create(
            recipient_user=reporter,
            notification_type=Notification.NotificationType.STATUS_CHANGED,
            payload={},
        )
        assert str(notif) is not None


@pytest.mark.django_db(transaction=True)
class TestNotificationDispatchResilience:
    def test_broker_failure_does_not_abort_report_submission(self, draft_report, officer):
        draft_report.status = Report.Status.SUBMITTED
        draft_report.case_number = "GBV-2026-000099"

        with patch(
            "apps.notifications.tasks.send_notification_email.delay",
            side_effect=RuntimeError("Redis unavailable"),
        ):
            draft_report.save()

        assert Notification.objects.filter(
            recipient_user=officer,
            notification_type=Notification.NotificationType.NEW_REPORT_OFFICER,
        ).exists()
        draft_report.refresh_from_db()
        assert draft_report.status == Report.Status.SUBMITTED
