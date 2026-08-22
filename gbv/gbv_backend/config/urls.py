from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.routers import DefaultRouter

from apps.reports.views import PublicCategoryViewSet


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"})


category_router = DefaultRouter()
category_router.register("", PublicCategoryViewSet, basename="category")


urlpatterns = [
    path("admin/", admin.site.urls),
    # Health check
    path("api/v1/health/", health_check, name="health-check"),
    # API schema
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/v1/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/v1/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
    # App URLs
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/reports/", include("apps.reports.urls")),
    path("api/v1/cases/", include("apps.cases.urls")),
    path("api/v1/communication/", include("apps.communication.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/analytics/", include("apps.analytics.urls")),
    # Incident categories: readable by any authenticated user (frontend wizard),
    # writable only by admins via the shared viewset.
    path("api/v1/categories/", include(category_router.urls)),
    # Admin management
    path("api/v1/admin/", include("config.admin_urls")),
]
