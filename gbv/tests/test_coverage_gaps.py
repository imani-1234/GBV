import io
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.core.management import call_command
from rest_framework import status
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate

from apps.accounts.models import AnonymousReporter
from apps.cases.models import ALLOWED_TRANSITIONS, Case, CaseNote, InformationRequest
from apps.core.models import AuditLog
from apps.core.permissions import (
    _audit_log,
    CanAccessReport,
    CustomJWTAuthentication,
    HasResourcePermission,
    IsAdminUser,
    IsAnonymousReporterToken,
    IsGBVOfficer,
    IsOwner,
    IsReporterUser,
)
from apps.notifications.models import Notification
from apps.notifications.tasks import send_notification_email
from apps.reports.models import Evidence, IncidentCategory, Report
from apps.reports.utils import evidence_upload_path, generate_case_number

User = get_user_model()
REPORTS_URL = "/api/v1/reports/"
CASES_URL = "/api/v1/cases/"
MESSAGES_URL = "/api/v1/cases/{case_pk}/messages/"
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
        full_name="Test Reporter",
        password="pass1234",
        role=User.Role.REPORTER,
    )


@pytest.fixture
def officer():
    return User.objects.create_user(
        email="officer@test.com",
        full_name="Test Officer",
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
def anon_reporter():
    return AnonymousReporter.objects.create(
        reporter_code="ANON999",
        hashed_password="testhash",
    )


@pytest.fixture
def report(reporter, category):
    return Report.objects.create(
        category=category,
        incident_date="2026-07-22",
        campus="Main Campus",
        department="Engineering",
        location_text="Building A",
        description="Test report",
        reporter=reporter,
        status=Report.Status.DRAFT,
    )


@pytest.fixture
def submitted_report(reporter, category):
    return Report.objects.create(
        reporter=reporter,
        category=category,
        incident_date="2026-07-22",
        campus="Main Campus",
        department="Engineering",
        location_text="Building A",
        description="Submitted report",
        status=Report.Status.SUBMITTED,
        case_number="GBV-2026-000100",
    )


def authenticate(api_client, user):
    api_client.force_authenticate(user=user)


def authenticate_anonymous(api_client, anon_reporter):
    api_client.force_authenticate(
        user=AnonymousUser(),
        token={"actor_type": "anonymous_reporter", "reporter_code": anon_reporter.reporter_code},
    )


# ── Core Permissions ────────────────────────────────────────────────


@pytest.mark.django_db
class TestAuditLogFunction:
    def test_audit_log_authenticated_reporter(self, rf, reporter):
        request = rf.get("/")
        request.user = reporter
        request.auth = None
        request.META = {"REMOTE_ADDR": "127.0.0.1"}
        _audit_log(request, "TEST_ACTION", resource_type="test", resource_id="1")
        assert AuditLog.objects.filter(action="TEST_ACTION").count() == 1
        entry = AuditLog.objects.first()
        assert entry.actor == reporter
        assert entry.actor_type == "REPORTER"

    def test_audit_log_anonymous_reporter_via_auth(self, rf, anon_reporter):
        request = rf.get("/")
        request.user = AnonymousUser()
        request.auth = {"actor_type": "anonymous_reporter", "reporter_code": anon_reporter.reporter_code}
        request.META = {"REMOTE_ADDR": "127.0.0.1"}
        _audit_log(request, "TEST_ACTION", resource_type="test", resource_id="1")
        assert AuditLog.objects.filter(action="TEST_ACTION").count() == 1
        entry = AuditLog.objects.first()
        assert entry.actor_type == "anonymous_reporter"

    def test_audit_log_no_auth_no_user(self, rf):
        request = rf.get("/")
        request.user = AnonymousUser()
        request.auth = None
        request.META = {"REMOTE_ADDR": "127.0.0.1"}
        _audit_log(request, "TEST_ACTION", resource_type="test", resource_id="1")
        entry = AuditLog.objects.first()
        assert entry.actor is None
        assert entry.actor_type == ""

    def test_audit_log_with_instance(self, rf, report):
        request = rf.get("/")
        request.user = AnonymousUser()
        request.auth = None
        request.META = {"REMOTE_ADDR": "127.0.0.1"}
        _audit_log(request, "TEST_ACTION", instance=report)
        entry = AuditLog.objects.first()
        assert entry.resource_type == "report"
        assert entry.resource_id == str(report.id)


@pytest.mark.django_db
class TestHasResourcePermissionEdgeCases:
    def test_no_resource_type_returns_true(self, rf):
        """When a view has no resource_type, permission is granted."""
        request = rf.get("/")
        request.user = User.objects.create_user(
            email="nobody@test.com", full_name="Nobody", password="pass1234",
            role=User.Role.REPORTER,
        )
        request.auth = None
        view = MagicMock()
        view.resource_type = None
        view.action = None
        view.resource_actions = {}
        perm = HasResourcePermission()
        assert perm.has_permission(request, view) is True

    def test_falsy_action_returns_false(self, rf):
        """When action resolves to a falsy value, permission is denied."""
        request = rf.get("/")
        request.user = User.objects.create_user(
            email="nobody2@test.com", full_name="Nobody2", password="pass1234",
            role=User.Role.REPORTER,
        )
        request.auth = None
        view = MagicMock()
        view.resource_type = "report"
        view.action = "unknown_action"
        view.resource_actions = {"unknown_action": ""}
        perm = HasResourcePermission()
        assert perm.has_permission(request, view) is False

    def test_has_object_permission_officer_no_assign(self, rf, report):
        """OFFICER with no assigned_officer/assigned_to fields has object access."""
        request = rf.get("/")
        request.user = User.objects.create_user(
            email="officer_test@test.com", full_name="Off Test", password="pass1234",
            role=User.Role.OFFICER,
        )
        request.auth = None

        class FakeObj:
            pass

        obj = FakeObj()
        perm = HasResourcePermission()
        assert perm.has_object_permission(request, None, obj) is True

    def test_has_object_permission_reporter_with_reporter(self, rf, report):
        request = rf.get("/")
        request.user = report.reporter
        request.auth = None
        perm = HasResourcePermission()
        assert perm.has_object_permission(request, None, report) is True

    def test_has_object_permission_reporter_with_user(self, rf):
        """REPORTER with obj.user match."""
        user = User.objects.create_user(
            email="owner@test.com", full_name="Owner", password="pass1234",
            role=User.Role.REPORTER,
        )
        request = rf.get("/")
        request.user = user
        request.auth = None

        obj = type("FakeObj", (), {"user": user})()

        perm = HasResourcePermission()
        assert perm.has_object_permission(request, None, obj) is True

    def test_has_object_permission_reporter_user_mismatch(self, rf):
        user1 = User.objects.create_user(
            email="rep1@test.com", full_name="Rep1", password="pass1234",
            role=User.Role.REPORTER,
        )
        user2 = User.objects.create_user(
            email="rep2@test.com", full_name="Rep2", password="pass1234",
            role=User.Role.REPORTER,
        )
        request = rf.get("/")
        request.user = user1
        request.auth = None

        class FakeObj:
            pass

        perm = HasResourcePermission()
        assert perm.has_object_permission(request, None, FakeObj()) is False

    def test_has_object_permission_unknown_role(self, rf):
        user = User.objects.create_user(
            email="weird@test.com", full_name="Weird", password="pass1234",
            role=User.Role.REPORTER,
        )
        request = rf.get("/")
        request.user = user
        request.auth = None

        class FakeObj:
            pass

        perm = HasResourcePermission()
        with patch.object(user, "role", "ALIEN"):
            assert perm.has_object_permission(request, None, FakeObj()) is False

    def test_has_object_permission_officer_assigned(self, rf, report, officer):
        """OFFICER matched to report.assigned_officer."""
        report.assigned_officer = officer
        report.save()
        request = rf.get("/")
        request.user = officer
        request.auth = None
        perm = HasResourcePermission()
        assert perm.has_object_permission(request, None, report) is True

    def test_has_object_permission_officer_assigned_to(self, rf, report, officer):
        """OFFICER matched to obj.assigned_to (case pattern)."""
        request = rf.get("/")
        request.user = officer
        request.auth = None

        obj = type("FakeCase", (), {"assigned_to": officer})()

        perm = HasResourcePermission()
        assert perm.has_object_permission(request, None, obj) is True

    def test_has_object_permission_reporter_via_report(self, rf, report, reporter):
        """REPORTER matched via obj.report.reporter."""
        request = rf.get("/")
        request.user = reporter
        request.auth = None

        obj = type("FakeEvidence", (), {"report": report})()

        perm = HasResourcePermission()
        assert perm.has_object_permission(request, None, obj) is True

    def test_has_object_permission_reporter_no_match(self, rf, category):
        user1 = User.objects.create_user(
            email="rep_a@test.com", full_name="Rep A", password="pass1234",
            role=User.Role.REPORTER,
        )
        user2 = User.objects.create_user(
            email="rep_b@test.com", full_name="Rep B", password="pass1234",
            role=User.Role.REPORTER,
        )
        report2 = Report.objects.create(
            category=category, incident_date="2026-07-22",
            campus="Main", department="Eng", location_text="Loc",
            description="Other", reporter=user2,
        )
        request = rf.get("/")
        request.user = user1
        request.auth = None
        perm = HasResourcePermission()
        assert perm.has_object_permission(request, None, report2) is False


@pytest.mark.django_db
class TestCanAccessReportEdgeCases:
    def test_no_resource_type_returns_true(self, rf):
        request = rf.get("/")
        request.user = User.objects.create_user(
            email="any@test.com", full_name="Any", password="pass1234",
            role=User.Role.REPORTER,
        )
        request.auth = None
        view = MagicMock()
        view.action = None
        view.resource_actions = {}
        view.resource_type = None
        perm = CanAccessReport()
        assert perm.has_permission(request, view) is True

    def test_falsy_action_returns_false(self, rf):
        request = rf.get("/")
        request.user = User.objects.create_user(
            email="any2@test.com", full_name="Any2", password="pass1234",
            role=User.Role.REPORTER,
        )
        request.auth = None
        view = MagicMock()
        view.resource_type = "report"
        view.action = "bogus"
        view.resource_actions = {"bogus": ""}
        perm = CanAccessReport()
        assert perm.has_permission(request, view) is False

    def test_anonymous_allowed_actions(self, rf, anon_reporter):
        request = rf.get("/")
        request.user = AnonymousUser()
        request.auth = {"actor_type": "anonymous_reporter", "reporter_code": anon_reporter.reporter_code}
        request.META = {"REMOTE_ADDR": "127.0.0.1"}
        view = MagicMock()
        view.resource_type = "report"
        view.action = "create"
        view.resource_actions = {"create": "create"}
        view.kwargs = {}
        perm = CanAccessReport()
        assert perm.has_permission(request, view) is True

    def test_anonymous_disallowed_action(self, rf, anon_reporter):
        request = rf.get("/")
        request.user = AnonymousUser()
        request.auth = {"actor_type": "anonymous_reporter", "reporter_code": anon_reporter.reporter_code}
        request.META = {"REMOTE_ADDR": "127.0.0.1"}
        view = MagicMock()
        view.resource_type = "report"
        view.action = "close"
        view.resource_actions = {"close": "close"}
        view.kwargs = {}
        perm = CanAccessReport()
        assert perm.has_permission(request, view) is False

    def test_has_object_permission_reporter_no_match(self, rf, category, reporter):
        other_reporter = User.objects.create_user(
            email="other@test.com", full_name="Other", password="pass1234",
            role=User.Role.REPORTER,
        )
        r = Report.objects.create(
            category=category, incident_date="2026-07-22",
            campus="Main", department="Eng", location_text="Loc",
            description="Other", reporter=other_reporter,
        )
        request = rf.get("/")
        request.user = reporter
        request.auth = None
        perm = CanAccessReport()
        assert perm.has_object_permission(request, None, r) is False


@pytest.mark.django_db
class TestPermissionClassInstances:
    def test_is_reporter_user(self, rf):
        user = User.objects.create_user(
            email="r@test.com", full_name="R", password="pass1234",
            role=User.Role.REPORTER,
        )
        request = rf.get("/")
        request.user = user
        assert IsReporterUser().has_permission(request, None) is True

    def test_is_reporter_user_wrong_role(self, rf, admin_user):
        request = rf.get("/")
        request.user = admin_user
        assert IsReporterUser().has_permission(request, None) is False

    def test_is_reporter_user_unauthenticated(self, rf):
        request = rf.get("/")
        request.user = AnonymousUser()
        assert IsReporterUser().has_permission(request, None) is False

    def test_is_gbv_officer(self, rf):
        user = User.objects.create_user(
            email="o@test.com", full_name="O", password="pass1234",
            role=User.Role.OFFICER,
        )
        request = rf.get("/")
        request.user = user
        assert IsGBVOfficer().has_permission(request, None) is True

    def test_is_gbv_officer_wrong_role(self, rf, reporter):
        request = rf.get("/")
        request.user = reporter
        assert IsGBVOfficer().has_permission(request, None) is False

    def test_is_admin_user(self, rf, admin_user):
        request = rf.get("/")
        request.user = admin_user
        assert IsAdminUser().has_permission(request, None) is True

    def test_is_admin_user_wrong_role(self, rf, reporter):
        request = rf.get("/")
        request.user = reporter
        assert IsAdminUser().has_permission(request, None) is False

    def test_is_anonymous_reporter_token_valid(self, rf, anon_reporter):
        request = rf.get("/")
        request.auth = {"actor_type": "anonymous_reporter", "reporter_code": anon_reporter.reporter_code}
        assert IsAnonymousReporterToken().has_permission(request, None) is True

    def test_is_anonymous_reporter_token_no_auth(self, rf):
        request = rf.get("/")
        request.auth = None
        assert IsAnonymousReporterToken().has_permission(request, None) is False

    def test_is_anonymous_reporter_token_wrong_type(self, rf):
        request = rf.get("/")
        request.auth = {"actor_type": "something_else"}
        assert IsAnonymousReporterToken().has_permission(request, None) is False

    def test_is_owner_match(self, rf, reporter):
        request = rf.get("/")
        request.user = reporter
        perm = IsOwner()
        obj = type("FakeObj", (), {"user": reporter})()
        assert perm.has_object_permission(request, None, obj) is True

    def test_is_owner_mismatch(self, rf, reporter):
        other = User.objects.create_user(
            email="other@test.com", full_name="Other", password="pass1234",
            role=User.Role.REPORTER,
        )
        request = rf.get("/")
        request.user = reporter
        perm = IsOwner()
        obj = type("FakeObj", (), {"user": other})()
        assert perm.has_object_permission(request, None, obj) is False


@pytest.mark.django_db
class TestCustomJWTAuthentication:
    def test_get_user_not_found_returns_anonymous(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        auth = CustomJWTAuthentication()
        user = User.objects.create_user(
            email="del@test.com", full_name="Del", password="pass1234",
            role=User.Role.REPORTER,
        )
        refresh = RefreshToken.for_user(user)
        validated_token = refresh.access_token
        user.delete()
        result = auth.get_user(validated_token)
        assert result.is_anonymous is True

    def test_get_user_inactive_returns_anonymous(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        auth = CustomJWTAuthentication()
        user = User.objects.create_user(
            email="inactive@test.com", full_name="Inactive", password="pass1234",
            role=User.Role.REPORTER, is_active=False,
        )
        refresh = RefreshToken.for_user(user)
        validated_token = refresh.access_token
        result = auth.get_user(validated_token)
        assert result.is_anonymous is True


# ── Communication Permissions ───────────────────────────────────────


@pytest.mark.django_db
class TestCanAccessConversation:
    def test_no_case_pk_returns_false(self, rf):
        from apps.communication.permissions import CanAccessConversation
        request = rf.get("/")
        request.user = User.objects.create_user(
            email="test@test.com", full_name="Test", password="pass1234",
            role=User.Role.ADMIN,
        )
        request.auth = None
        view = MagicMock()
        view.kwargs = {}
        view.action = "list"
        view.resource_actions = {"list": "read"}
        perm = CanAccessConversation()
        assert perm.has_permission(request, view) is False

    def test_case_not_found_returns_false(self, rf, admin_user):
        from apps.communication.permissions import CanAccessConversation
        request = rf.get("/")
        request.user = admin_user
        request.auth = None
        view = MagicMock()
        view.kwargs = {"case_pk": "00000000-0000-0000-0000-000000000000"}
        view.action = "list"
        view.resource_actions = {"list": "read"}
        perm = CanAccessConversation()
        assert perm.has_permission(request, view) is False

    def test_anonymous_reporter_disallowed_action(self, rf, anon_reporter, category, reporter):
        from apps.communication.permissions import CanAccessConversation
        r = Report.objects.create(
            category=category, incident_date="2026-07-22",
            campus="Main", department="Eng", location_text="Loc",
            description="Test", reporter=reporter,
        )
        case = Case.objects.create(report=r)
        request = rf.get("/")
        request.user = AnonymousUser()
        request.auth = {"actor_type": "anonymous_reporter", "reporter_code": anon_reporter.reporter_code}
        view = MagicMock()
        view.kwargs = {"case_pk": str(case.id)}
        view.action = "destroy"
        view.resource_actions = {"destroy": "delete"}
        perm = CanAccessConversation()
        assert perm.has_permission(request, view) is False

    def test_no_role_authenticated_returns_false(self, rf):
        from apps.communication.permissions import CanAccessConversation
        u = User.objects.create_user(
            email="norole@test.com", full_name="No Role", password="pass1234",
            role=User.Role.REPORTER,
        )
        case = Case.objects.create(
            report=Report.objects.create(
                category=IncidentCategory.objects.create(name="Test", description="T"),
                incident_date="2026-07-22", campus="M", department="D",
                location_text="L", description="D", reporter=u,
            )
        )
        request = rf.get("/")
        request.user = u
        request.auth = None
        view = MagicMock()
        view.kwargs = {"case_pk": str(case.id)}
        view.action = "list"
        view.resource_actions = {"list": "read"}
        perm = CanAccessConversation()
        with patch.object(u, "role", None):
            assert perm.has_permission(request, view) is False

    def test_has_object_permission(self, rf, reporter, category):
        from apps.communication.permissions import CanAccessConversation
        from apps.communication.models import Conversation, Message
        r = Report.objects.create(
            category=category, incident_date="2026-07-22",
            campus="Main", department="Eng", location_text="Loc",
            description="Test", reporter=reporter,
        )
        case = Case.objects.create(report=r)
        conv = Conversation.objects.create(case=case)
        msg = Message.objects.create(conversation=conv, sender_user=reporter, sender_actor_type="REPORTER")
        request = rf.get("/")
        request.user = reporter
        request.auth = None
        perm = CanAccessConversation()
        assert perm.has_object_permission(request, None, msg) is True


# ── Communication Views ─────────────────────────────────────────────


@pytest.mark.django_db
class TestCommunicationViewsCoverage:
    def test_create_message_case_not_found_permission_denied(self, api_client, admin_user):
        authenticate(api_client, admin_user)
        resp = api_client.post(
            "/api/v1/cases/00000000-0000-0000-0000-000000000000/messages/",
            {"body": "Hello"}, format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_create_message_no_body_no_attachment(self, api_client, admin_user, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, admin_user)
        resp = api_client.post(
            f"/api/v1/cases/{case.id}/messages/",
            {}, format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "body or at least one attachment" in resp.data["error"]

    def test_create_message_anonymous_reporter_not_allowed_for_other_case(self, api_client, submitted_report, anon_reporter):
        case = Case.objects.create(report=submitted_report)
        api_client.force_authenticate(
            user=AnonymousUser(),
            token={"actor_type": "anonymous_reporter", "reporter_code": "NONEXISTENT"},
        )
        resp = api_client.post(
            f"/api/v1/cases/{case.id}/messages/",
            {"body": "Hello"}, format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_mark_read_message_not_found(self, api_client, admin_user, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, admin_user)
        resp = api_client.post(
            f"/api/v1/cases/{case.id}/messages/00000000-0000-0000-0000-000000000000/mark-read/",
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_list_messages_success(self, api_client, admin_user, submitted_report):
        from apps.communication.models import Conversation, Message
        case = Case.objects.create(report=submitted_report)
        conv = Conversation.objects.create(case=case)
        Message.objects.create(conversation=conv, sender_user=admin_user, sender_actor_type="ADMIN", body="Test")
        authenticate(api_client, admin_user)
        resp = api_client.get(f"/api/v1/cases/{case.id}/messages/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 1

    def test_mark_read_success(self, api_client, admin_user, submitted_report):
        from apps.communication.models import Conversation, Message
        case = Case.objects.create(report=submitted_report)
        conv = Conversation.objects.create(case=case)
        msg = Message.objects.create(conversation=conv, sender_user=admin_user, sender_actor_type="ADMIN", body="Test")
        authenticate(api_client, admin_user)
        resp = api_client.post(f"/api/v1/cases/{case.id}/messages/{msg.id}/mark-read/")
        assert resp.status_code == status.HTTP_200_OK
        msg.refresh_from_db()
        assert msg.read_at is not None


# ── Cases Views ─────────────────────────────────────────────────────


@pytest.mark.django_db
class TestCasesViewsCoverage:
    def test_get_serializer_class_assign(self, api_client, admin_user, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, admin_user)
        resp = api_client.post(
            f"/api/v1/cases/{case.id}/assign/",
            {"assigned_officer": ""}, format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_get_serializer_class_transition(self, api_client, admin_user, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, admin_user)
        resp = api_client.post(
            f"/api/v1/cases/{case.id}/transition/",
            {"new_status": "assigned"}, format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_get_serializer_class_notes_get(self, api_client, admin_user, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, admin_user)
        resp = api_client.get(f"/api/v1/cases/{case.id}/notes/")
        assert resp.status_code == status.HTTP_200_OK

    def test_get_serializer_class_notes_post(self, api_client, admin_user, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, admin_user)
        resp = api_client.post(
            f"/api/v1/cases/{case.id}/notes/",
            {"note_text": "Admin note", "is_internal": True}, format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED

    def test_get_serializer_class_request_information(self, api_client, admin_user, officer, submitted_report):
        case = Case.objects.create(report=submitted_report, status=Case.Status.ASSIGNED, assigned_officer=officer)
        authenticate(api_client, admin_user)
        resp = api_client.post(
            f"/api/v1/cases/{case.id}/request-information/",
            {"request_text": "What happened?"}, format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED

    def test_assign_user_not_found(self, api_client, admin_user, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, admin_user)
        resp = api_client.post(
            f"/api/v1/cases/{case.id}/assign/",
            {"assigned_officer": "00000000-0000-0000-0000-000000000000"}, format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "not found" in resp.data["error"]

    def test_assign_not_officer(self, api_client, admin_user, submitted_report, reporter):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, admin_user)
        resp = api_client.post(
            f"/api/v1/cases/{case.id}/assign/",
            {"assigned_officer": str(reporter.id)}, format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "must have role OFFICER" in resp.data["error"]

    def test_queryset_reporter_can_see_own_case(self, api_client, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, submitted_report.reporter)
        resp = api_client.get(f"{CASES_URL}{case.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["id"] == str(case.id)

    def test_perform_destroy(self, api_client, admin_user, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, admin_user)
        resp = api_client.delete(f"/api/v1/cases/{case.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        assert Case.objects.filter(id=case.id).count() == 0

    def test_respond_to_info_request_not_found(self, api_client, admin_user, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, admin_user)
        resp = api_client.post(
            f"/api/v1/cases/{case.id}/request-information/00000000-0000-0000-0000-000000000000/respond/",
            {"reporter_response": "My answer"}, format="json",
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_respond_to_info_request_fulfilled(self, api_client, admin_user, submitted_report):
        case = Case.objects.create(report=submitted_report)
        info_req = InformationRequest.objects.create(
            case=case, requested_by=admin_user, request_text="Test?",
            status=InformationRequest.Status.FULFILLED,
        )
        authenticate(api_client, admin_user)
        resp = api_client.post(
            f"/api/v1/cases/{case.id}/request-information/{info_req.id}/respond/",
            {"reporter_response": "Answer"}, format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "already been fulfilled" in resp.data["error"]

    def test_respond_to_info_request_success(self, api_client, reporter, submitted_report):
        case = Case.objects.create(report=submitted_report)
        info_req = InformationRequest.objects.create(
            case=case, requested_by=reporter, request_text="Test?",
        )
        authenticate(api_client, reporter)
        resp = api_client.post(
            f"/api/v1/cases/{case.id}/request-information/{info_req.id}/respond/",
            {"reporter_response": "My answer"}, format="json",
        )
        assert resp.status_code == status.HTTP_200_OK

    def test_perform_destroy_logs_audit(self, api_client, admin_user, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, admin_user)
        api_client.delete(f"/api/v1/cases/{case.id}/")
        assert AuditLog.objects.filter(action="DELETE", resource_type="case").exists()


# ── Notifications Views ─────────────────────────────────────────────


@pytest.mark.django_db
class TestNotificationsViewsCoverage:
    def test_mark_read_wrong_user(self, api_client, reporter, admin_user):
        notif = Notification.objects.create(
            recipient_user=reporter,
            notification_type="report_submitted",
            payload={"message": "Test"},
        )
        authenticate(api_client, admin_user)
        resp = api_client.post(f"/api/v1/notifications/{notif.id}/mark-read/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_mark_all_read_success(self, api_client, reporter):
        Notification.objects.create(
            recipient_user=reporter,
            notification_type="report_submitted",
            payload={"message": "Test"},
            is_read=False,
        )
        Notification.objects.create(
            recipient_user=reporter,
            notification_type="case_assigned",
            payload={"message": "Test2"},
            is_read=False,
        )
        authenticate(api_client, reporter)
        resp = api_client.post("/api/v1/notifications/mark-all-read/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["updated_count"] == 2
        assert Notification.objects.filter(recipient_user=reporter, is_read=True).count() == 2

    def test_list_filtered_by_is_read(self, api_client, reporter):
        Notification.objects.create(
            recipient_user=reporter,
            notification_type="report_submitted",
            payload={"message": "Unread"},
            is_read=False,
        )
        Notification.objects.create(
            recipient_user=reporter,
            notification_type="case_assigned",
            payload={"message": "Read"},
            is_read=True,
        )
        authenticate(api_client, reporter)
        resp = api_client.get("/api/v1/notifications/?is_read=true")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 1
        assert resp.data["results"][0]["is_read"] is True

    def test_list_filtered_by_is_read_false(self, api_client, reporter):
        Notification.objects.create(
            recipient_user=reporter,
            notification_type="report_submitted",
            payload={"message": "Unread"},
            is_read=False,
        )
        authenticate(api_client, reporter)
        resp = api_client.get("/api/v1/notifications/?is_read=false")
        assert resp.status_code == status.HTTP_200_OK

    def test_mark_read_unauthenticated(self, api_client):
        resp = api_client.post("/api/v1/notifications/some-id/mark-read/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ── Reports Utils ───────────────────────────────────────────────────


@pytest.mark.django_db
class TestReportsUtils:
    def test_generate_case_number_first(self):
        num = generate_case_number()
        assert num.startswith("GBV-")
        assert num.endswith("-000001")

    def test_generate_case_number_increment(self, category, reporter):
        Report.objects.create(
            category=category, incident_date="2026-07-22",
            campus="Main", department="Eng", location_text="Loc",
            description="First", reporter=reporter,
            status=Report.Status.SUBMITTED, case_number="GBV-2026-000005",
        )
        num = generate_case_number()
        assert num == "GBV-2026-000006"

    def test_generate_case_number_malformed_last(self, category, reporter):
        Report.objects.create(
            category=category, incident_date="2026-07-22",
            campus="Main", department="Eng", location_text="Loc",
            description="Bad", reporter=reporter,
            status=Report.Status.SUBMITTED, case_number="GBV-2026-INVALID",
        )
        num = generate_case_number()
        assert num.endswith("-000001")

    def test_evidence_upload_path(self):
        ev = MagicMock()
        ev.id = "abc-123"
        ev.report_id = "rep-456"
        path = evidence_upload_path(ev, "photo.png")
        assert path == "evidence/rep-456/abc-123.png"

    def test_evidence_upload_path_no_ext(self):
        ev = MagicMock()
        ev.id = "abc-123"
        ev.report_id = "rep-456"
        path = evidence_upload_path(ev, "noext")
        assert path == "evidence/rep-456/abc-123"

    def test_evidence_upload_path_sanitize(self):
        ev = MagicMock()
        ev.id = "abc 123"
        ev.report_id = "rep_456"
        path = evidence_upload_path(ev, "bad file!.png")
        assert " " not in path
        assert "!" not in path
        assert path.endswith(".png")


# ── Backup Command ──────────────────────────────────────────────────


@pytest.mark.django_db
class TestBackupCommand:
    def test_backup_sqlite_success(self, tmp_path):
        out_dir = tmp_path / "backups"
        with patch("shutil.copy2") as mock_copy:
            call_command("backup_db", f"--output-dir={out_dir}")
            mock_copy.assert_called_once()
            out_dir.mkdir(parents=True, exist_ok=True)
            (out_dir / "test.sqlite3").touch()
            files = list(out_dir.iterdir())
            assert any(str(f).endswith(".sqlite3") for f in files)

    def test_backup_pg_dump_success(self, tmp_path):
        with patch("django.conf.settings.DATABASES", {
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "NAME": "testdb", "USER": "test", "PASSWORD": "pass",
                "HOST": "localhost", "PORT": "5432",
            }
        }):
            with patch("subprocess.run") as mock_run:
                mock_run.return_value.returncode = 0
                out_dir = tmp_path / "backups"
                call_command("backup_db", f"--output-dir={out_dir}")
                mock_run.assert_called_once()
                assert "pg_dump" in mock_run.call_args[0][0]

    def test_backup_pg_dump_failure(self, tmp_path):
        with patch("django.conf.settings.DATABASES", {
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "NAME": "testdb", "USER": "test", "PASSWORD": "pass",
                "HOST": "localhost", "PORT": "5432",
            }
        }):
            with patch("subprocess.run") as mock_run:
                mock_run.return_value.returncode = 1
                mock_run.return_value.stderr = "pg_dump error"
                with patch("sys.stderr", new_callable=io.StringIO) as stderr:
                    out_dir = tmp_path / "backups"
                    call_command("backup_db", f"--output-dir={out_dir}")
                    assert "pg_dump failed" in stderr.getvalue()

    def test_backup_unsupported_engine(self):
        with patch("django.conf.settings.DATABASES", {
            "default": {"ENGINE": "django.db.backends.mysql", "NAME": "test"}
        }):
            with patch("sys.stderr", new_callable=io.StringIO) as stderr:
                call_command("backup_db", "--output-dir=/tmp")
                assert "Unsupported" in stderr.getvalue()


# ── Notification Tasks ──────────────────────────────────────────────


@pytest.mark.django_db
class TestNotificationTasks:
    def test_send_notification_email_success(self, mailoutbox, reporter):
        notif = Notification.objects.create(
            recipient_user=reporter,
            notification_type="report_submitted",
            payload={"message": "Hello", "link": "/reports/123"},
        )
        send_notification_email(notif.id)
        assert len(mailoutbox) == 1
        assert mailoutbox[0].subject == "GBV System: Report Submitted"
        assert "Hello" in mailoutbox[0].body
        assert "/reports/123" in mailoutbox[0].body
        assert mailoutbox[0].to == [reporter.email]

    def test_send_notification_email_no_recipient(self):
        anon = AnonymousReporter.objects.create(
            reporter_code="NOTIFANON", hashed_password="test",
        )
        notif = Notification.objects.create(
            recipient_user=None,
            recipient_anonymous_reporter=anon,
            notification_type="report_submitted",
            payload={"message": "Test"},
        )
        send_notification_email(notif.id)
        # Should not crash; returns silently

    def test_send_notification_email_no_email(self, reporter):
        reporter.email = ""
        reporter.save()
        notif = Notification.objects.create(
            recipient_user=reporter,
            notification_type="report_submitted",
            payload={"message": "Test"},
        )
        send_notification_email(notif.id)
        # Should not crash; returns silently

    def test_send_notification_email_not_found(self):
        send_notification_email(99999)
        # Should not crash; returns silently


# ── Analytics Views ─────────────────────────────────────────────────


@pytest.mark.django_db
class TestAnalyticsViewsCoverage:
    def test_summary_with_resolved_case(self, api_client, admin_user, reporter, category):
        r = Report.objects.create(
            category=category, incident_date="2026-07-22",
            campus="Main", department="Eng", location_text="Loc",
            description="Test", reporter=reporter,
            status=Report.Status.SUBMITTED, case_number="GBV-2026-000010",
        )
        from django.utils import timezone
        Case.objects.create(
            report=r, status=Case.Status.CLOSED,
            opened_at=timezone.now() - __import__("datetime").timedelta(days=5),
            closed_at=timezone.now(),
        )
        authenticate(api_client, admin_user)
        resp = api_client.get("/api/v1/analytics/summary/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["total_reports"] >= 1
        assert resp.data["avg_resolution_time_seconds"] is not None

    def test_audit_logs_pagination(self, api_client, admin_user):
        authenticate(api_client, admin_user)
        resp = api_client.get("/api/v1/analytics/audit-logs/")
        assert resp.status_code == status.HTTP_200_OK


# ── TOTP Auth (disabled) ───────────────────────────────────────────
# TOTP 2FA is currently off: no role requires it, and the enroll/verify
# endpoints refuse everyone because requires_totp is always False.


@pytest.mark.django_db
class TestTOTPCoverage:
    def test_totp_enroll_returns_403_for_all(self, api_client, reporter, officer):
        for user in (reporter, officer):
            authenticate(api_client, user)
            resp = api_client.post("/api/v1/auth/totp/enroll/")
            assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_totp_verify_returns_403_for_all(self, api_client, reporter, officer):
        for user in (reporter, officer):
            authenticate(api_client, user)
            resp = api_client.post("/api/v1/auth/totp/verify/", {"code": "000000"}, format="json")
            assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_totp_status_false_for_reporters(self, api_client, reporter):
        authenticate(api_client, reporter)
        resp = api_client.get("/api/v1/auth/totp/status/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["requires_totp"] is False

    def test_totp_status_false_for_officers(self, api_client, officer):
        authenticate(api_client, officer)
        resp = api_client.get("/api/v1/auth/totp/status/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["requires_totp"] is False
        assert resp.data["enrolled"] is False


# ── Logout Edge Cases ────────────────────────────────────────────────


@pytest.mark.django_db
class TestLogoutCoverage:
    def test_logout_invalid_token(self, api_client, reporter):
        authenticate(api_client, reporter)
        resp = api_client.post("/api/v1/auth/logout/", {"refresh_token": "invalidtoken"}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid" in resp.data["detail"]


# ── Seed Demo Data Command ────────────────────────────────────────────


@pytest.mark.django_db
class TestSeedDemoData:
    def test_seed_demo_data_creates_records(self):
        from django.core.management import call_command
        call_command("seed_demo_data")
        assert User.objects.filter(email="admin@gbv-demo.org").exists()
        assert User.objects.filter(email="officer@gbv-demo.org").exists()
        assert User.objects.filter(email="reporter@gbv-demo.org").exists()
        assert IncidentCategory.objects.count() == 14
        assert Report.objects.count() == 3

    def test_seed_demo_data_idempotent(self):
        from django.core.management import call_command
        call_command("seed_demo_data")
        call_command("seed_demo_data")
        assert User.objects.count() == 3

    def test_seed_demo_data_refuses_prod(self, monkeypatch):
        from django.core.management import call_command
        monkeypatch.setenv("DJANGO_SETTINGS_MODULE", "config.settings.prod")
        with patch("sys.stderr", new_callable=io.StringIO) as stderr:
            call_command("seed_demo_data")
            assert "refusing" in stderr.getvalue().lower()
