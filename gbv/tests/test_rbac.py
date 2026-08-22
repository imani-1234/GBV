import pytest
from django.contrib.auth.models import Group
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.cases.models import Case
from apps.core.models import AuditLog
from apps.core.permissions_matrix import PERMISSION_MATRIX
from apps.reports.models import IncidentCategory, Report

REPORTS_URL = "/api/v1/reports/"
CASES_URL = "/api/v1/cases/"


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def groups():
    for name in ["Reporter", "GBVOfficer", "Admin"]:
        Group.objects.get_or_create(name=name)


@pytest.fixture
def category(groups):
    return IncidentCategory.objects.create(
        name="Physical Assault",
        description="Physical assault incident",
        default_priority="high",
    )


@pytest.fixture
def reporter(groups):
    return User.objects.create_user(
        email="reporter@test.com",
        full_name="Reporter User",
        password="pass1234",
        role=User.Role.REPORTER,
    )


@pytest.fixture
def reporter2(groups):
    return User.objects.create_user(
        email="reporter2@test.com",
        full_name="Reporter Two",
        password="pass1234",
        role=User.Role.REPORTER,
    )


@pytest.fixture
def officer(groups):
    return User.objects.create_user(
        email="officer@test.com",
        full_name="Officer User",
        password="pass1234",
        role=User.Role.OFFICER,
    )


@pytest.fixture
def officer2(groups):
    return User.objects.create_user(
        email="officer2@test.com",
        full_name="Officer Two",
        password="pass1234",
        role=User.Role.OFFICER,
    )


@pytest.fixture
def admin_user(groups):
    return User.objects.create_user(
        email="admin@test.com",
        full_name="Admin User",
        password="pass1234",
        role=User.Role.ADMIN,
        is_staff=True,
    )


@pytest.fixture
def report_of_reporter(reporter, category):
    return Report.objects.create(
        category=category,
        incident_date="2026-07-22",
        campus="Main Campus",
        department="Engineering",
        location_text="Building A, Room 101",
        description="A test report",
        reporter=reporter,
        status=Report.Status.SUBMITTED,
    )


@pytest.fixture
def report_assigned_to_officer(reporter, officer, category):
    return Report.objects.create(
        category=category,
        incident_date="2026-07-22",
        campus="Main Campus",
        department="Engineering",
        location_text="Building A, Room 101",
        description="Assigned report",
        reporter=reporter,
        assigned_officer=officer,
        status=Report.Status.ASSIGNED,
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
        description="A test report",
        status=Report.Status.SUBMITTED,
        case_number="GBV-2026-000001",
    )


@pytest.fixture
def submitted_report2(reporter2, category):
    return Report.objects.create(
        reporter=reporter2,
        category=category,
        incident_date="2026-07-22",
        campus="Main Campus",
        department="Engineering",
        location_text="Building A",
        description="A test report",
        status=Report.Status.SUBMITTED,
        case_number="GBV-2026-000002",
    )


@pytest.fixture
def case_of_reporter(reporter, submitted_report):
    return Case.objects.create(
        report=submitted_report,
        status=Case.Status.PENDING_REVIEW,
    )


@pytest.fixture
def case_assigned_to_officer(reporter, officer, submitted_report):
    return Case.objects.create(
        report=submitted_report,
        assigned_officer=officer,
        status=Case.Status.ASSIGNED,
    )


def authenticate(api_client, user):
    api_client.force_authenticate(user=user)


# ── Basic Permission Matrix Contract ──────────────────────────────


