import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.reports.models import IncidentCategory

User = get_user_model()

ADMIN_URL = "/api/v1/admin/"


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


def authenticate(api_client, user):
    api_client.force_authenticate(user=user)


# ── Officers ──────────────────────────────────────────────────────


@pytest.mark.django_db
class TestAdminOfficers:
    OFFICERS_URL = f"{ADMIN_URL}officers/"

    def test_list_officers(self, api_client, admin_user, officer):
        User.objects.create_user(
            email="officer2@test.com",
            full_name="Officer Two",
            password="pass1234",
            role=User.Role.OFFICER,
        )
        authenticate(api_client, admin_user)
        resp = api_client.get(self.OFFICERS_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 2

    def test_list_officers_excludes_non_officers(self, api_client, admin_user, officer, reporter):
        authenticate(api_client, admin_user)
        resp = api_client.get(self.OFFICERS_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1

    def test_create_officer(self, api_client, admin_user):
        authenticate(api_client, admin_user)
        data = {
            "email": "new_officer@test.com",
            "full_name": "New Officer",
            "password": "strongpass123",
        }
        resp = api_client.post(self.OFFICERS_URL, data, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["role"] == "OFFICER"
        assert resp.data["email"] == "new_officer@test.com"
        user = User.objects.get(email="new_officer@test.com")
        assert user.role == User.Role.OFFICER
        assert user.check_password("strongpass123")

    def test_create_officer_role_locked(self, api_client, admin_user):
        authenticate(api_client, admin_user)
        data = {
            "email": "locked@test.com",
            "full_name": "Locked",
            "password": "strongpass123",
            "role": "ADMIN",
        }
        resp = api_client.post(self.OFFICERS_URL, data, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        user = User.objects.get(email="locked@test.com")
        assert user.role == User.Role.OFFICER

    def test_create_officer_short_password(self, api_client, admin_user):
        authenticate(api_client, admin_user)
        data = {
            "email": "short@test.com",
            "full_name": "Short",
            "password": "short",
        }
        resp = api_client.post(self.OFFICERS_URL, data, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_officers_requires_admin(self, api_client, officer):
        authenticate(api_client, officer)
        resp = api_client.get(self.OFFICERS_URL)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_officers_unauthenticated(self, api_client):
        resp = api_client.get(self.OFFICERS_URL)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# ── User Deactivate / Reactivate ──────────────────────────────────


@pytest.mark.django_db
class TestAdminUserStatus:
    def test_deactivate_user(self, api_client, admin_user, officer):
        authenticate(api_client, admin_user)
        resp = api_client.patch(f"{ADMIN_URL}users/{officer.id}/deactivate/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "deactivated"
        officer.refresh_from_db()
        assert not officer.is_active

    def test_reactivate_user(self, api_client, admin_user, officer):
        officer.is_active = False
        officer.save()

        authenticate(api_client, admin_user)
        resp = api_client.patch(f"{ADMIN_URL}users/{officer.id}/reactivate/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "reactivated"
        officer.refresh_from_db()
        assert officer.is_active

    def test_deactivate_requires_admin(self, api_client, officer, reporter):
        authenticate(api_client, reporter)
        resp = api_client.patch(f"{ADMIN_URL}users/{officer.id}/deactivate/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_reactivate_not_found(self, api_client, admin_user):
        authenticate(api_client, admin_user)
        resp = api_client.patch(f"{ADMIN_URL}users/00000000-0000-0000-0000-000000000000/deactivate/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND


# ── Categories CRUD ────────────────────────────────────────────────


@pytest.mark.django_db
class TestAdminCategories:
    CATEGORIES_URL = f"{ADMIN_URL}categories/"

    def test_list_categories(self, api_client, admin_user, category):
        authenticate(api_client, admin_user)
        resp = api_client.get(self.CATEGORIES_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) >= 1

    def test_create_category(self, api_client, admin_user):
        authenticate(api_client, admin_user)
        data = {
            "name": "New Category",
            "description": "A new category",
            "default_priority": "low",
        }
        resp = api_client.post(self.CATEGORIES_URL, data, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["name"] == "New Category"
        assert IncidentCategory.objects.filter(name="New Category").exists()

    def test_update_category(self, api_client, admin_user, category):
        authenticate(api_client, admin_user)
        resp = api_client.patch(
            f"{self.CATEGORIES_URL}{category.id}/",
            {"name": "Updated Category"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        category.refresh_from_db()
        assert category.name == "Updated Category"

    def test_delete_category(self, api_client, admin_user, category):
        authenticate(api_client, admin_user)
        resp = api_client.delete(f"{self.CATEGORIES_URL}{category.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        assert not IncidentCategory.objects.filter(id=category.id).exists()

    def test_categories_requires_admin(self, api_client, officer):
        authenticate(api_client, officer)
        resp = api_client.get(self.CATEGORIES_URL)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_categories_unauthenticated(self, api_client):
        resp = api_client.get(self.CATEGORIES_URL)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
