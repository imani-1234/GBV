import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.cases.models import ALLOWED_TRANSITIONS, Case, CaseNote, InformationRequest
from apps.reports.models import IncidentCategory, Report

User = get_user_model()

CASES_URL = "/api/v1/cases/"


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
def submitted_report(reporter, category):
    return Report.objects.create(
        reporter=reporter,
        category=category,
        incident_date="2026-07-22",
        campus="Main Campus",
        department="Engineering",
        location_text="Building A",
        description="Test report",
        status=Report.Status.SUBMITTED,
        case_number="GBV-2026-000001",
    )


@pytest.fixture
def case_with_status(submitted_report, request):
    marker = request.node.get_closest_marker("case_status")
    status_val = marker.args[0] if marker else Case.Status.PENDING_REVIEW
    case = Case.objects.create(report=submitted_report, status=status_val)
    return case


def authenticate(api_client, user):
    api_client.force_authenticate(user=user)


# ── Model & State Machine ──────────────────────────────────────────


@pytest.mark.django_db
class TestCaseModel:
    def test_create_case_default_status(self, submitted_report):
        case = Case.objects.create(report=submitted_report)
        assert case.status == Case.Status.PENDING_REVIEW
        assert case.opened_at is not None
        assert case.closed_at is None

    def test_assign_officer_validates_role(self, submitted_report, reporter):
        with pytest.raises(Exception):
            Case.objects.create(report=submitted_report, assigned_officer=reporter)

    def test_assign_officer_accepted(self, submitted_report, officer):
        case = Case.objects.create(report=submitted_report, assigned_officer=officer)
        assert case.assigned_officer == officer

    def test_allowed_transitions_exist(self):
        for status_key, _ in Case.Status.choices:
            assert status_key in ALLOWED_TRANSITIONS

    def test_transition_valid(self, submitted_report, admin_user):
        case = Case.objects.create(report=submitted_report)
        case.transition("ASSIGNED", admin_user)
        assert case.status == "ASSIGNED"

    def test_transition_invalid_raises(self, submitted_report, admin_user):
        case = Case.objects.create(report=submitted_report)
        with pytest.raises(ValueError, match="Cannot transition"):
            case.transition("RESOLVED", admin_user)

    def test_transition_closed_sets_closed_at(self, submitted_report, admin_user):
        case = Case.objects.create(report=submitted_report)
        case.transition("ASSIGNED", admin_user)
        case.transition("UNDER_REVIEW", admin_user)
        case.transition("RESOLVED", admin_user)
        case.transition("CLOSED", admin_user)
        assert case.closed_at is not None

    def test_transition_reopened_clears_closed_at(self, submitted_report, admin_user):
        case = Case.objects.create(report=submitted_report)
        case.transition("ASSIGNED", admin_user)
        case.transition("UNDER_REVIEW", admin_user)
        case.transition("RESOLVED", admin_user)
        case.transition("CLOSED", admin_user)
        assert case.closed_at is not None
        case.transition("REOPENED", admin_user)
        assert case.closed_at is None


# ── Illegal Transitions (at least 2 distinct) ─────────────────────


@pytest.mark.django_db
class TestIllegalTransitions:
    def test_cannot_skip_from_pending_to_resolved(self, submitted_report, admin_user):
        case = Case.objects.create(report=submitted_report)
        with pytest.raises(ValueError, match="Cannot transition"):
            case.transition("RESOLVED", admin_user)

    def test_cannot_close_without_review(self, submitted_report, admin_user):
        case = Case.objects.create(report=submitted_report, status=Case.Status.UNDER_REVIEW)
        with pytest.raises(ValueError, match="Cannot transition"):
            case.transition("REOPENED", admin_user)


# ── Assign Endpoint ────────────────────────────────────────────────


