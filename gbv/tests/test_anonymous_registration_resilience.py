import pytest
from django.contrib.auth.hashers import check_password
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import AnonymousReporter

AUTH_URL = "/api/v1/auth/anonymous/register/"


@pytest.mark.django_db
def test_anonymous_registration_requires_a_private_password():
    response = APIClient().post(AUTH_URL, {}, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "password" in response.data


@pytest.mark.django_db
def test_anonymous_registration_recovers_from_a_code_collision(monkeypatch):
    AnonymousReporter.objects.create(reporter_code="TAKEN1", hashed_password="hashed-existing-password")
    candidate_codes = iter(["TAKEN1", "SAFE42"])
    monkeypatch.setattr("apps.accounts.serializers.generate_reporter_code", lambda: next(candidate_codes))

    response = APIClient().post(AUTH_URL, {"password": "Private-Pass!2026"}, format="json")

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["reporter_code"] == "SAFE42"
    created = AnonymousReporter.objects.get(reporter_code="SAFE42")
    assert check_password("Private-Pass!2026", created.hashed_password)
