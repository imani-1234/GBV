import pytest
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
def test_health_check(api_client):
    response = api_client.get("/api/v1/health/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data == {"status": "ok"}
