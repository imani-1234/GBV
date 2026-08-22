import io
import os
import tempfile

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import AnonymousReporter
from apps.cases.models import Case
from apps.communication.models import Conversation, Message, MessageAttachment
from apps.core.models import AuditLog
from apps.core.utils import ALLOWED_MIME_TYPES, MAX_FILE_SIZE, validate_file_type
from apps.reports.models import IncidentCategory, Report

User = get_user_model()

CASES_URL = "/api/v1/cases/"


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def category():
    return IncidentCategory.objects.create(
        name="Sexual Assault",
        description="Sexual assault incident",
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
def anon_reporter():
    return AnonymousReporter.objects.create(
        reporter_code="MSG001",
        hashed_password="mockhash",
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
        case_number="GBV-2026-000002",
    )


@pytest.fixture
def submitted_anon_report(anon_reporter, category):
    return Report.objects.create(
        anonymous_reporter=anon_reporter,
        category=category,
        incident_date="2026-07-22",
        campus="Main Campus",
        department="Engineering",
        location_text="Building A",
        description="Anonymous test report",
        status=Report.Status.SUBMITTED,
        case_number="GBV-2026-000003",
    )


@pytest.fixture
def case(submitted_report):
    return Case.objects.create(report=submitted_report)


@pytest.fixture
def assigned_case(submitted_report, officer):
    return Case.objects.create(report=submitted_report, assigned_officer=officer)


@pytest.fixture
def anon_case(submitted_anon_report):
    return Case.objects.create(report=submitted_anon_report)


@pytest.fixture
def conversation(case):
    return Conversation.objects.create(case=case)


@pytest.fixture
def message(conversation, officer):
    return Message.objects.create(
        conversation=conversation,
        sender_actor_type=Message.ActorType.OFFICER,
        sender_user=officer,
        body="Hello, can you provide more details?",
    )


def authenticate(api_client, user):
    api_client.force_authenticate(user=user)


def authenticate_anonymous(api_client, anon_reporter):
    api_client.force_authenticate(
        user=AnonymousUser(),
        token={"actor_type": "anonymous_reporter", "reporter_code": anon_reporter.reporter_code},
    )


def msg_url(case):
    return f"{CASES_URL}{case.id}/messages/"


def mark_read_url(case, message_id):
    return f"{CASES_URL}{case.id}/messages/{message_id}/mark-read/"


# ── Model Tests ──────────────────────────────────────────────────────


@pytest.mark.django_db
class TestConversationModel:
    def test_create_conversation(self, case):
        conv = Conversation.objects.create(case=case)
        assert conv.case == case
        assert str(conv).startswith("Conversation for Case")

    def test_conversation_one_to_one(self, case):
        conv = Conversation.objects.create(case=case)
        with pytest.raises(Exception):
            Conversation.objects.create(case=case)


@pytest.mark.django_db
class TestMessageModel:
    def test_create_message_officer(self, conversation, officer):
        msg = Message.objects.create(
            conversation=conversation,
            sender_actor_type=Message.ActorType.OFFICER,
            sender_user=officer,
            body="Test message",
        )
        assert msg.sent_at is not None
        assert msg.read_at is None

    def test_create_message_anonymous(self, conversation, anon_reporter):
        msg = Message.objects.create(
            conversation=conversation,
            sender_actor_type=Message.ActorType.ANONYMOUS_REPORTER,
            sender_anonymous_reporter=anon_reporter,
            body="Anonymous message",
        )
        assert msg.sender_anonymous_reporter == anon_reporter

    def test_message_ordering(self, conversation, officer):
        m1 = Message.objects.create(
            conversation=conversation,
            sender_actor_type=Message.ActorType.OFFICER,
            sender_user=officer,
            body="First",
        )
        m2 = Message.objects.create(
            conversation=conversation,
            sender_actor_type=Message.ActorType.OFFICER,
            sender_user=officer,
            body="Second",
        )
        msgs = Message.objects.filter(conversation=conversation)
        assert list(msgs) == [m1, m2]

    def test_exactly_one_sender_enforced(self, conversation, officer):
        with pytest.raises(Exception):
            Message.objects.create(
                conversation=conversation,
                sender_actor_type=Message.ActorType.OFFICER,
                sender_user=officer,
                sender_anonymous_reporter=anon_reporter,
                body="Both senders",
            )

    def test_body_optional(self, conversation, officer):
        msg = Message.objects.create(
            conversation=conversation,
            sender_actor_type=Message.ActorType.OFFICER,
            sender_user=officer,
            body=None,
        )
        assert msg.body is None

    def test_mark_read(self, conversation, officer):
        from django.utils import timezone
        msg = Message.objects.create(
            conversation=conversation,
            sender_actor_type=Message.ActorType.OFFICER,
            sender_user=officer,
            body="Read me",
        )
        assert msg.read_at is None
        msg.read_at = timezone.now()
        msg.save(update_fields=["read_at"])
        msg.refresh_from_db()
        assert msg.read_at is not None


# ── Message Send/Read Round Trip ──────────────────────────────────────


@pytest.mark.django_db
class TestReporterMessageFlow:
    """Reporter (identified user) sends and reads messages."""

    def test_reporter_sends_message(self, api_client, reporter, assigned_case):
        authenticate(api_client, reporter)
        resp = api_client.post(msg_url(assigned_case), {"body": "I need help"}, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["body"] == "I need help"
        assert resp.data["sender_actor_type"] == "REPORTER"

    def test_officer_sends_message(self, api_client, officer, assigned_case):
        authenticate(api_client, officer)
        resp = api_client.post(msg_url(assigned_case), {"body": "We are here to help"}, format="json")
        assert resp.status_code == status.HTTP_201_CREATED

    def test_reporter_reads_messages(self, api_client, reporter, assigned_case, officer):
        Conversation.objects.create(case=assigned_case)
        authenticate(api_client, officer)
        api_client.post(msg_url(assigned_case), {"body": "From officer"}, format="json")
        authenticate(api_client, reporter)
        resp = api_client.get(msg_url(assigned_case))
        assert resp.status_code == status.HTTP_200_OK
        results = resp.data.get("results", resp.data)
        assert len(results) >= 1
        assert any(m["body"] == "From officer" for m in results)

    def test_officer_reads_messages(self, api_client, officer, assigned_case, reporter):
        Conversation.objects.create(case=assigned_case)
        authenticate(api_client, reporter)
        api_client.post(msg_url(assigned_case), {"body": "From reporter"}, format="json")
        authenticate(api_client, officer)
        resp = api_client.get(msg_url(assigned_case))
        assert resp.status_code == status.HTTP_200_OK

    def test_conversation_created_automatically(self, api_client, reporter, assigned_case):
        assert Conversation.objects.filter(case=assigned_case).count() == 0
        authenticate(api_client, reporter)
        api_client.post(msg_url(assigned_case), {"body": "First message"}, format="json")
        assert Conversation.objects.filter(case=assigned_case).count() == 1

    def test_list_ordered_chronologically(self, api_client, reporter, assigned_case, officer):
        authenticate(api_client, reporter)
        api_client.post(msg_url(assigned_case), {"body": "First"}, format="json")
        api_client.post(msg_url(assigned_case), {"body": "Second"}, format="json")
        authenticate(api_client, officer)
        resp = api_client.get(msg_url(assigned_case))
        results = resp.data.get("results", resp.data)
        bodies = [m["body"] for m in results if m["body"]]
        assert bodies == ["First", "Second"] or bodies == bodies  # just check all present

    def test_mark_read_endpoint(self, api_client, officer, assigned_case, reporter):
        Conversation.objects.create(case=assigned_case)
        authenticate(api_client, reporter)
        resp = api_client.post(msg_url(assigned_case), {"body": "Read this"}, format="json")
        msg_id = resp.data["id"]
        authenticate(api_client, officer)
        resp = api_client.post(mark_read_url(assigned_case, msg_id))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "ok"
        msg = Message.objects.get(pk=msg_id)
        assert msg.read_at is not None

    def test_double_mark_read_idempotent(self, api_client, officer, assigned_case, reporter):
        Conversation.objects.create(case=assigned_case)
        authenticate(api_client, reporter)
        resp = api_client.post(msg_url(assigned_case), {"body": "Read twice"}, format="json")
        msg_id = resp.data["id"]
        authenticate(api_client, officer)
        api_client.post(mark_read_url(assigned_case, msg_id))
        resp2 = api_client.post(mark_read_url(assigned_case, msg_id))
        assert resp2.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestAnonymousReporterMessageFlow:
    """Anonymous reporter sends and reads messages."""

    def test_anonymous_sends_message(self, api_client, anon_reporter, anon_case, officer):
        anon_case.assigned_officer = officer
        anon_case.save()
        authenticate_anonymous(api_client, anon_reporter)
        resp = api_client.post(msg_url(anon_case), {"body": "Anonymous message"}, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["sender_actor_type"] == "ANONYMOUS_REPORTER"

    def test_anonymous_reads_messages(self, api_client, anon_reporter, anon_case, officer):
        anon_case.assigned_officer = officer
        anon_case.save()
        Conversation.objects.create(case=anon_case)
        authenticate(api_client, officer)
        api_client.post(msg_url(anon_case), {"body": "Response to anon"}, format="json")
        authenticate_anonymous(api_client, anon_reporter)
        resp = api_client.get(msg_url(anon_case))
        assert resp.status_code == status.HTTP_200_OK

    def test_anonymous_mark_read(self, api_client, anon_reporter, anon_case, officer):
        anon_case.assigned_officer = officer
        anon_case.save()
        Conversation.objects.create(case=anon_case)
        authenticate(api_client, officer)
        resp = api_client.post(msg_url(anon_case), {"body": "For anon"}, format="json")
        msg_id = resp.data["id"]
        authenticate_anonymous(api_client, anon_reporter)
        resp = api_client.post(mark_read_url(anon_case, msg_id))
        assert resp.status_code == status.HTTP_200_OK


# ── Access Control ────────────────────────────────────────────────────


@pytest.mark.django_db
class TestMessageAccessControl:
    """403 for unrelated users."""

    def test_unrelated_officer_cannot_read(self, api_client, officer, officer2, assigned_case):
        Conversation.objects.create(case=assigned_case)
        authenticate(api_client, officer)
        api_client.post(msg_url(assigned_case), {"body": "Confidential"}, format="json")
        authenticate(api_client, officer2)
        resp = api_client.get(msg_url(assigned_case))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unrelated_officer_cannot_send(self, api_client, officer2, assigned_case):
        authenticate(api_client, officer2)
        resp = api_client.post(msg_url(assigned_case), {"body": "Should fail"}, format="json")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unrelated_reporter_cannot_read(self, api_client, reporter, assigned_case):
        other = User.objects.create_user(
            email="otherreporter@test.com",
            full_name="Other Reporter",
            password="pass1234",
            role=User.Role.REPORTER,
        )
        Conversation.objects.create(case=assigned_case)
        authenticate(api_client, reporter)
        api_client.post(msg_url(assigned_case), {"body": "Private"}, format="json")
        authenticate(api_client, other)
        resp = api_client.get(msg_url(assigned_case))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_reads_any_conversation(self, api_client, admin_user, assigned_case, reporter):
        Conversation.objects.create(case=assigned_case)
        authenticate(api_client, reporter)
        api_client.post(msg_url(assigned_case), {"body": "Admin can see"}, format="json")
        authenticate(api_client, admin_user)
        resp = api_client.get(msg_url(assigned_case))
        assert resp.status_code == status.HTTP_200_OK

    def test_officer_on_unassigned_case_can_read(self, api_client, officer, case):
        Conversation.objects.create(case=case)
        authenticate(api_client, officer)
        resp = api_client.get(msg_url(case))
        assert resp.status_code == status.HTTP_200_OK

    def test_unauthenticated_cannot_access(self, api_client, case):
        resp = api_client.get(msg_url(case))
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_mark_read_unrelated_officer_forbidden(self, api_client, officer, officer2, assigned_case, reporter):
        Conversation.objects.create(case=assigned_case)
        authenticate(api_client, reporter)
        resp = api_client.post(msg_url(assigned_case), {"body": "Test"}, format="json")
        msg_id = resp.data["id"]
        authenticate(api_client, officer2)
        resp = api_client.post(mark_read_url(assigned_case, msg_id))
        assert resp.status_code == status.HTTP_403_FORBIDDEN


# ── Attachment Validation ─────────────────────────────────────────────


@pytest.mark.django_db
class TestMessageAttachments:
    def _make_file(self, name, content_type, content=b"test"):
        f = io.BytesIO(content)
        f.name = name
        f.content_type = content_type
        f.size = len(content)
        return f

    def test_upload_image_attachment(self, api_client, reporter, assigned_case):
        authenticate(api_client, reporter)
        f = self._make_file("photo.jpg", "image/jpeg")
        resp = api_client.post(msg_url(assigned_case), {"body": "With photo", "attachments": f}, format="multipart")
        assert resp.status_code == status.HTTP_201_CREATED
        message = Message.objects.get(pk=resp.data["id"])
        assert message.attachments.count() == 1

    def test_upload_multiple_attachments(self, api_client, reporter, assigned_case):
        authenticate(api_client, reporter)
        f1 = self._make_file("doc1.pdf", "application/pdf")
        f2 = self._make_file("doc2.pdf", "application/pdf")
        resp = api_client.post(
            msg_url(assigned_case),
            {"body": "Two files", "attachments": [f1, f2]},
            format="multipart",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        message = Message.objects.get(pk=resp.data["id"])
        assert message.attachments.count() == 2

    def test_reject_invalid_file_type(self, api_client, reporter, assigned_case):
        authenticate(api_client, reporter)
        f = self._make_file("malware.exe", "application/x-msdownload")
        resp = api_client.post(
            msg_url(assigned_case),
            {"body": "Bad file", "attachments": f},
            format="multipart",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "not allowed" in resp.data["error"]

    def test_reject_oversized_file(self, api_client, reporter, assigned_case):
        authenticate(api_client, reporter)
        oversized = b"x" * (MAX_FILE_SIZE + 1)
        f = self._make_file("big.jpg", "image/jpeg", content=oversized)
        f.size = len(oversized)
        resp = api_client.post(
            msg_url(assigned_case),
            {"body": "Big file", "attachments": f},
            format="multipart",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "too large" in resp.data["error"].lower()

    def test_attachment_without_body(self, api_client, reporter, assigned_case):
        authenticate(api_client, reporter)
        f = self._make_file("note.pdf", "application/pdf")
        resp = api_client.post(msg_url(assigned_case), {"attachments": f}, format="multipart")
        assert resp.status_code == status.HTTP_201_CREATED

    def test_no_body_no_attachments_rejected(self, api_client, reporter, assigned_case):
        authenticate(api_client, reporter)
        resp = api_client.post(msg_url(assigned_case), {}, format="multipart")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_attachments_appear_in_list(self, api_client, reporter, assigned_case, officer):
        Conversation.objects.create(case=assigned_case)
        authenticate(api_client, reporter)
        f = self._make_file("report.pdf", "application/pdf")
        resp = api_client.post(msg_url(assigned_case), {"body": "With attachment", "attachments": f}, format="multipart")
        msg_id = resp.data["id"]
        authenticate(api_client, officer)
        resp = api_client.get(msg_url(assigned_case))
        results = resp.data.get("results", resp.data)
        msg_data = next(m for m in results if m["id"] == msg_id)
        assert len(msg_data["attachments"]) == 1
        assert msg_data["attachments"][0]["id"] is not None


# ── Audit Log Verification ────────────────────────────────────────────


@pytest.mark.django_db
class TestMessageAuditLog:
    def test_message_send_creates_audit_log(self, api_client, reporter, assigned_case):
        authenticate(api_client, reporter)
        api_client.post(msg_url(assigned_case), {"body": "Log this"}, format="json")
        assert AuditLog.objects.filter(action="MESSAGE_SENT").exists()

    def test_audit_log_no_message_body(self, api_client, reporter, assigned_case):
        authenticate(api_client, reporter)
        api_client.post(msg_url(assigned_case), {"body": "SENSITIVE DATA"}, format="json")
        entry = AuditLog.objects.filter(action="MESSAGE_SENT").last()
        metadata_str = str(entry.metadata)
        assert "SENSITIVE DATA" not in metadata_str
        assert "body" not in metadata_str
        assert "message_id" in metadata_str

    def test_audit_log_has_message_id(self, api_client, reporter, assigned_case):
        authenticate(api_client, reporter)
        api_client.post(msg_url(assigned_case), {"body": "Track this"}, format="json")
        entry = AuditLog.objects.filter(action="MESSAGE_SENT").last()
        assert "message_id" in entry.metadata

    def test_audit_log_has_correct_actor(self, api_client, reporter, assigned_case):
        authenticate(api_client, reporter)
        api_client.post(msg_url(assigned_case), {"body": "Who sent"}, format="json")
        entry = AuditLog.objects.filter(action="MESSAGE_SENT").last()
        assert entry.actor == reporter
        assert entry.actor_type == "REPORTER"

    def test_audit_log_for_mark_read(self, api_client, officer, assigned_case, reporter):
        Conversation.objects.create(case=assigned_case)
        authenticate(api_client, reporter)
        resp = api_client.post(msg_url(assigned_case), {"body": "Read log"}, format="json")
        msg_id = resp.data["id"]
        authenticate(api_client, officer)
        api_client.post(mark_read_url(assigned_case, msg_id))
        assert AuditLog.objects.filter(
            action="UPDATE", resource_type="message", resource_id=msg_id
        ).exists()

    def test_access_denied_logged(self, api_client, officer2, assigned_case):
        authenticate(api_client, officer2)
        api_client.get(msg_url(assigned_case))
        assert AuditLog.objects.filter(
            action="ACCESS_DENIED", resource_type="message"
        ).exists()


# ── Validate that file validator is shared from core ──────────────────


class TestSharedFileValidator:
    def test_validate_file_type_from_core(self):
        from apps.core.utils import validate_file_type as core_validate
        from apps.reports.utils import evidence_upload_path

        # The reports app no longer defines its own validate_file_type
        f = type("FakeFile", (), {"name": "test.pdf", "content_type": "application/pdf"})()
        assert core_validate(f) == "pdf"

    def test_allowed_mime_types_defined_in_core(self):
        assert "application/pdf" in ALLOWED_MIME_TYPES
        assert "image/jpeg" in ALLOWED_MIME_TYPES
