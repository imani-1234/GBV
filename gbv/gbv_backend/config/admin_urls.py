from rest_framework.routers import DefaultRouter

from apps.accounts.views import OfficerViewSet, UserManagementViewSet
from apps.reports.views import CategoryViewSet

app_name = "api-admin"

router = DefaultRouter()
router.register("officers", OfficerViewSet, basename="admin-officers")
router.register("users", UserManagementViewSet, basename="admin-users")
router.register("categories", CategoryViewSet, basename="admin-categories")

urlpatterns = router.urls
