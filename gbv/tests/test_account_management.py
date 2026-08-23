import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()

AUTH_URL = "/api/v1/auth/"
ADMIN_USERS_URL = "/api/v1/admin/users/"


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user():
    return User.objects.create_user(
        email="admin@management.test",
        full_name="Primary Administrator",
        password="Admin-Initial!2026",
        role=User.Role.ADMIN,
        is_staff=True,
    )


@pytest.fixture
def reporter():
    return User.objects.create_user(
        email="reporter@management.test",
        full_name="Managed Reporter",
        password="Reporter-Initial!2026",
        role=User.Role.REPORTER,
    )


def authenticate(client, user):
    client.force_authenticate(user=user)


def obtain_tokens(client, email, password):
    response = client.post(f"{AUTH_URL}token/", {"email": email, "password": password}, format="json")
    assert response.status_code == status.HTTP_200_OK
    return response.data


@pytest.mark.django_db
class TestAdministratorUserManagement:
    def test_admin_can_create_retrieve_and_update_user(self, api_client, admin_user):
        authenticate(api_client, admin_user)
        created = api_client.post(
            ADMIN_USERS_URL,
            {
                "email": "officer@management.test",
                "full_name": "New Officer",
                "phone_number": "+255700000001",
                "role": "OFFICER",
                "password": "Kilwa!Saffron2026",
            },
            format="json",
        )

        assert created.status_code == status.HTTP_201_CREATED
        user_id = created.data["id"]
        assert created.data["role"] == "OFFICER"
        assert "password" not in created.data

        updated = api_client.patch(
            f"{ADMIN_USERS_URL}{user_id}/",
            {"full_name": "Updated Officer", "role": "ADMIN"},
            format="json",
        )
        assert updated.status_code == status.HTTP_200_OK
        user = User.objects.get(pk=user_id)
        assert user.full_name == "Updated Officer"
        assert user.role == User.Role.ADMIN
        assert user.is_staff is True

    def test_user_list_can_filter_search_and_excludes_password(self, api_client, admin_user, reporter):
        authenticate(api_client, admin_user)
        response = api_client.get(f"{ADMIN_USERS_URL}?role=REPORTER&search=Managed")

        assert response.status_code == status.HTTP_200_OK
        records = response.data.get("results", response.data)
        assert len(records) == 1
        assert records[0]["email"] == reporter.email
        assert "password" not in records[0]

    def test_admin_can_deactivate_and_reactivate_user_but_not_last_admin(self, api_client, admin_user, reporter):
        authenticate(api_client, admin_user)
        blocked = api_client.post(f"{ADMIN_USERS_URL}{admin_user.id}/deactivate/")
        assert blocked.status_code == status.HTTP_400_BAD_REQUEST
        assert User.objects.get(pk=admin_user.pk).is_active

        deactivated = api_client.post(f"{ADMIN_USERS_URL}{reporter.id}/deactivate/")
        assert deactivated.status_code == status.HTTP_200_OK
        reporter.refresh_from_db()
        assert not reporter.is_active

        reactivated = api_client.post(f"{ADMIN_USERS_URL}{reporter.id}/reactivate/")
        assert reactivated.status_code == status.HTTP_200_OK
        reporter.refresh_from_db()
        assert reporter.is_active

    def test_admin_can_set_another_users_password_and_invalidate_old_tokens(self, api_client, admin_user, reporter):
        tokens = obtain_tokens(api_client, reporter.email, "Reporter-Initial!2026")
        authenticate(api_client, admin_user)
        response = api_client.post(
            f"{ADMIN_USERS_URL}{reporter.id}/set-password/",
            {"new_password": "Nuru!Baobab2026"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK

        api_client.force_authenticate(user=None)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        stale_access = api_client.get(f"{AUTH_URL}profile/")
        assert stale_access.status_code == status.HTTP_403_FORBIDDEN
        api_client.credentials()

        stale_refresh = api_client.post(f"{AUTH_URL}token/refresh/", {"refresh": tokens["refresh"]}, format="json")
        assert stale_refresh.status_code == status.HTTP_401_UNAUTHORIZED
        obtain_tokens(api_client, reporter.email, "Nuru!Baobab2026")

    def test_account_delete_is_disallowed_for_auditability(self, api_client, admin_user, reporter):
        authenticate(api_client, admin_user)
        response = api_client.delete(f"{ADMIN_USERS_URL}{reporter.id}/")
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        assert User.objects.filter(pk=reporter.id).exists()

    def test_non_admin_cannot_manage_users(self, api_client, reporter):
        authenticate(api_client, reporter)
        response = api_client.get(ADMIN_USERS_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestPasswordLifecycle:
    def test_password_reset_request_is_non_enumerating_and_sends_known_user_link(self, api_client, reporter, settings, django_capture_on_commit_callbacks):
        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        settings.PASSWORD_RESET_CONFIRM_URL = "http://testserver/reset-password"
        with django_capture_on_commit_callbacks(execute=True):
            known = api_client.post(f"{AUTH_URL}password/reset/", {"email": reporter.email}, format="json")
        unknown = api_client.post(f"{AUTH_URL}password/reset/", {"email": "missing@management.test"}, format="json")

        assert known.status_code == status.HTTP_200_OK
        assert unknown.status_code == status.HTTP_200_OK
        assert known.data == unknown.data
        assert len(mail.outbox) == 1
        assert "uid=" in mail.outbox[0].body
        assert "token=" in mail.outbox[0].body

    def test_password_reset_confirmation_changes_password_and_invalidates_tokens(self, api_client, reporter):
        tokens = obtain_tokens(api_client, reporter.email, "Reporter-Initial!2026")
        uid = urlsafe_base64_encode(force_bytes(reporter.pk))
        token = default_token_generator.make_token(reporter)
        response = api_client.post(
            f"{AUTH_URL}password/reset/confirm/",
            {"uid": uid, "token": token, "new_password": "Zawadi#Quartz2026"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        assert api_client.get(f"{AUTH_URL}profile/").status_code == status.HTTP_403_FORBIDDEN
        api_client.credentials()
        assert api_client.post(f"{AUTH_URL}token/refresh/", {"refresh": tokens["refresh"]}, format="json").status_code == status.HTTP_401_UNAUTHORIZED
        obtain_tokens(api_client, reporter.email, "Zawadi#Quartz2026")

    def test_invalid_reset_token_is_rejected(self, api_client, reporter):
        response = api_client.post(
            f"{AUTH_URL}password/reset/confirm/",
            {"uid": urlsafe_base64_encode(force_bytes(reporter.pk)), "token": "invalid-token", "new_password": "Zawadi#Quartz2026"},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_authenticated_password_change_requires_current_password(self, api_client, reporter):
        tokens = obtain_tokens(api_client, reporter.email, "Reporter-Initial!2026")
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        invalid = api_client.post(
            f"{AUTH_URL}password/change/",
            {"current_password": "not-the-current-password", "new_password": "Pemba!Quartz2026"},
            format="json",
        )
        assert invalid.status_code == status.HTTP_400_BAD_REQUEST

        changed = api_client.post(
            f"{AUTH_URL}password/change/",
            {"current_password": "Reporter-Initial!2026", "new_password": "Pemba!Quartz2026"},
            format="json",
        )
        assert changed.status_code == status.HTTP_200_OK

        assert api_client.get(f"{AUTH_URL}profile/").status_code == status.HTTP_403_FORBIDDEN
        api_client.credentials()
        obtain_tokens(api_client, reporter.email, "Pemba!Quartz2026")
