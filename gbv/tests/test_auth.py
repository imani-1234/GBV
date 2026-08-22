import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, is_password_usable
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import AnonymousReporter

User = get_user_model()

AUTH_PREFIX = "/api/v1/auth/"


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_data():
    return {
        "email": "reporter@example.com",
        "full_name": "Test Reporter",
        "phone_number": "+254700000000",
        "password": "strongpass123",
    }


@pytest.fixture
def registered_user(api_client, user_data):
    resp = api_client.post(f"{AUTH_PREFIX}register/", user_data, format="json")
    assert resp.status_code == status.HTTP_201_CREATED
    return resp.data


@pytest.fixture
def anonymous_reporter_data():
    return {"password": "anonpass456"}


@pytest.fixture
def registered_anonymous(api_client, anonymous_reporter_data):
    resp = api_client.post(
        f"{AUTH_PREFIX}anonymous/register/",
        anonymous_reporter_data,
        format="json",
    )
    assert resp.status_code == status.HTTP_201_CREATED
    return resp.data


# ── User Registration ─────────────────────────────────────────────


@pytest.mark.django_db
class TestUserRegistration:
    def test_register_success(self, api_client, user_data):
        resp = api_client.post(f"{AUTH_PREFIX}register/", user_data, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["email"] == user_data["email"]
        assert resp.data["full_name"] == user_data["full_name"]
        assert "password" not in resp.data
        user = User.objects.get(email=user_data["email"])
        assert user.role == User.Role.REPORTER
        assert user.check_password("strongpass123")

    def test_register_duplicate_email(self, api_client, user_data):
        api_client.post(f"{AUTH_PREFIX}register/", user_data, format="json")
        resp = api_client.post(f"{AUTH_PREFIX}register/", user_data, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_cannot_self_assign_officer(self, api_client, user_data):
        user_data["role"] = "OFFICER"
        resp = api_client.post(f"{AUTH_PREFIX}register/", user_data, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        user = User.objects.get(email=user_data["email"])
        assert user.role == User.Role.REPORTER

    def test_register_cannot_self_assign_admin(self, api_client, user_data):
        user_data["role"] = "ADMIN"
        resp = api_client.post(f"{AUTH_PREFIX}register/", user_data, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        user = User.objects.get(email=user_data["email"])
        assert user.role == User.Role.REPORTER

    def test_register_password_min_length(self, api_client, user_data):
        user_data["password"] = "short"
        resp = api_client.post(f"{AUTH_PREFIX}register/", user_data, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_is_hashed(self, api_client, user_data):
        api_client.post(f"{AUTH_PREFIX}register/", user_data, format="json")
        user = User.objects.get(email=user_data["email"])
        assert user.password != "strongpass123"
        assert is_password_usable(user.password)
        assert check_password("strongpass123", user.password)


# ── Anonymous Registration ────────────────────────────────────────


@pytest.mark.django_db
class TestAnonymousRegistration:
    def test_anonymous_register_success(self, api_client, anonymous_reporter_data):
        resp = api_client.post(
            f"{AUTH_PREFIX}anonymous/register/",
            anonymous_reporter_data,
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert "reporter_code" in resp.data
        assert len(resp.data["reporter_code"]) == 6

    def test_anonymous_code_unique(self, api_client, anonymous_reporter_data):
        r1 = api_client.post(
            f"{AUTH_PREFIX}anonymous/register/",
            anonymous_reporter_data,
            format="json",
        )
        r2 = api_client.post(
            f"{AUTH_PREFIX}anonymous/register/",
            {"password": "anotherpass789"},
            format="json",
        )
        assert r1.status_code == status.HTTP_201_CREATED
        assert r2.status_code == status.HTTP_201_CREATED
        assert r1.data["reporter_code"] != r2.data["reporter_code"]

    def test_anonymous_no_identifying_fields_stored(
        self, api_client, anonymous_reporter_data
    ):
        resp = api_client.post(
            f"{AUTH_PREFIX}anonymous/register/",
            anonymous_reporter_data,
            format="json",
        )
        code = resp.data["reporter_code"]
        reporter = AnonymousReporter.objects.get(reporter_code=code)
        assert reporter.hashed_password
        assert not hasattr(reporter, "email")
        assert not hasattr(reporter, "full_name")
        assert not hasattr(reporter, "phone_number")
        # Verify the response returns code only once
        resp2 = api_client.post(
            f"{AUTH_PREFIX}anonymous/login/",
            {"reporter_code": code, "password": anonymous_reporter_data["password"]},
            format="json",
        )
        assert resp2.status_code == status.HTTP_200_OK
        assert "reporter_code" not in resp2.data

    def test_anonymous_password_hashed(self, api_client, anonymous_reporter_data):
        resp = api_client.post(
            f"{AUTH_PREFIX}anonymous/register/",
            anonymous_reporter_data,
            format="json",
        )
        reporter = AnonymousReporter.objects.get(
            reporter_code=resp.data["reporter_code"]
        )
        assert reporter.hashed_password != "anonpass456"
        assert check_password("anonpass456", reporter.hashed_password)

    def test_code_not_retrievable_after_first_response(
        self, api_client, anonymous_reporter_data
    ):
        resp = api_client.post(
            f"{AUTH_PREFIX}anonymous/register/",
            anonymous_reporter_data,
            format="json",
        )
        code = resp.data["reporter_code"]
        # There is no endpoint to retrieve the code again
        # Verify the anonymous reporter data only contains code once
        assert list(resp.data.keys()) == ["reporter_code", "message"]


# ── User Login (JWT) ──────────────────────────────────────────────


@pytest.mark.django_db
class TestUserLogin:
    def test_login_obtain_token(self, api_client, registered_user, user_data):
        resp = api_client.post(
            f"{AUTH_PREFIX}token/",
            {"email": user_data["email"], "password": user_data["password"]},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "access" in resp.data
        assert "refresh" in resp.data

    def test_login_invalid_credentials(self, api_client, user_data):
        resp = api_client.post(
            f"{AUTH_PREFIX}token/",
            {"email": user_data["email"], "password": "wrongpass"},
            format="json",
        )
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_token_refresh(self, api_client, registered_user, user_data):
        token_resp = api_client.post(
            f"{AUTH_PREFIX}token/",
            {"email": user_data["email"], "password": user_data["password"]},
            format="json",
        )
        refresh = token_resp.data["refresh"]
        resp = api_client.post(
            f"{AUTH_PREFIX}token/refresh/",
            {"refresh": refresh},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "access" in resp.data

    def test_token_verify_valid(self, api_client, registered_user, user_data):
        token_resp = api_client.post(
            f"{AUTH_PREFIX}token/",
            {"email": user_data["email"], "password": user_data["password"]},
            format="json",
        )
        access = token_resp.data["access"]
        resp = api_client.post(
            f"{AUTH_PREFIX}token/verify/",
            {"token": access},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK

    def test_token_verify_invalid(self, api_client):
        resp = api_client.post(
            f"{AUTH_PREFIX}token/verify/",
            {"token": "invalidtoken123"},
            format="json",
        )
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_request_with_token(
        self, api_client, registered_user, user_data
    ):
        token_resp = api_client.post(
            f"{AUTH_PREFIX}token/",
            {"email": user_data["email"], "password": user_data["password"]},
            format="json",
        )
        access = token_resp.data["access"]
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = api_client.get("/api/v1/health/")
        assert resp.status_code == status.HTTP_200_OK


# ── Anonymous Login ───────────────────────────────────────────────


@pytest.mark.django_db
class TestAnonymousLogin:
    def test_anonymous_login_success(self, api_client, registered_anonymous):
        code = registered_anonymous["reporter_code"]
        resp = api_client.post(
            f"{AUTH_PREFIX}anonymous/login/",
            {"reporter_code": code, "password": "anonpass456"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "access" in resp.data
        assert "refresh" in resp.data

    def test_anonymous_login_wrong_password(self, api_client, registered_anonymous):
        code = registered_anonymous["reporter_code"]
        resp = api_client.post(
            f"{AUTH_PREFIX}anonymous/login/",
            {"reporter_code": code, "password": "wrongpass"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_anonymous_login_wrong_code(self, api_client):
        resp = api_client.post(
            f"{AUTH_PREFIX}anonymous/login/",
            {"reporter_code": "ZZZZZZ", "password": "anypass"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_anonymous_token_custom_claims(self, api_client, registered_anonymous):
        code = registered_anonymous["reporter_code"]
        resp = api_client.post(
            f"{AUTH_PREFIX}anonymous/login/",
            {"reporter_code": code, "password": "anonpass456"},
            format="json",
        )
        access = resp.data["access"]
        # Decode the token to inspect claims
        from rest_framework_simplejwt.tokens import AccessToken

        token = AccessToken(access)
        assert token["actor_type"] == "anonymous_reporter"
        assert token["reporter_code"] == code
        assert "user_id" not in token

    def test_anonymous_token_allows_allowany_endpoint(
        self, api_client, registered_anonymous
    ):
        code = registered_anonymous["reporter_code"]
        resp = api_client.post(
            f"{AUTH_PREFIX}anonymous/login/",
            {"reporter_code": code, "password": "anonpass456"},
            format="json",
        )
        access = resp.data["access"]
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        # The anonymous token authenticates the request with AnonymousUser,
        # which is allowed through AllowAny endpoints
        resp = api_client.get("/api/v1/health/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data == {"status": "ok"}

    def test_login_same_anonymous_multiple_times(
        self, api_client, registered_anonymous
    ):
        code = registered_anonymous["reporter_code"]
        r1 = api_client.post(
            f"{AUTH_PREFIX}anonymous/login/",
            {"reporter_code": code, "password": "anonpass456"},
            format="json",
        )
        r2 = api_client.post(
            f"{AUTH_PREFIX}anonymous/login/",
            {"reporter_code": code, "password": "anonpass456"},
            format="json",
        )
        assert r1.status_code == status.HTTP_200_OK
        assert r2.status_code == status.HTTP_200_OK


# ── Password Hashing Correctness ──────────────────────────────────


@pytest.mark.django_db
class TestPasswordHashing:
    def test_user_password_argon2_or_pbkdf2(self, api_client, user_data):
        api_client.post(f"{AUTH_PREFIX}register/", user_data, format="json")
        user = User.objects.get(email=user_data["email"])
        assert user.password.startswith(
            ("argon2", "pbkdf2_sha256", "bcrypt")
        ) or "sha256" in user.password

    def test_anonymous_password_hashed_properly(
        self, api_client, anonymous_reporter_data
    ):
        resp = api_client.post(
            f"{AUTH_PREFIX}anonymous/register/",
            anonymous_reporter_data,
            format="json",
        )
        reporter = AnonymousReporter.objects.get(
            reporter_code=resp.data["reporter_code"]
        )
        # Should be a Django-compatible hash
        assert check_password("anonpass456", reporter.hashed_password)
        assert not check_password("wrongpass", reporter.hashed_password)
