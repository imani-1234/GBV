from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.cases.views import CaseViewSet
from apps.communication.views import MessageViewSet

app_name = "cases"

router = DefaultRouter()
router.register("", CaseViewSet, basename="case")

respond_view = CaseViewSet.as_view({"post": "respond_to_info_request"})
messages_list_create = MessageViewSet.as_view({"get": "list", "post": "create"})
messages_mark_read = MessageViewSet.as_view({"post": "mark_read"})

urlpatterns = [
    path("", include(router.urls)),
    path(
        "<uuid:pk>/request-information/<uuid:req_id>/respond/",
        respond_view,
        name="case-respond-info-request",
    ),
    path(
        "<uuid:case_pk>/messages/",
        messages_list_create,
        name="case-messages",
    ),
    path(
        "<uuid:case_pk>/messages/<uuid:message_id>/mark-read/",
        messages_mark_read,
        name="case-message-mark-read",
    ),
]
