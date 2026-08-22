from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.analytics.views import AnalyticsViewSet

app_name = "analytics"

router = DefaultRouter()
router.register("", AnalyticsViewSet, basename="analytics")

urlpatterns = [
    path("", include(router.urls)),
]