@pytest.mark.django_db
class TestAssign:
    def test_officer_assigns_self(self, api_client, officer, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, officer)
        resp = api_client.post(
            f"{CASES_URL}{case.id}/assign/",
            {"assigned_officer": str(officer.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert str(resp.data["assigned_officer"]) == str(officer.id)
        assert resp.data["status"] == "ASSIGNED"

    def test_assign_reporter_rejected(self, api_client, reporter, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, reporter)
        resp = api_client.post(
            f"{CASES_URL}{case.id}/assign/",
            {"assigned_officer": str(reporter.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_assign_non_officer_rejected(self, api_client, officer, submitted_report, reporter):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, officer)
        resp = api_client.post(
            f"{CASES_URL}{case.id}/assign/",
            {"assigned_officer": str(reporter.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "OFFICER" in resp.data["error"]


# ── Transition Endpoint ────────────────────────────────────────────


@pytest.mark.django_db
class TestTransitionEndpoint:
    def test_full_lifecycle(self, api_client, officer, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, officer)

        case.transition("ASSIGNED", officer)

        transitions = [
            "UNDER_REVIEW",
            "UNDER_INVESTIGATION",
            "AWAITING_REPORTER_RESPONSE",
            "UNDER_REVIEW",
            "REFERRED",
            "UNDER_REVIEW",
            "RESOLVED",
            "CLOSED",
        ]
        for new_status in transitions:
            resp = api_client.post(
                f"{CASES_URL}{case.id}/transition/",
                {"new_status": new_status},
                format="json",
            )
            assert resp.status_code == status.HTTP_200_OK, f"Failed at {new_status}: {resp.data}"
            assert resp.data["status"] == new_status

    def test_illegal_transition_via_api(self, api_client, officer, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, officer)
        resp = api_client.post(
            f"{CASES_URL}{case.id}/transition/",
            {"new_status": "RESOLVED"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "Cannot transition" in resp.data["error"]

    def test_transition_with_note(self, api_client, officer, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, officer)
        case.transition("ASSIGNED", officer)
        resp = api_client.post(
            f"{CASES_URL}{case.id}/transition/",
            {"new_status": "UNDER_REVIEW", "note": "Starting review"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        notes = CaseNote.objects.filter(case=case, is_internal=True)
        assert notes.count() >= 1
        assert any("Starting review" in n.note_text for n in notes)

    def test_reporter_cannot_transition(self, api_client, reporter, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, reporter)
        resp = api_client.post(
            f"{CASES_URL}{case.id}/transition/",
            {"new_status": "ASSIGNED"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ── Notes ──────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestNotes:
    def test_officer_adds_note(self, api_client, officer, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, officer)
        resp = api_client.post(
            f"{CASES_URL}{case.id}/notes/",
            {"note_text": "Initial assessment", "is_internal": True},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["is_internal"] is True

    def test_reporter_cannot_add_note(self, api_client, reporter, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, reporter)
        resp = api_client.post(
            f"{CASES_URL}{case.id}/notes/",
            {"note_text": "Should fail"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_reporter_sees_only_public_notes(
        self, api_client, reporter, officer, submitted_report
    ):
        case = Case.objects.create(report=submitted_report)
        internal = CaseNote.objects.create(
            case=case, author=officer, note_text="Internal note", is_internal=True
        )
        public = CaseNote.objects.create(
            case=case, author=officer, note_text="Public note", is_internal=False
        )
        authenticate(api_client, reporter)
        resp = api_client.get(f"{CASES_URL}{case.id}/notes/")
        assert resp.status_code == status.HTTP_200_OK
        ids = [n["id"] for n in resp.data]
        assert str(public.id) in ids
        assert str(internal.id) not in ids

    def test_officer_sees_all_notes(self, api_client, officer, submitted_report):
        case = Case.objects.create(report=submitted_report)
        CaseNote.objects.create(
            case=case, author=officer, note_text="Internal note", is_internal=True
        )
        CaseNote.objects.create(
            case=case, author=officer, note_text="Public note", is_internal=False
        )
        authenticate(api_client, officer)
        resp = api_client.get(f"{CASES_URL}{case.id}/notes/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 2

    def test_notes_filtered_at_queryset_level(
        self, api_client, reporter, officer, submitted_report
    ):
        case = Case.objects.create(report=submitted_report)
        internal = CaseNote.objects.create(
            case=case, author=officer, note_text="Secret", is_internal=True
        )
        authenticate(api_client, reporter)
        resp = api_client.get(f"{CASES_URL}{case.id}/notes/")
        raw_ids = [n["id"] for n in resp.data]
        assert str(internal.id) not in raw_ids


# ── Information Request ────────────────────────────────────────────


@pytest.mark.django_db
class TestInformationRequest:
    def test_officer_creates_request(self, api_client, officer, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, officer)
        resp = api_client.post(
            f"{CASES_URL}{case.id}/request-information/",
            {"request_text": "Please provide your statement"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["status"] == "PENDING"
        assert resp.data["request_text"] == "Please provide your statement"

    def test_reporter_responds(self, api_client, reporter, officer, submitted_report):
        case = Case.objects.create(report=submitted_report)
        info_req = InformationRequest.objects.create(
            case=case,
            requested_by=officer,
            request_text="Please provide details",
        )
        authenticate(api_client, reporter)
        resp = api_client.post(
            f"{CASES_URL}{case.id}/request-information/{info_req.id}/respond/",
            {"reporter_response": "Here are the details"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "FULFILLED"
        assert resp.data["reporter_response"] == "Here are the details"

    def test_respond_to_nonexistent_returns_404(
        self, api_client, reporter, submitted_report
    ):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, reporter)
        fake_id = "00000000-0000-0000-0000-000000000000"
        resp = api_client.post(
            f"{CASES_URL}{case.id}/request-information/{fake_id}/respond/",
            {"reporter_response": "test"},
            format="json",
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_double_respond_rejected(self, api_client, reporter, officer, submitted_report):
        case = Case.objects.create(report=submitted_report)
        info_req = InformationRequest.objects.create(
            case=case,
            requested_by=officer,
            request_text="Please provide details",
        )
        authenticate(api_client, reporter)
        api_client.post(
            f"{CASES_URL}{case.id}/request-information/{info_req.id}/respond/",
            {"reporter_response": "First response"},
            format="json",
        )
        resp = api_client.post(
            f"{CASES_URL}{case.id}/request-information/{info_req.id}/respond/",
            {"reporter_response": "Second response"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "already been fulfilled" in resp.data["error"]

    def test_non_reporter_cannot_respond(
        self, api_client, officer, submitted_report
    ):
        case = Case.objects.create(report=submitted_report)
        info_req = InformationRequest.objects.create(
            case=case,
            requested_by=officer,
            request_text="Details needed",
        )
        authenticate(api_client, officer)
        resp = api_client.post(
            f"{CASES_URL}{case.id}/request-information/{info_req.id}/respond/",
            {"reporter_response": "Should fail"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_reporter_cannot_create_info_request(
        self, api_client, reporter, submitted_report
    ):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, reporter)
        resp = api_client.post(
            f"{CASES_URL}{case.id}/request-information/",
            {"request_text": "Should fail"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ── RBAC for Cases ─────────────────────────────────────────────────


@pytest.mark.django_db
class TestCaseRBAC:
    def test_reporter_reads_own_case(self, api_client, reporter, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, reporter)
        resp = api_client.get(f"{CASES_URL}{case.id}/")
        assert resp.status_code == status.HTTP_200_OK

    def test_reporter_cannot_read_others_case(
        self, api_client, reporter, submitted_report
    ):
        other = User.objects.create_user(
            email="other@test.com",
            full_name="Other",
            password="pass1234",
            role=User.Role.REPORTER,
        )
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, other)
        resp = api_client.get(f"{CASES_URL}{case.id}/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_officer_reads_assigned_case(
        self, api_client, officer, submitted_report
    ):
        case = Case.objects.create(report=submitted_report, assigned_officer=officer)
        authenticate(api_client, officer)
        resp = api_client.get(f"{CASES_URL}{case.id}/")
        assert resp.status_code == status.HTTP_200_OK

    def test_officer_reads_unassigned_case(
        self, api_client, officer, submitted_report
    ):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, officer)
        resp = api_client.get(f"{CASES_URL}{case.id}/")
        assert resp.status_code == status.HTTP_200_OK

    def test_officer_cannot_read_others_assigned_case(
        self, api_client, officer, officer2, submitted_report
    ):
        case = Case.objects.create(report=submitted_report, assigned_officer=officer)
        authenticate(api_client, officer2)
        resp = api_client.get(f"{CASES_URL}{case.id}/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_admin_reads_any_case(
        self, api_client, admin_user, submitted_report
    ):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, admin_user)
        resp = api_client.get(f"{CASES_URL}{case.id}/")
        assert resp.status_code == status.HTTP_200_OK


# ── Audit Log for Transitions ──────────────────────────────────────


@pytest.mark.django_db
class TestCaseAuditLog:
    def test_transition_logs_status_change(self, api_client, officer, submitted_report):
        from apps.core.models import AuditLog

        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, officer)
        case.transition("ASSIGNED", officer)
        assert AuditLog.objects.filter(
            action="STATUS_TRANSITION",
            resource_type="case",
            resource_id=str(case.id),
        ).exists()
        entry = AuditLog.objects.get(
            action="STATUS_TRANSITION",
            resource_type="case",
            resource_id=str(case.id),
        )
        assert entry.metadata["from"] == "PENDING_REVIEW"
        assert entry.metadata["to"] == "ASSIGNED"
        assert entry.actor == officer


# ── Unassign ────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestUnassign:
    def test_admin_unassigns_officer(self, api_client, admin_user, officer, submitted_report):
        case = Case.objects.create(
            report=submitted_report,
            assigned_officer=officer,
            status=Case.Status.ASSIGNED,
        )
        authenticate(api_client, admin_user)
        resp = api_client.post(f"{CASES_URL}{case.id}/unassign/")
        assert resp.status_code == status.HTTP_200_OK
        case.refresh_from_db()
        assert case.assigned_officer is None
        assert case.status == Case.Status.PENDING_REVIEW

    def test_officer_unassigns_own_case(
        self, api_client, officer, submitted_report
    ):
        case = Case.objects.create(
            report=submitted_report,
            assigned_officer=officer,
            status=Case.Status.ASSIGNED,
        )
        authenticate(api_client, officer)
        resp = api_client.post(f"{CASES_URL}{case.id}/unassign/")
        assert resp.status_code == status.HTTP_200_OK
        case.refresh_from_db()
        assert case.assigned_officer is None

    def test_reporter_cannot_unassign(self, api_client, reporter, officer, submitted_report):
        case = Case.objects.create(
            report=submitted_report,
            assigned_officer=officer,
            status=Case.Status.ASSIGNED,
        )
        authenticate(api_client, reporter)
        resp = api_client.post(f"{CASES_URL}{case.id}/unassign/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ── Overwrite Priority ──────────────────────────────────────────────


@pytest.mark.django_db
class TestOverwritePriority:
    def test_admin_overwrites_priority(self, api_client, admin_user, submitted_report):
        case = Case.objects.create(report=submitted_report, priority=Case.Priority.LOW)
        authenticate(api_client, admin_user)
        resp = api_client.post(
            f"{CASES_URL}{case.id}/overwrite-priority/",
            {"priority": "critical"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        case.refresh_from_db()
        assert case.priority == Case.Priority.CRITICAL

    def test_officer_overwrites_priority(self, api_client, officer, submitted_report):
        case = Case.objects.create(report=submitted_report, priority="medium")
        authenticate(api_client, officer)
        resp = api_client.post(
            f"{CASES_URL}{case.id}/overwrite-priority/",
            {"priority": "high"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        case.refresh_from_db()
        assert case.priority == Case.Priority.HIGH

    def test_invalid_priority_rejected(self, api_client, admin_user, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, admin_user)
        resp = api_client.post(
            f"{CASES_URL}{case.id}/overwrite-priority/",
            {"priority": "emergency"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_reporter_cannot_overwrite_priority(self, api_client, reporter, submitted_report):
        case = Case.objects.create(report=submitted_report)
        authenticate(api_client, reporter)
        resp = api_client.post(
            f"{CASES_URL}{case.id}/overwrite-priority/",
            {"priority": "high"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN
