import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import AnonymousReporter
from apps.cases.models import Case
from apps.core.models import AuditLog
from apps.reports.models import IncidentCategory, Report

User = get_user_model()

ANALYTICS_URL = "/api/v1/analytics/"


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
def category2():
    return IncidentCategory.objects.create(
        name="Sexual Harassment",
        description="Sexual harassment incident",
        default_priority="critical",
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
def officer():
    return User.objects.create_user(
        email="officer@test.com",
        full_name="Officer User",
        password="pass1234",
        role=User.Role.OFFICER,
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
def anon_reporter():
    return AnonymousReporter.objects.create(
        reporter_code="ANON01",
        hashed_password="mock",
    )


def authenticate(api_client, user):
    api_client.force_authenticate(user=user)


@pytest.mark.django_db
class TestAnalyticsSummary:
    def test_summary_requires_admin(self, api_client, reporter, officer):
        authenticate(api_client, reporter)
        resp = api_client.get(f"{ANALYTICS_URL}summary/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

        authenticate(api_client, officer)
        resp = api_client.get(f"{ANALYTICS_URL}summary/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_summary_unauthenticated(self, api_client):
        resp = api_client.get(f"{ANALYTICS_URL}summary/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_summary_empty(self, api_client, admin_user):
        authenticate(api_client, admin_user)
        resp = api_client.get(f"{ANALYTICS_URL}summary/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["total_reports"] == 0
        assert resp.data["by_status"] == {}
        assert resp.data["by_category"] == []
        assert resp.data["by_priority"] == {}
        assert resp.data["anonymous_reports"] == 0
        assert resp.data["identified_reports"] == 0
        assert resp.data["avg_resolution_time_seconds"] is None

    def test_summary_with_data(self, api_client, admin_user, category, category2, reporter, anon_reporter):
        Report.objects.create(
            reporter=reporter,
            category=category,
            incident_date="2026-07-22",
            campus="Main Campus",
            department="Engineering",
            location_text="Building A",
            description="Report 1",
            status=Report.Status.SUBMITTED,
            priority=Report.Priority.HIGH,
        )
        Report.objects.create(
            reporter=reporter,
            category=category,
            incident_date="2026-07-23",
            campus="Main Campus",
            department="Engineering",
            location_text="Building B",
            description="Report 2",
            status=Report.Status.DRAFT,
            priority=Report.Priority.LOW,
        )
        Report.objects.create(
            anonymous_reporter=anon_reporter,
            category=category2,
            incident_date="2026-07-24",
            campus="Satellite Campus",
            department="Science",
            location_text="Lab 3",
            description="Report 3",
            status=Report.Status.SUBMITTED,
            priority=Report.Priority.CRITICAL,
        )

        authenticate(api_client, admin_user)
        resp = api_client.get(f"{ANALYTICS_URL}summary/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["total_reports"] == 3
        assert resp.data["by_status"]["submitted"] == 2
        assert resp.data["by_status"]["draft"] == 1
        assert len(resp.data["by_category"]) == 2
        assert resp.data["anonymous_reports"] == 1
        assert resp.data["identified_reports"] == 2
        assert resp.data["avg_resolution_time_seconds"] is None

    def test_summary_queries(self, api_client, admin_user, category, reporter, django_assert_num_queries):
        Report.objects.create(
            reporter=reporter,
            category=category,
            incident_date="2026-07-22",
            campus="Main Campus",
            department="Engineering",
            location_text="Building A",
            description="Test report",
            status=Report.Status.SUBMITTED,
        )
        authenticate(api_client, admin_user)
        with django_assert_num_queries(6):
            resp = api_client.get(f"{ANALYTICS_URL}summary/")
        assert resp.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestAnalyticsByDepartment:
    def test_by_department(self, api_client, admin_user, category, reporter):
        Report.objects.create(
            reporter=reporter,
            category=category,
            incident_date="2026-07-22",
            campus="Main Campus",
            department="Engineering",
            location_text="Building A",
            description="Test",
            status=Report.Status.SUBMITTED,
        )
        Report.objects.create(
            reporter=reporter,
            category=category,
            incident_date="2026-07-23",
            campus="Main Campus",
            department="Engineering",
            location_text="Building B",
            description="Test 2",
            status=Report.Status.SUBMITTED,
        )
        Report.objects.create(
            reporter=reporter,
            category=category,
            incident_date="2026-07-24",
            campus="Main Campus",
            department="Science",
            location_text="Lab",
            description="Test 3",
            status=Report.Status.SUBMITTED,
        )

        authenticate(api_client, admin_user)
        resp = api_client.get(f"{ANALYTICS_URL}by-department/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 2
        eng = [d for d in resp.data if d["department"] == "Engineering"][0]
        sci = [d for d in resp.data if d["department"] == "Science"][0]
        assert eng["count"] == 2
        assert sci["count"] == 1

    def test_by_department_empty(self, api_client, admin_user):
        authenticate(api_client, admin_user)
        resp = api_client.get(f"{ANALYTICS_URL}by-department/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data == []

    def test_by_department_requires_admin(self, api_client, reporter):
        authenticate(api_client, reporter)
        resp = api_client.get(f"{ANALYTICS_URL}by-department/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAnalyticsByMonth:
    def test_by_month_empty(self, api_client, admin_user):
        authenticate(api_client, admin_user)
        resp = api_client.get(f"{ANALYTICS_URL}by-month/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data == []

    def test_by_month_with_data(self, api_client, admin_user, category, reporter):
        Report.objects.create(
            reporter=reporter,
            category=category,
            incident_date="2026-07-22",
            campus="Main",
            department="Eng",
            location_text="A",
            description="Test",
            status=Report.Status.SUBMITTED,
            created_at=timezone.now() - timezone.timedelta(days=10),
        )
        authenticate(api_client, admin_user)
        resp = api_client.get(f"{ANALYTICS_URL}by-month/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) >= 1
        assert resp.data[0]["count"] >= 1

    def test_by_month_requires_admin(self, api_client, officer):
        authenticate(api_client, officer)
        resp = api_client.get(f"{ANALYTICS_URL}by-month/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAnalyticsAuditLogs:
    def test_audit_logs_empty(self, api_client, admin_user):
        authenticate(api_client, admin_user)
        resp = api_client.get(f"{ANALYTICS_URL}audit-logs/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 0

    def test_audit_logs_pagination(self, api_client, admin_user):
        for i in range(25):
            AuditLog.objects.create(
                action=f"TEST_{i}",
                resource_type="test",
                actor_type="admin",
                actor_identifier="admin@test.com",
            )
        authenticate(api_client, admin_user)
        resp = api_client.get(f"{ANALYTICS_URL}audit-logs/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 25
        assert len(resp.data["results"]) == 20

    def test_audit_logs_filters(self, api_client, admin_user):
        AuditLog.objects.create(
            action="CREATE",
            resource_type="report",
            actor_type="admin",
            actor_identifier="admin@test.com",
        )
        AuditLog.objects.create(
            action="UPDATE",
            resource_type="case",
            actor_type="officer",
            actor_identifier="officer@test.com",
        )
        authenticate(api_client, admin_user)

        resp = api_client.get(f"{ANALYTICS_URL}audit-logs/?action=CREATE")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

        resp = api_client.get(f"{ANALYTICS_URL}audit-logs/?resource_type=case")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

        resp = api_client.get(f"{ANALYTICS_URL}audit-logs/?actor_type=admin")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

    def test_audit_logs_date_filter(self, api_client, admin_user):
        AuditLog.objects.create(
            action="CREATE",
            resource_type="report",
            actor_type="admin",
            actor_identifier="admin@test.com",
        )
        authenticate(api_client, admin_user)
        resp = api_client.get(
            f"{ANALYTICS_URL}audit-logs/",
            {"date_from": "2020-01-01", "date_to": "2020-12-31"},
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 0

    def test_audit_logs_requires_admin(self, api_client, reporter):
        authenticate(api_client, reporter)
        resp = api_client.get(f"{ANALYTICS_URL}audit-logs/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN
