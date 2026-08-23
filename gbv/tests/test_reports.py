import io
import tempfile

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import AnonymousReporter
from apps.reports.models import Campus, Department, Evidence, IncidentCategory, Report

User = get_user_model()

REPORTS_URL = "/api/v1/reports/"


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def category():
    return IncidentCategory.objects.create(
        name="Sexual Harassment",
        description="Sexual harassment incident",
        default_priority="high",
    )


@pytest.fixture
def category_low():
    return IncidentCategory.objects.create(
        name="Verbal Abuse",
        description="Verbal abuse incident",
        default_priority="low",
    )


@pytest.fixture
def campus():
    return Campus.objects.create(name="Main Campus", code="MAIN")


@pytest.fixture
def department(campus):
    return Department.objects.create(campus=campus, name="Engineering", code="ENG")


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
        reporter_code="TEST99",
        hashed_password="mockhash",
    )


@pytest.fixture
def report_payload(category, campus, department):
    return {
        "category": str(category.id),
        "incident_date": "2026-07-22",
        "campus_option": str(campus.id),
        "department_option": str(department.id),
        "location_text": "Building A, Room 101",
        "description": "A test incident report",
    }


def authenticate(api_client, user):
    api_client.force_authenticate(user=user)


def authenticate_anonymous(api_client, anon_reporter):
    api_client.force_authenticate(
        user=AnonymousUser(),
        token={"actor_type": "anonymous_reporter", "reporter_code": anon_reporter.reporter_code},
    )


# ── Model Constraints ──────────────────────────────────────────────


@pytest.mark.django_db
class TestReportModelConstraints:
    def test_exactly_one_reporter_required(self, category):
        with pytest.raises(Exception):
            Report.objects.create(
                category=category,
                incident_date="2026-07-22",
                campus="Main Campus",
                department="Engineering",
                location_text="Location",
                description="Test",
            )

    def test_exactly_one_reporter_valid_with_user(self, category, reporter):
        report = Report.objects.create(
            category=category,
            incident_date="2026-07-22",
            campus="Main Campus",
            department="Engineering",
            location_text="Location",
            description="Test",
            reporter=reporter,
        )
        assert report.reporter == reporter
        assert report.anonymous_reporter is None

    def test_exactly_one_reporter_valid_with_anonymous(self, category, anon_reporter):
        report = Report.objects.create(
            category=category,
            incident_date="2026-07-22",
            campus="Main Campus",
            department="Engineering",
            location_text="Location",
            description="Test",
            anonymous_reporter=anon_reporter,
        )
        assert report.anonymous_reporter == anon_reporter
        assert report.reporter is None

    def test_default_status_is_draft(self, category, reporter):
        report = Report.objects.create(
            category=category,
            incident_date="2026-07-22",
            campus="Main Campus",
            department="Engineering",
            location_text="Location",
            description="Test",
            reporter=reporter,
        )
        assert report.status == Report.Status.DRAFT

    def test_case_number_null_for_draft(self, category, reporter):
        report = Report.objects.create(
            category=category,
            incident_date="2026-07-22",
            campus="Main Campus",
            department="Engineering",
            location_text="Location",
            description="Test",
            reporter=reporter,
        )
        assert report.case_number is None


# ── Draft Creation ─────────────────────────────────────────────────