@pytest.mark.django_db
class TestPermissionMatrixContract:
    def test_matrix_has_all_roles(self):
        assert set(PERMISSION_MATRIX.keys()) == {"REPORTER", "OFFICER", "ADMIN"}

    def test_matrix_has_all_resources(self):
        resources = {"report", "case", "message", "user", "analytics"}
        for role, perms in PERMISSION_MATRIX.items():
            assert set(perms.keys()) == resources, f"{role} missing resources"

    def test_reporter_cannot_read_all_reports(self):
        assert "read_all" not in PERMISSION_MATRIX["REPORTER"]["report"]

    def test_reporter_can_submit(self):
        assert "submit" in PERMISSION_MATRIX["REPORTER"]["report"]

    def test_reporter_can_upload_evidence(self):
        assert "evidence_upload" in PERMISSION_MATRIX["REPORTER"]["report"]

    def test_admin_has_full_access_to_reports(self):
        report_actions = PERMISSION_MATRIX["ADMIN"]["report"]
        for action in ["create", "read_own", "read_all", "update_status", "assign", "close", "submit", "evidence_upload"]:
            assert action in report_actions

    def test_admin_has_full_access_to_cases(self):
        case_actions = PERMISSION_MATRIX["ADMIN"]["case"]
        for action in ["create", "read_own", "read_all", "update", "assign", "close"]:
            assert action in case_actions


# ── Reporter Permission Tests ─────────────────────────────────────


