from rest_framework.permissions import BasePermission

from apps.cases.models import Case
from apps.core.permissions import _audit_log
from apps.core.permissions_matrix import PERMISSION_MATRIX


class CanAccessConversation(BasePermission):
    message = "You do not have permission to access this conversation."

    def _can_access_case(self, request, case):
        role = getattr(request.user, "role", None)
        if role == "ADMIN":
            return True
        if role == "OFFICER":
            return case.assigned_officer is None or case.assigned_officer == request.user
        if role == "REPORTER":
            return case.report.reporter == request.user
        if request.auth and request.auth.get("actor_type") == "anonymous_reporter":
            return (
                case.report.anonymous_reporter is not None
                and request.auth.get("reporter_code") == case.report.anonymous_reporter.reporter_code
            )
        return False

    def has_permission(self, request, view):
        case_pk = view.kwargs.get("case_pk")
        if not case_pk:
            return False
        try:
            case = Case.objects.get(pk=case_pk)
        except Case.DoesNotExist:
            return False

        view_action = getattr(view, "action", None)
        resource_actions = getattr(view, "resource_actions", {})
        action = resource_actions.get(view_action, view_action)

        if request.auth and request.auth.get("actor_type") == "anonymous_reporter":
            allowed = {"send", "read"}
            if action not in allowed:
                return False
            result = self._can_access_case(request, case)
            _audit_log(
                request,
                "ACCESS_GRANTED" if result else "ACCESS_DENIED",
                resource_type="message",
                resource_id="",
                metadata={
                    "actor_type": "anonymous_reporter",
                    "requested_action": action,
                    "view_action": view_action,
                    "case_id": str(case.id),
                },
            )
            return result

        if not request.user or not request.user.is_authenticated:
            return False
        role = getattr(request.user, "role", None)
        if not role:
            return False
        allowed = PERMISSION_MATRIX.get(role, {}).get("message", [])
        result = action in allowed and self._can_access_case(request, case)
        _audit_log(
            request,
            "ACCESS_GRANTED" if result else "ACCESS_DENIED",
            resource_type="message",
            resource_id="",
            metadata={
                "role": role,
                "requested_action": action,
                "view_action": view_action,
                "case_id": str(case.id),
                "allowed_actions": allowed,
            },
        )
        return result

    def has_object_permission(self, request, view, obj):
        case = obj.conversation.case
        return self._can_access_case(request, case)