@pytest.mark.django_db
class TestDraftCreation:
    def test_create_draft_success(self, api_client, reporter, report_payload):
        authenticate(api_client, reporter)
        resp = api_client.post(REPORTS_URL, report_payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["status"] == "draft"
        assert resp.data["case_number"] is None

    def test_create_draft_missing_required_fields(self, api_client, reporter):
        authenticate(api_client, reporter)
        resp = api_client.post(REPORTS_URL, {}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_draft_sets_reporter(self, api_client, reporter, report_payload):
        authenticate(api_client, reporter)
        resp = api_client.post(REPORTS_URL, report_payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["reporter_info"]["id"] == str(reporter.id)

    def test_create_draft_anonymous(self, api_client, anon_reporter, report_payload):
        authenticate_anonymous(api_client, anon_reporter)
        resp = api_client.post(REPORTS_URL, report_payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["status"] == "draft"
        assert resp.data["reporter_info"]["reporter_code"] == "TEST99"

    def test_create_draft_with_all_optional_fields(
        self, api_client, reporter, category, campus, department
    ):
        authenticate(api_client, reporter)
        payload = {
            "category": str(category.id),
            "incident_date": "2026-07-22",
            "campus_option": str(campus.id),
            "department_option": str(department.id),
            "location_text": "Building A, Room 101",
            "description": "Full report",
            "victim_is_reporter": True,
            "victim_gender": "female",
            "victim_details": {"age": 25},
            "offender_known": True,
            "offender_details": {"name": "John Doe", "relationship": "colleague"},
            "suspect_type": "staff",
            "suspect_campus": str(campus.id),
            "suspect_department": str(department.id),
            "suspect_details": {"name": "John Doe", "identifier": "STF-24"},
            "witnesses": [{"name": "Jane Witness"}],
            "needs_immediate_help": False,
            "consent_to_contact": True,
            "priority": "high",
        }
        resp = api_client.post(REPORTS_URL, payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["victim_is_reporter"] is True
        assert resp.data["victim_gender"] == "female"
        assert resp.data["offender_known"] is True
        assert resp.data["suspect_type"] == "staff"
        assert resp.data["priority"] == "high"

    def test_create_draft_rejects_department_from_another_campus(
        self, api_client, reporter, category, campus, department
    ):
        other_campus = Campus.objects.create(name="North Campus", code="NORTH")
        other_department = Department.objects.create(campus=other_campus, name="Health Sciences", code="HEALTH")
        authenticate(api_client, reporter)
        resp = api_client.post(
            REPORTS_URL,
            {
                "category": str(category.id),
                "incident_date": "2026-07-22",
                "campus_option": str(campus.id),
                "department_option": str(other_department.id),
                "location_text": "Building A, Room 101",
                "description": "The selected department belongs to a different campus.",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "department_option" in resp.data


@pytest.mark.django_db
class TestConfiguredLocationOptions:
    def test_reporter_reads_only_active_location_options(self, api_client, reporter, campus, department):
        Campus.objects.create(name="Inactive Campus", code="OLD", is_active=False)
        Department.objects.create(campus=campus, name="Inactive Department", code="OLD-ENG", is_active=False)
        authenticate(api_client, reporter)

        campuses = api_client.get("/api/v1/locations/campuses/")
        departments = api_client.get(f"/api/v1/locations/departments/?campus={campus.id}")

        assert campuses.status_code == status.HTTP_200_OK
        assert [item["id"] for item in campuses.data] == [str(campus.id)]
        assert departments.status_code == status.HTTP_200_OK
        assert [item["id"] for item in departments.data] == [str(department.id)]


# ── Edit Lock ──────────────────────────────────────────────────────


@pytest.mark.django_db
class TestEditLock:
    def test_update_draft_success(self, api_client, reporter, category, campus, department):
        authenticate(api_client, reporter)
        create_resp = api_client.post(
            REPORTS_URL,
            {
                "category": str(category.id),
                "incident_date": "2026-07-22",
                "campus_option": str(campus.id),
                "department_option": str(department.id),
                "location_text": "Building A, Room 101",
                "description": "Original description",
            },
            format="json",
        )
        report_id = create_resp.data["id"]
        update_resp = api_client.patch(
            f"{REPORTS_URL}{report_id}/",
            {"description": "Updated description"},
            format="json",
        )
        assert update_resp.status_code == status.HTTP_200_OK
        assert update_resp.data["description"] == "Updated description"

    def test_cannot_update_submitted_report(
        self, api_client, reporter, category, campus, department
    ):
        authenticate(api_client, reporter)
        create_resp = api_client.post(
            REPORTS_URL,
            {
                "category": str(category.id),
                "incident_date": "2026-07-22",
                "campus_option": str(campus.id),
                "department_option": str(department.id),
                "location_text": "Building A, Room 101",
                "description": "Test report",
            },
            format="json",
        )
        report_id = create_resp.data["id"]
        api_client.post(f"{REPORTS_URL}{report_id}/submit/")
        update_resp = api_client.patch(
            f"{REPORTS_URL}{report_id}/",
            {"description": "Should fail"},
            format="json",
        )
        assert update_resp.status_code == status.HTTP_403_FORBIDDEN


# ── Submit ─────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestSubmit:
    def test_submit_draft_generates_case_number(
        self, api_client, reporter, report_payload
    ):
        authenticate(api_client, reporter)
        create_resp = api_client.post(REPORTS_URL, report_payload, format="json")
        report_id = create_resp.data["id"]
        resp = api_client.post(f"{REPORTS_URL}{report_id}/submit/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "submitted"
        assert resp.data["case_number"] is not None
        assert resp.data["case_number"].startswith("GBV-")

    def test_submit_twice_is_idempotent(
        self, api_client, reporter, report_payload
    ):
        authenticate(api_client, reporter)
        create_resp = api_client.post(REPORTS_URL, report_payload, format="json")
        report_id = create_resp.data["id"]
        first = api_client.post(f"{REPORTS_URL}{report_id}/submit/")
        resp = api_client.post(f"{REPORTS_URL}{report_id}/submit/")
        assert first.status_code == status.HTTP_200_OK
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "submitted"
        assert resp.data["case_number"] == first.data["case_number"]

    def test_submit_auto_suggests_priority(
        self, api_client, reporter, category, campus, department
    ):
        authenticate(api_client, reporter)
        create_resp = api_client.post(
            REPORTS_URL,
            {
                "category": str(category.id),
                "incident_date": "2026-07-22",
                "campus_option": str(campus.id),
                "department_option": str(department.id),
                "location_text": "Building A, Room 101",
                "description": "Priority test",
            },
            format="json",
        )
        report_id = create_resp.data["id"]
        resp = api_client.post(f"{REPORTS_URL}{report_id}/submit/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["priority"] == category.default_priority

    def test_submit_preserves_explicit_priority(
        self, api_client, reporter, category_low, campus, department
    ):
        authenticate(api_client, reporter)
        create_resp = api_client.post(
            REPORTS_URL,
            {
                "category": str(category_low.id),
                "incident_date": "2026-07-22",
                "campus_option": str(campus.id),
                "department_option": str(department.id),
                "location_text": "Building A, Room 101",
                "description": "Explicit priority test",
                "priority": "critical",
            },
            format="json",
        )
        report_id = create_resp.data["id"]
        resp = api_client.post(f"{REPORTS_URL}{report_id}/submit/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["priority"] == "critical"

    def test_submit_case_number_unique(
        self, api_client, reporter, report_payload
    ):
        authenticate(api_client, reporter)
        r1 = api_client.post(REPORTS_URL, report_payload, format="json")
        r2 = api_client.post(
            REPORTS_URL, {**report_payload, "description": "Second report"}, format="json"
        )
        s1 = api_client.post(f"{REPORTS_URL}{r1.data['id']}/submit/")
        s2 = api_client.post(f"{REPORTS_URL}{r2.data['id']}/submit/")
        assert s1.data["case_number"] != s2.data["case_number"]


# ── Evidence Upload ────────────────────────────────────────────────


@pytest.mark.django_db
class TestEvidenceUpload:
    def test_upload_image_success(self, api_client, reporter, report_payload):
        authenticate(api_client, reporter)
        create_resp = api_client.post(REPORTS_URL, report_payload, format="json")
        report_id = create_resp.data["id"]
        file_data = io.BytesIO(b"fake-image-data")
        file_data.name = "screenshot.png"
        file_data.content_type = "image/png"
        resp = api_client.post(
            f"{REPORTS_URL}{report_id}/evidence/",
            {"file": file_data},
            format="multipart",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["file_type"] == "image"
        assert str(resp.data["report"]) == report_id

    def test_upload_pdf_success(self, api_client, reporter, report_payload):
        authenticate(api_client, reporter)
        create_resp = api_client.post(REPORTS_URL, report_payload, format="json")
        report_id = create_resp.data["id"]
        file_data = io.BytesIO(b"%PDF-1.4 fake pdf content")
        file_data.name = "document.pdf"
        file_data.content_type = "application/pdf"
        resp = api_client.post(
            f"{REPORTS_URL}{report_id}/evidence/",
            {"file": file_data},
            format="multipart",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["file_type"] == "pdf"

    def test_upload_no_file_returns_400(self, api_client, reporter, report_payload):
        authenticate(api_client, reporter)
        create_resp = api_client.post(REPORTS_URL, report_payload, format="json")
        report_id = create_resp.data["id"]
        resp = api_client.post(
            f"{REPORTS_URL}{report_id}/evidence/",
            {},
            format="multipart",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_upload_invalid_file_type_returns_400(
        self, api_client, reporter, report_payload
    ):
        authenticate(api_client, reporter)
        create_resp = api_client.post(REPORTS_URL, report_payload, format="json")
        report_id = create_resp.data["id"]
        file_data = io.BytesIO(b"<html></html>")
        file_data.name = "page.html"
        file_data.content_type = "text/html"
        resp = api_client.post(
            f"{REPORTS_URL}{report_id}/evidence/",
            {"file": file_data},
            format="multipart",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "not allowed" in resp.data["error"]

    def test_evidence_appears_in_report_detail(
        self, api_client, reporter, report_payload
    ):
        authenticate(api_client, reporter)
        create_resp = api_client.post(REPORTS_URL, report_payload, format="json")
        report_id = create_resp.data["id"]
        file_data = io.BytesIO(b"fake-image-data")
        file_data.name = "screenshot.png"
        file_data.content_type = "image/png"
        api_client.post(
            f"{REPORTS_URL}{report_id}/evidence/",
            {"file": file_data},
            format="multipart",
        )
        detail_resp = api_client.get(f"{REPORTS_URL}{report_id}/")
        assert len(detail_resp.data["evidence"]) == 1
        assert detail_resp.data["evidence"][0]["file_type"] == "image"


@pytest.mark.django_db
class TestEvidenceDownload:
    def test_report_owner_can_download_evidence(self, api_client, reporter, report_payload):
        authenticate(api_client, reporter)
        create_resp = api_client.post(REPORTS_URL, report_payload, format="json")
        report_id = create_resp.data["id"]
        upload_resp = api_client.post(
            f"{REPORTS_URL}{report_id}/evidence/",
            {"file": SimpleUploadedFile("statement.pdf", b"evidence-bytes", content_type="application/pdf")},
            format="multipart",
        )

        download_resp = api_client.get(
            f"{REPORTS_URL}{report_id}/evidence/{upload_resp.data['id']}/download/"
        )

        assert download_resp.status_code == status.HTTP_200_OK
        assert "attachment" in download_resp["Content-Disposition"]
        assert b"".join(download_resp.streaming_content) == b"evidence-bytes"

    def test_other_reporter_cannot_download_evidence(self, api_client, reporter, category):
        report = Report.objects.create(
            reporter=reporter,
            category=category,
            incident_date="2026-07-22",
            campus="Main Campus",
            department="Engineering",
            location_text="Building A, Room 101",
            description="A test incident report",
        )
        evidence = Evidence.objects.create(
            report=report,
            file=SimpleUploadedFile("statement.pdf", b"private-bytes", content_type="application/pdf"),
            file_type="pdf",
        )
        other_reporter = User.objects.create_user(
            email="other-reporter@test.com",
            full_name="Other Reporter",
            password="pass1234",
            role=User.Role.REPORTER,
        )
        authenticate(api_client, other_reporter)

        download_resp = api_client.get(
            f"{REPORTS_URL}{report.id}/evidence/{evidence.id}/download/"
        )

        assert download_resp.status_code == status.HTTP_404_NOT_FOUND


# ── Anonymous Reporter Flow ────────────────────────────────────────


@pytest.mark.django_db
class TestAnonymousReporterFlow:
    def test_anon_creates_and_reads_draft(self, api_client, anon_reporter, report_payload):
        authenticate_anonymous(api_client, anon_reporter)
        create_resp = api_client.post(REPORTS_URL, report_payload, format="json")
        assert create_resp.status_code == status.HTTP_201_CREATED
        report_id = create_resp.data["id"]
        read_resp = api_client.get(f"{REPORTS_URL}{report_id}/")
        assert read_resp.status_code == status.HTTP_200_OK

    def test_anon_submits_report(self, api_client, anon_reporter, report_payload):
        authenticate_anonymous(api_client, anon_reporter)
        create_resp = api_client.post(REPORTS_URL, report_payload, format="json")
        report_id = create_resp.data["id"]
        submit_resp = api_client.post(f"{REPORTS_URL}{report_id}/submit/")
        assert submit_resp.status_code == status.HTTP_200_OK
        assert submit_resp.data["status"] == "submitted"

    def test_anon_cannot_read_other_anon_report(
        self, api_client, anon_reporter, report_payload
    ):
        anon2 = AnonymousReporter.objects.create(
            reporter_code="ANON42", hashed_password="mockhash2"
        )
        authenticate_anonymous(api_client, anon_reporter)
        create_resp = api_client.post(REPORTS_URL, report_payload, format="json")
        report_id = create_resp.data["id"]
        authenticate_anonymous(api_client, anon2)
        read_resp = api_client.get(f"{REPORTS_URL}{report_id}/")
        assert read_resp.status_code == status.HTTP_404_NOT_FOUND

    def test_anon_upload_evidence(self, api_client, anon_reporter, report_payload):
        authenticate_anonymous(api_client, anon_reporter)
        create_resp = api_client.post(REPORTS_URL, report_payload, format="json")
        report_id = create_resp.data["id"]
        file_data = io.BytesIO(b"fake-pdf-data")
        file_data.name = "doc.pdf"
        file_data.content_type = "application/pdf"
        resp = api_client.post(
            f"{REPORTS_URL}{report_id}/evidence/",
            {"file": file_data},
            format="multipart",
        )
        assert resp.status_code == status.HTTP_201_CREATED

    def test_anon_lists_only_own_reports(self, api_client, anon_reporter, report_payload):
        authenticate_anonymous(api_client, anon_reporter)
        create_resp = api_client.post(REPORTS_URL, report_payload, format="json")
        report_id = create_resp.data["id"]
        list_resp = api_client.get(REPORTS_URL)
        assert list_resp.status_code == status.HTTP_200_OK
        ids = [r["id"] for r in list_resp.data["results"]]
        assert report_id in ids

    def test_anon_list_is_scoped_to_reporter_code(
        self, api_client, anon_reporter, report_payload
    ):
        other = AnonymousReporter.objects.create(
            reporter_code="ANON99", hashed_password="mockhash3"
        )
        authenticate_anonymous(api_client, anon_reporter)
        create_resp = api_client.post(REPORTS_URL, report_payload, format="json")
        anon_report_id = create_resp.data["id"]
        authenticate_anonymous(api_client, other)
        other_resp = api_client.post(REPORTS_URL, report_payload, format="json")
        other_report_id = other_resp.data["id"]
        authenticate_anonymous(api_client, anon_reporter)
        list_resp = api_client.get(REPORTS_URL)
        assert list_resp.status_code == status.HTTP_200_OK
        ids = [r["id"] for r in list_resp.data["results"]]
        assert anon_report_id in ids
        assert other_report_id not in ids


# ── RBAC for New Actions ────────────────────────────────────────────


@pytest.mark.django_db
class TestNewActionRBAC:
    def test_reporter_can_submit_own_report(
        self, api_client, reporter, report_payload
    ):
        authenticate(api_client, reporter)
        create_resp = api_client.post(REPORTS_URL, report_payload, format="json")
        submit_resp = api_client.post(f"{REPORTS_URL}{create_resp.data['id']}/submit/")
        assert submit_resp.status_code == status.HTTP_200_OK

    def test_officer_cannot_submit_report(
        self, api_client, category
    ):
        officer = User.objects.create_user(
            email="officer@test.com",
            full_name="Officer",
            password="pass1234",
            role=User.Role.OFFICER,
        )
        authenticate(api_client, officer)
        resp = api_client.post(f"{REPORTS_URL}some-id/submit/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_cannot_create(
        self, api_client, report_payload
    ):
        resp = api_client.post(REPORTS_URL, report_payload, format="json")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ── Evidence Model ─────────────────────────────────────────────────


@pytest.mark.django_db
class TestEvidenceModel:
    def test_evidence_str(self, category, reporter):
        report = Report.objects.create(
            category=category,
            incident_date="2026-07-22",
            campus="Main Campus",
            department="Engineering",
            location_text="Location",
            description="Test",
            reporter=reporter,
        )
        ev = Evidence.objects.create(
            report=report,
            file="evidence/test.png",
            file_type="image",
        )
        assert str(ev) == f"Evidence {ev.id} for Report {report.id}"