@pytest.mark.django_db
class TestReporterPermissions:
    def test_reporter_creates_own_report(self, api_client, reporter, category):
        authenticate(api_client, reporter)
        resp = api_client.post(
            REPORTS_URL,
            {
                "category": str(category.id),
                "incident_date": "2026-07-22",
                "campus": "Main Campus",
                "department": "Engineering",
                "location_text": "Building A, Room 101",
                "description": "Test report",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["status"] == "draft"
        assert resp.data["category"]["id"] == str(category.id)

    def test_reporter_lists_own_reports(self, api_client, reporter, report_of_reporter):
        authenticate(api_client, reporter)
        resp = api_client.get(REPORTS_URL)
        assert resp.status_code == status.HTTP_200_OK
        ids = [r["id"] for r in resp.data["results"]]
        assert str(report_of_reporter.id) in ids

    def test_reporter_reads_own_report_by_id(
        self, api_client, reporter, report_of_reporter
    ):
        authenticate(api_client, reporter)
        resp = api_client.get(f"{REPORTS_URL}{report_of_reporter.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["id"] == str(report_of_reporter.id)

    def test_reporter_gets_404_for_others_report(
        self, api_client, reporter, reporter2, report_of_reporter
    ):
        authenticate(api_client, reporter2)
        resp = api_client.get(f"{REPORTS_URL}{report_of_reporter.id}/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_reporter_cannot_update_report_status(
        self, api_client, reporter, report_of_reporter
    ):
        authenticate(api_client, reporter)
        resp = api_client.patch(
            f"{REPORTS_URL}{report_of_reporter.id}/",
            {"status": "resolved"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_reporter_lists_own_cases(self, api_client, reporter, case_of_reporter):
        authenticate(api_client, reporter)
        resp = api_client.get(CASES_URL)
        assert resp.status_code == status.HTTP_200_OK
        ids = [c["id"] for c in resp.data["results"]]
        assert str(case_of_reporter.id) in ids

    def test_reporter_gets_404_for_others_case(
        self, api_client, reporter, reporter2, case_of_reporter
    ):
        authenticate(api_client, reporter2)
        resp = api_client.get(f"{CASES_URL}{case_of_reporter.id}/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND


# ── Officer Permission Tests ──────────────────────────────────────


@pytest.mark.django_db
class TestOfficerPermissions:
    def test_officer_reads_assigned_report(
        self, api_client, officer, report_assigned_to_officer
    ):
        authenticate(api_client, officer)
        resp = api_client.get(f"{REPORTS_URL}{report_assigned_to_officer.id}/")
        assert resp.status_code == status.HTTP_200_OK

    def test_officer_reads_unassigned_report(
        self, api_client, officer, report_of_reporter
    ):
        authenticate(api_client, officer)
        resp = api_client.get(f"{REPORTS_URL}{report_of_reporter.id}/")
        assert resp.status_code == status.HTTP_200_OK

    def test_officer_cannot_read_other_officers_assigned_report(
        self, api_client, officer, officer2, report_assigned_to_officer
    ):
        authenticate(api_client, officer2)
        resp = api_client.get(f"{REPORTS_URL}{report_assigned_to_officer.id}/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_officer_reads_assigned_case(
        self, api_client, officer, case_assigned_to_officer
    ):
        authenticate(api_client, officer)
        resp = api_client.get(f"{CASES_URL}{case_assigned_to_officer.id}/")
        assert resp.status_code == status.HTTP_200_OK

    def test_officer_reads_unassigned_case(
        self, api_client, officer, case_of_reporter
    ):
        authenticate(api_client, officer)
        resp = api_client.get(f"{CASES_URL}{case_of_reporter.id}/")
        assert resp.status_code == status.HTTP_200_OK

    def test_officer_cannot_close_report(
        self, api_client, officer, report_assigned_to_officer
    ):
        authenticate(api_client, officer)
        resp = api_client.delete(f"{REPORTS_URL}{report_assigned_to_officer.id}/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_officer_can_list_reports(self, api_client, officer):
        authenticate(api_client, officer)
        resp = api_client.get(REPORTS_URL)
        assert resp.status_code == status.HTTP_200_OK

    def test_officer_can_list_cases(self, api_client, officer):
        authenticate(api_client, officer)
        resp = api_client.get(CASES_URL)
        assert resp.status_code == status.HTTP_200_OK


# ── Admin Permission Tests ────────────────────────────────────────


@pytest.mark.django_db
class TestAdminPermissions:
    def test_admin_reads_any_report(self, api_client, admin_user, report_of_reporter):
        authenticate(api_client, admin_user)
        resp = api_client.get(f"{REPORTS_URL}{report_of_reporter.id}/")
        assert resp.status_code == status.HTTP_200_OK

    def test_admin_reads_any_case(self, api_client, admin_user, case_of_reporter):
        authenticate(api_client, admin_user)
        resp = api_client.get(f"{CASES_URL}{case_of_reporter.id}/")
        assert resp.status_code == status.HTTP_200_OK

    def admin_can_list_reports(self, api_client, admin_user):
        authenticate(api_client, admin_user)
        resp = api_client.get(REPORTS_URL)
        assert resp.status_code == status.HTTP_200_OK

    def admin_can_list_cases(self, api_client, admin_user):
        authenticate(api_client, admin_user)
        resp = api_client.get(CASES_URL)
        assert resp.status_code == status.HTTP_200_OK

    def test_admin_can_submit_report(
        self, api_client, admin_user, reporter, category
    ):
        authenticate(api_client, admin_user)
        create_resp = api_client.post(
            REPORTS_URL,
            {
                "category": str(category.id),
                "incident_date": "2026-07-22",
                "campus": "Main Campus",
                "department": "Engineering",
                "location_text": "Building A, Room 101",
                "description": "Admin submitted report",
            },
            format="json",
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        report_id = create_resp.data["id"]
        submit_resp = api_client.post(f"{REPORTS_URL}{report_id}/submit/")
        assert submit_resp.status_code == status.HTTP_200_OK
        assert submit_resp.data["status"] == "submitted"
        assert submit_resp.data["case_number"] is not None


# ── Audit Log Tests ───────────────────────────────────────────────


@pytest.mark.django_db
class TestAuditLog:
    def test_create_report_logs_audit_entry(self, api_client, reporter, category):
        authenticate(api_client, reporter)
        api_client.post(
            REPORTS_URL,
            {
                "category": str(category.id),
                "incident_date": "2026-07-22",
                "campus": "Main Campus",
                "department": "Engineering",
                "location_text": "Building A, Room 101",
                "description": "Audited report",
            },
            format="json",
        )
        assert AuditLog.objects.filter(action="CREATE", resource_type="report").count() == 1
        entry = AuditLog.objects.filter(action="CREATE", resource_type="report").first()
        assert entry.actor == reporter
        assert entry.actor_type == "REPORTER"

    def test_create_case_logs_audit_entry(self, api_client, admin_user, submitted_report):
        authenticate(api_client, admin_user)
        api_client.post(
            CASES_URL,
            {"report": str(submitted_report.id)},
            format="json",
        )
        assert AuditLog.objects.filter(action="CREATE", resource_type="case").count() == 1

    def test_denied_access_logs_audit_entry(
        self, api_client, reporter, report_of_reporter
    ):
        authenticate(api_client, reporter)
        resp = api_client.patch(
            f"{REPORTS_URL}{report_of_reporter.id}/",
            {"status": "resolved"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        denied = AuditLog.objects.filter(action="ACCESS_DENIED")
        assert denied.count() >= 1
        entry = denied.first()
        assert entry.actor == reporter
        assert entry.resource_type == "report"
        assert entry.metadata.get("requested_action") == "update_draft"

    def test_reporter_list_reports_granted_logs(
        self, api_client, reporter, report_of_reporter
    ):
        authenticate(api_client, reporter)
        resp = api_client.get(REPORTS_URL)
        assert resp.status_code == status.HTTP_200_OK
        granted = AuditLog.objects.filter(
            action="ACCESS_GRANTED",
            resource_type="report",
            actor=reporter,
        )
        assert granted.exists()
        assert granted.first().metadata.get("requested_action") == "read_own"

    def test_every_access_attempt_logged(
        self, api_client, reporter, report_of_reporter
    ):
        authenticate(api_client, reporter)
        api_client.get(f"{REPORTS_URL}{report_of_reporter.id}/")
        api_client.get(REPORTS_URL)
        api_client.patch(
            f"{REPORTS_URL}{report_of_reporter.id}/",
            {"status": "resolved"},
            format="json",
        )
        total = AuditLog.objects.filter(actor=reporter).count()
        assert total >= 3


# ── Cross-Role Access Denial Tests ────────────────────────────────
@pytest.mark.django_db
class TestCrossRoleAccessDenial:
    def test_scenario_reporters_cannot_see_each_others_reports(
        self, api_client, reporter, reporter2, report_of_reporter
    ):
        authenticate(api_client, reporter2)
        resp = api_client.get(f"{REPORTS_URL}{report_of_reporter.id}/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND
        assert AuditLog.objects.filter(
            action="ACCESS_GRANTED", resource_type="report", actor=reporter2
        ).exists()

    def test_scenario_officer_cannot_see_other_officers_assigned_case(
        self, api_client, officer, officer2, case_assigned_to_officer
    ):
        authenticate(api_client, officer2)
        resp = api_client.get(f"{CASES_URL}{case_assigned_to_officer.id}/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_scenario_reporter_cannot_update_report_status(
        self, api_client, reporter, report_of_reporter
    ):
        authenticate(api_client, reporter)
        resp = api_client.patch(
            f"{REPORTS_URL}{report_of_reporter.id}/",
            {"status": "resolved"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        assert AuditLog.objects.filter(
            action="ACCESS_DENIED", actor=reporter
        ).exists()

    def test_scenario_reporter_cannot_delete_report(
        self, api_client, reporter, report_of_reporter
    ):
        authenticate(api_client, reporter)
        resp = api_client.delete(f"{REPORTS_URL}{report_of_reporter.id}/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_scenario_reporter_lists_own_reports_only(
        self, api_client, reporter, reporter2, report_of_reporter, submitted_report2
    ):
        authenticate(api_client, reporter)
        resp = api_client.get(REPORTS_URL)
        assert resp.status_code == status.HTTP_200_OK
        ids = [r["id"] for r in resp.data["results"]]
        assert str(report_of_reporter.id) in ids
        assert str(submitted_report2.id) not in ids

    def test_scenario_admin_override_sees_everything(
        self, api_client, admin_user, reporter2, report_of_reporter
    ):
        authenticate(api_client, admin_user)
        resp = api_client.get(f"{REPORTS_URL}{report_of_reporter.id}/")
        assert resp.status_code == status.HTTP_200_OK
        resp2 = api_client.get(REPORTS_URL)
        assert resp2.status_code == status.HTTP_200_OK
