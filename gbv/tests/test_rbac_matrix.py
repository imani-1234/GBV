"""
Comprehensive RBAC matrix: every endpoint × every actor type.
Prints a coverage table so gaps are visible in one place.
"""

import pyotp
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import AnonymousReporter, TOTPDevice
from apps.cases.models import Case, InformationRequest
from apps.communication.models import Conversation, Message
from apps.notifications.models import Notification
from apps.reports.models import IncidentCategory, Report

User = get_user_model()

# ── Actor identifiers ────────────────────────────────────────────
ACTORS = ("unauthenticated", "reporter", "officer", "admin", "anonymous_reporter")
ALLOW_ANY = 200  # actually gets 200 or 201


@pytest.fixture
def category():
    return IncidentCategory.objects.create(
        name="Physical Assault",
        description="Test",
        default_priority="high",
    )


@pytest.fixture
def reporter():
    return User.objects.create_user(
        email="reporter@test.com",
        full_name="Reporter",
        password="pass1234",
        role=User.Role.REPORTER,
    )


@pytest.fixture
def officer():
    return User.objects.create_user(
        email="officer@test.com",
        full_name="Officer",
        password="pass1234",
        role=User.Role.OFFICER,
    )


@pytest.fixture
def admin_user():
    return User.objects.create_user(
        email="admin@test.com",
        full_name="Admin",
        password="pass1234",
        role=User.Role.ADMIN,
        is_staff=True,
    )


@pytest.fixture
def anon_reporter():
    return AnonymousReporter.objects.create(
        reporter_code="RBACT01",
        hashed_password="mock",
    )


@pytest.fixture
def anon_token(anon_reporter):
    refresh = RefreshToken()
    refresh["actor_type"] = "anonymous_reporter"
    refresh["reporter_code"] = anon_reporter.reporter_code
    return str(refresh.access_token)


@pytest.fixture
def report(reporter, category):
    return Report.objects.create(
        reporter=reporter,
        category=category,
        incident_date="2026-07-22",
        campus="Main",
        department="Eng",
        location_text="A",
        description="Test report",
        status=Report.Status.SUBMITTED,
    )


@pytest.fixture
def draft_report(reporter, category):
    return Report.objects.create(
        reporter=reporter,
        category=category,
        incident_date="2026-07-22",
        campus="Main",
        department="Eng",
        location_text="A",
        description="Draft report",
        status=Report.Status.DRAFT,
    )


@pytest.fixture
def case(report, officer):
    return Case.objects.create(
        report=report,
        assigned_officer=officer,
        status=Case.Status.ASSIGNED,
    )


@pytest.fixture
def conversation(case):
    return Conversation.objects.create(case=case)


@pytest.fixture
def message(conversation, officer):
    return Message.objects.create(
        conversation=conversation,
        sender_user=officer,
        sender_actor_type="OFFICER",
        body="Test message",
    )


@pytest.fixture
def notification(reporter):
    return Notification.objects.create(
        recipient_user=reporter,
        notification_type=Notification.NotificationType.STATUS_CHANGED,
        payload={"msg": "test"},
    )


@pytest.fixture
def info_request(case, officer):
    return InformationRequest.objects.create(
        case=case,
        requested_by=officer,
        request_text="Provide more details",
    )


# ── Actor helpers ─────────────────────────────────────────────────


def get_client(actor_name, reporter, officer, admin_user, anon_token):
    c = APIClient()
    if actor_name == "unauthenticated":
        pass
    elif actor_name == "reporter":
        c.force_authenticate(user=reporter)
    elif actor_name == "officer":
        c.force_authenticate(user=officer)
    elif actor_name == "admin":
        c.force_authenticate(user=admin_user)
    elif actor_name == "anonymous_reporter":
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {anon_token}")
    return c


# ── RBAC Matrix Test ──────────────────────────────────────────────

_test_results = {}
_counter = 0


