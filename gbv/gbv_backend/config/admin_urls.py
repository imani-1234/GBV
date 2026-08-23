from rest_framework.routers import DefaultRouter

from apps.accounts.views import OfficerViewSet, UserManagementViewSet
from apps.reports.views import CampusViewSet, CategoryViewSet, DepartmentViewSet

app_name = "api-admin"

router = DefaultRouter()
router.register("officers", OfficerViewSet, basename="admin-officers")
router.register("users", UserManagementViewSet, basename="admin-users")
router.register("categories", CategoryViewSet, basename="admin-categories")
router.register("campuses", CampusViewSet, basename="admin-campuses")
router.register("departments", DepartmentViewSet, basename="admin-departments")

urlpatterns = router.urls
