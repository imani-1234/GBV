"""Regression tests for the list-vs-retrieve permission contract.

List endpoints are gated at the action level (list -> read_own) while row
scoping happens in get_queryset(); detail (retrieve) additionally runs
object-level permission. These tests pin the correct matrix: every actor can
LIST, and row-scoping is enforced inside the returned results.
"""

import pytest
from django.contrib.auth.models import Group
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.cases.models import Case
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
def report_of_reporter2(reporter2, category):
    return Report.objects.create(
        category=category,
        incident_date="2026-07-22",
        campus="Main Campus",
        department="Engineering",
        location_text="Building B, Room 202",
        description="Another reporter's report",
        reporter=reporter2,
        status=Report.Status.SUBMITTED,
    )


@pytest.fixture
def case_of_reporter(reporter, report_of_reporter):
    return Case.objects.create(
        report=report_of_reporter,
        status=Case.Status.PENDING_REVIEW,
    )


@pytest.fixture
def case_assigned_to_officer(reporter, officer, report_of_reporter):
    return Case.objects.create(
        report=report_of_reporter,
        assigned_officer=officer,
        status=Case.Status.ASSIGNED,
    )


def authenticate(api_client, user):
    api_client.force_authenticate(user=user)


def ids_of(payload):
    return [item["id"] for item in payload["results"]]


@pytest.mark.django_db
class TestReportListRetrieveRegression:
    def test_reporter_can_list_and_rows_are_scoped_to_self(
        self, api_client, reporter, report_of_reporter, report_of_reporter2
    ):
        authenticate(api_client, reporter)
        resp = api_client.get(REPORTS_URL)
        assert resp.status_code == status.HTTP_200_OK
        ids = ids_of(resp.data)
        assert str(report_of_reporter.id) in ids
        assert str(report_of_reporter2.id) not in ids

    def test_reporter_can_retrieve_own_report(
        self, api_client, reporter, report_of_reporter
    ):
        authenticate(api_client, reporter)
        resp = api_client.get(f"{REPORTS_URL}{report_of_reporter.id}/")
        assert resp.status_code == status.HTTP_200_OK

    def test_officer_can_list_reports(
        self, api_client, officer, report_of_reporter
    ):
        authenticate(api_client, officer)
        resp = api_client.get(REPORTS_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert str(report_of_reporter.id) in ids_of(resp.data)

    def test_officer_can_retrieve_report(
        self, api_client, officer, report_of_reporter
    ):
        authenticate(api_client, officer)
        resp = api_client.get(f"{REPORTS_URL}{report_of_reporter.id}/")
        assert resp.status_code == status.HTTP_200_OK

    def test_admin_can_list_all_reports(
        self, api_client, admin_user, report_of_reporter, report_of_reporter2
    ):
        authenticate(api_client, admin_user)
        resp = api_client.get(REPORTS_URL)
        assert resp.status_code == status.HTTP_200_OK
        ids = ids_of(resp.data)
        assert str(report_of_reporter.id) in ids
        assert str(report_of_reporter2.id) in ids

    def test_admin_can_retrieve_any_report(
        self, api_client, admin_user, report_of_reporter
    ):
        authenticate(api_client, admin_user)
        resp = api_client.get(f"{REPORTS_URL}{report_of_reporter.id}/")
        assert resp.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestCaseListRetrieveRegression:
    def test_reporter_can_list_cases_and_rows_are_scoped_to_self(
        self, api_client, reporter, reporter2, report_of_reporter,
        report_of_reporter2, case_of_reporter,
    ):
        other_case = Case.objects.create(
            report=report_of_reporter2,
            status=Case.Status.PENDING_REVIEW,
        )
        authenticate(api_client, reporter)
        resp = api_client.get(CASES_URL)
        assert resp.status_code == status.HTTP_200_OK
        ids = ids_of(resp.data)
        assert str(case_of_reporter.id) in ids
        assert str(other_case.id) not in ids

    def test_reporter_can_retrieve_own_case(
        self, api_client, reporter, case_of_reporter
    ):
        authenticate(api_client, reporter)
        resp = api_client.get(f"{CASES_URL}{case_of_reporter.id}/")
        assert resp.status_code == status.HTTP_200_OK

    def test_officer_can_list_cases(
        self, api_client, officer, case_assigned_to_officer
    ):
        authenticate(api_client, officer)
        resp = api_client.get(CASES_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert str(case_assigned_to_officer.id) in ids_of(resp.data)

    def test_officer_can_retrieve_case(
        self, api_client, officer, case_assigned_to_officer
    ):
        authenticate(api_client, officer)
        resp = api_client.get(f"{CASES_URL}{case_assigned_to_officer.id}/")
        assert resp.status_code == status.HTTP_200_OK

    def test_admin_can_list_cases(
        self, api_client, admin_user, case_of_reporter
    ):
        authenticate(api_client, admin_user)
        resp = api_client.get(CASES_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert str(case_of_reporter.id) in ids_of(resp.data)

    def test_admin_can_retrieve_any_case(
        self, api_client, admin_user, case_of_reporter
    ):
        authenticate(api_client, admin_user)
        resp = api_client.get(f"{CASES_URL}{case_of_reporter.id}/")
        assert resp.status_code == status.HTTP_200_OK