@pytest.mark.django_db
class TestRBACMatrix:

    # fmt: off
    # (name, method, url_template, url_kwargs_getter, body_getter, expected_codes)
    # Note: anonymous_reporter sends a valid JWT (no user_id claim) so DRF
    # returns 403 (PermissionDenied) instead of 401 (NotAuthenticated) when
    # IsAuthenticated or other permission classes fail.
    endpoints = [
        # Auth
        ("auth_register",           "POST", "/api/v1/auth/register/",
         None,
         lambda ctx, a: {"email": f"rbac_{a}@test.com", "full_name": a.title(), "password": "pass1234"},
         {"unauthenticated": 201, "reporter": 201, "officer": 201, "admin": 201, "anonymous_reporter": 201}),
        ("auth_token",              "POST", "/api/v1/auth/token/",
         None,
         lambda ctx, a: {"email": "reporter@test.com", "password": "pass1234"},
         {"unauthenticated": 200, "reporter": 200, "officer": 200, "admin": 200, "anonymous_reporter": 200}),
        ("auth_logout",             "POST", "/api/v1/auth/logout/",
         None,
         lambda ctx, a: {"refresh_token": "x"},
         {"unauthenticated": 401, "reporter": 400, "officer": 400, "admin": 400, "anonymous_reporter": 403}),
        # TOTP — IsAuthenticated
        ("auth_totp_status",        "GET",  "/api/v1/auth/totp/status/",
         None, None,
         {"unauthenticated": 401, "reporter": 200, "officer": 200, "admin": 200, "anonymous_reporter": 403}),
        # Health — AllowAny
        ("health",                  "GET",  "/api/v1/health/",
         None, None,
         {"unauthenticated": 200, "reporter": 200, "officer": 200, "admin": 200, "anonymous_reporter": 200}),
        # Reports — CanAccessReport
        ("report_create",           "POST", "/api/v1/reports/",
         None,
         lambda ctx, a: {"category": str(ctx["cat"].id), "incident_date": "2026-07-22", "campus": "M", "department": "D", "location_text": "L", "description": "D"},
         {"unauthenticated": 401, "reporter": 201, "officer": 403, "admin": 201, "anonymous_reporter": 201}),
        ("report_list",             "GET",  "/api/v1/reports/",
         None, None,
         {"unauthenticated": 401, "reporter": 200, "officer": 200, "admin": 200, "anonymous_reporter": 200}),
        ("report_detail",           "GET",  "/api/v1/reports/{pk}/",
         lambda ctx: {"pk": str(ctx["report"].id)}, None,
         {"unauthenticated": 401, "reporter": 200, "officer": 200, "admin": 200, "anonymous_reporter": 404}),
        ("report_update_draft",     "PATCH", "/api/v1/reports/{pk}/",
         lambda ctx: {"pk": str(ctx["draft"].id)}, lambda ctx, a: {"description": "Updated"},
         {"unauthenticated": 401, "reporter": 200, "officer": 403, "admin": 200, "anonymous_reporter": 403}),
        ("report_submit",           "POST", "/api/v1/reports/{pk}/submit/",
         lambda ctx: {"pk": str(ctx["draft"].id)}, None,
         {"unauthenticated": 401, "reporter": 200, "officer": 403, "anonymous_reporter": 404}),
        # Cases — HasResourcePermission / custom
        ("case_list",               "GET",  "/api/v1/cases/",
         None, None,
         {"unauthenticated": 401, "reporter": 200, "officer": 200, "admin": 200, "anonymous_reporter": 403}),
        ("case_detail",             "GET",  "/api/v1/cases/{pk}/",
         lambda ctx: {"pk": str(ctx["case"].id)}, None,
         {"unauthenticated": 401, "reporter": 200, "officer": 200, "admin": 200, "anonymous_reporter": 403}),
        ("case_notes_get",          "GET",  "/api/v1/cases/{pk}/notes/",
         lambda ctx: {"pk": str(ctx["case"].id)}, None,
         {"unauthenticated": 401, "reporter": 200, "officer": 200, "admin": 200, "anonymous_reporter": 403}),
        ("case_notes_post",         "POST", "/api/v1/cases/{pk}/notes/",
         lambda ctx: {"pk": str(ctx["case"].id)}, lambda ctx, a: {"note_text": "Test"},
         {"unauthenticated": 401, "reporter": 403, "officer": 201, "admin": 201, "anonymous_reporter": 403}),
        ("case_request_info",       "POST", "/api/v1/cases/{pk}/request-information/",
         lambda ctx: {"pk": str(ctx["case"].id)}, lambda ctx, a: {"request_text": "Info needed"},
         {"unauthenticated": 401, "reporter": 403, "officer": 201, "admin": 201, "anonymous_reporter": 403}),
        ("case_respond_info",       "POST", "/api/v1/cases/{pk}/request-information/{rid}/respond/",
         lambda ctx: {"pk": str(ctx["case"].id), "rid": str(ctx["info_request"].id)},
         lambda ctx, a: {"reporter_response": "Response"},
         {"unauthenticated": 404, "reporter": 200, "officer": 403, "anonymous_reporter": 404}),
        # Messages — CanAccessConversation
        ("msg_list",                "GET",  "/api/v1/cases/{pk}/messages/",
         lambda ctx: {"pk": str(ctx["case"].id)}, None,
         {"unauthenticated": 401, "reporter": 200, "officer": 200, "admin": 200, "anonymous_reporter": 403}),
        ("msg_create",              "POST", "/api/v1/cases/{pk}/messages/",
         lambda ctx: {"pk": str(ctx["case"].id)}, lambda ctx, a: {"body": "Hello"},
         {"unauthenticated": 401, "reporter": 201, "officer": 201, "admin": 201, "anonymous_reporter": 403}),
        # Notifications — IsAuthenticated + owner check
        ("notif_list",              "GET",  "/api/v1/notifications/",
         None, None,
         {"unauthenticated": 401, "reporter": 200, "officer": 200, "admin": 200, "anonymous_reporter": 403}),
        ("notif_mark_read",         "POST", "/api/v1/notifications/{pk}/mark-read/",
         lambda ctx: {"pk": str(ctx["notif"].id)}, None,
         {"unauthenticated": 401, "reporter": 200, "officer": 404, "admin": 404, "anonymous_reporter": 403}),
        ("notif_mark_all_read",     "POST", "/api/v1/notifications/mark-all-read/",
         None, None,
         {"unauthenticated": 401, "reporter": 200, "officer": 200, "admin": 200, "anonymous_reporter": 403}),
        # Analytics — IsAdminUser
        ("analytics_summary",       "GET",  "/api/v1/analytics/summary/",
         None, None,
         {"unauthenticated": 401, "reporter": 403, "officer": 403, "admin": 200, "anonymous_reporter": 403}),
        # Admin — Officers
        ("admin_officers_list",     "GET",  "/api/v1/admin/officers/",
         None, None,
         {"unauthenticated": 401, "reporter": 403, "officer": 403, "admin": 200, "anonymous_reporter": 403}),
        ("admin_officers_create",   "POST", "/api/v1/admin/officers/",
         None,
         lambda ctx, a: {"email": f"newoff_{a}@test.com", "full_name": "N", "password": "pass1234"},
         {"unauthenticated": 401, "reporter": 403, "officer": 403, "admin": 201, "anonymous_reporter": 403}),
        # Admin — Users
        ("admin_user_deactivate",   "PATCH","/api/v1/admin/users/{pk}/deactivate/",
         lambda ctx: {"pk": str(ctx["officer"].id)}, None,
         {"unauthenticated": 401, "reporter": 403, "officer": 403, "admin": 200, "anonymous_reporter": 403}),
        # Admin — Categories
        ("admin_categories_list",   "GET",  "/api/v1/admin/categories/",
         None, None,
         {"unauthenticated": 401, "reporter": 403, "officer": 403, "admin": 200, "anonymous_reporter": 403}),
        ("admin_categories_create", "POST", "/api/v1/admin/categories/",
         None,
         lambda ctx, a: {"name": f"Cat_{a}", "description": "Test"},
         {"unauthenticated": 401, "reporter": 403, "officer": 403, "admin": 201, "anonymous_reporter": 403}),
        ("admin_categories_update", "PATCH","/api/v1/admin/categories/{pk}/",
         lambda ctx: {"pk": str(ctx["cat"].id)}, lambda ctx, a: {"name": f"Updated_{a}"},
         {"unauthenticated": 401, "reporter": 403, "officer": 403, "admin": 200, "anonymous_reporter": 403}),
        ("admin_categories_delete", "DELETE","/api/v1/admin/categories/{pk}/",
         lambda ctx: {"pk": str(ctx["cat"].id)}, None,
         {"unauthenticated": 401, "reporter": 403, "officer": 403, "anonymous_reporter": 403}),
    ]
    # fmt: on

    @pytest.mark.parametrize("endpoint", endpoints, ids=[e[0] for e in endpoints])
    def test_rbac_endpoint(self, request, endpoint,
                           reporter, officer, admin_user, anon_reporter, anon_token,
                           category, report, draft_report, case, message, notification, info_request):
        name, method, url_template, kwargs_getter, body_getter, expected_codes = endpoint

        # Bundle fixtures into a context dict for getters
        ctx = {
            "report": report,
            "draft": draft_report,
            "case": case,
            "message": message,
            "notif": notification,
            "info_request": info_request,
            "cat": category,
            "officer": officer,
        }

        for actor in ACTORS:
            expected = expected_codes.get(actor)
            if expected is None:
                continue

            client = get_client(actor, reporter, officer, admin_user, anon_token)

            # Resolve kwargs
            url_kwargs = kwargs_getter(ctx) if kwargs_getter else {}
            url = url_template.format(**url_kwargs)

            # Resolve body (callable gets (ctx, actor_name))
            body = body_getter(ctx, actor) if body_getter else {}

            if method == "GET":
                resp = client.get(url, data=body, format="json")
            elif method == "POST":
                resp = client.post(url, data=body, format="json")
            elif method == "PATCH":
                resp = client.patch(url, data=body, format="json")
            elif method == "DELETE":
                resp = client.delete(url, format="json")
            else:
                raise ValueError(f"Unknown method: {method}")

            key = (name, actor)
            _test_results[key] = (resp.status_code, expected)
            assert resp.status_code == expected, (
                f"[{actor}] {method} {url} → expected {expected}, got {resp.status_code}\nBody: {resp.content[:300]}"
            )


# ── Coverage table ────────────────────────────────────────────────


def pytest_unconfigure():
    """Print RBAC matrix at end of test run."""
    if not _test_results:
        return
    endpoints_by_name = {}
    for (name, actor), (actual, expected) in _test_results.items():
        endpoints_by_name.setdefault(name, {})[actor] = (actual, expected)

    print("\n\n========== RBAC COVERAGE MATRIX ==========")
    line_len = 30 + 22 * len(ACTORS)
    print(f"{'Endpoint':<30}" + "".join(f"{a:<22}" for a in ACTORS))
    print("=" * line_len)
    for ep_name in sorted(endpoints_by_name.keys()):
        actors = endpoints_by_name[ep_name]
        row = f"{ep_name:<30}"
        for actor in ACTORS:
            if actor in actors:
                actual, expected = actors[actor]
                marker = "✓" if actual == expected else "✗"
                row += f"{marker} {actual:<18}"
            else:
                row += f"{'—':<22}"
        print(row)
    print("=" * line_len)
    passed = sum(1 for v in _test_results.values() if v[0] == v[1])
    total = len(_test_results)
    print(f"\nResults: {passed}/{total} passed\n")
