import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def superuser():
    return User.objects.create_superuser(
        email="admin-ui@test.com",
        full_name="Admin UI",
        password="Admin-Initial!2026",
    )


@pytest.fixture
def managed_user():
    return User.objects.create_user(
        email="managed-ui@test.com",
        full_name="Managed User",
        password="Managed-Initial!2026",
        role=User.Role.OFFICER,
    )


@pytest.mark.django_db
def test_admin_user_change_page_uses_secure_password_change_link(client, superuser, managed_user):
    client.force_login(superuser)
    change_url = reverse("admin:accounts_user_change", args=[managed_user.pk])
    password_url = reverse("admin:auth_user_password_change", args=[managed_user.pk])

    response = client.get(change_url)

    assert response.status_code == 200
    content = response.content.decode()
    assert "../password/" in content
    assert "Reset password" in content
    assert managed_user.password not in content


@pytest.mark.django_db
def test_admin_password_change_route_sets_password_without_exposing_hash(client, superuser, managed_user):
    client.force_login(superuser)
    password_url = reverse("admin:auth_user_password_change", args=[managed_user.pk])

    response = client.post(
        password_url,
        {"password1": "Pwchange!Zanzibar2026", "password2": "Pwchange!Zanzibar2026"},
    )

    assert response.status_code == 302
    managed_user.refresh_from_db()
    assert managed_user.check_password("Pwchange!Zanzibar2026")
