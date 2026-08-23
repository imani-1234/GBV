from django.contrib.auth.models import AnonymousUser
from rest_framework.permissions import BasePermission
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.settings import api_settings as jwt_settings

from apps.core.models import AuditLog
from apps.core.permissions_matrix import PERMISSION_MATRIX


def _audit_log(request, action, instance=None, resource_type=None, resource_id=None, metadata=None):
    user = request.user
    actor_fk = None
    actor_type = ""
    actor_identifier = ""
    if user.is_authenticated:
        actor_fk = user
        actor_type = getattr(user, "role", "user")
        actor_identifier = str(user)
    elif request.auth and request.auth.get("actor_type") == "anonymous_reporter":
        actor_type = "anonymous_reporter"
        actor_identifier = request.auth.get("reporter_code", "")
    if instance is not None:
        rtype = instance._meta.model_name
        rid = str(getattr(instance, "id", ""))
    else:
        rtype = resource_type or ""
        rid = resource_id or ""
    AuditLog.objects.create(
        actor=actor_fk,
        actor_type=actor_type,
        actor_identifier=actor_identifier,
        action=action,
        resource_type=rtype,
        resource_id=rid,
        ip_address=request.META.get("REMOTE_ADDR", ""),
        metadata=metadata or {},
    )


class HasResourcePermission(BasePermission):
    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = request.user.role
        resource_type = getattr(view, "resource_type", None)
        if not resource_type:
            return True
        view_action = getattr(view, "action", None)
        resource_actions = getattr(view, "resource_actions", {})
        action = resource_actions.get(view_action, view_action)
        if not action:
            return False
        allowed = PERMISSION_MATRIX.get(role, {}).get(resource_type, [])
        result = action in allowed
        _audit_log(
            request,
            "ACCESS_GRANTED" if result else "ACCESS_DENIED",
            resource_type=resource_type,
            resource_id=view.kwargs.get("pk", ""),
            metadata={
                "role": role,
                "requested_action": action,
                "view_action": view_action,
                "allowed_actions": allowed,
            },
        )
        return result

    def has_object_permission(self, request, view, obj):
        role = getattr(request.user, "role", None)
        if role == "ADMIN":
            return True
        if role == "OFFICER":
            if hasattr(obj, "assigned_officer") and obj.assigned_officer is not None:
                return obj.assigned_officer == request.user
            if hasattr(obj, "assigned_to") and obj.assigned_to is not None:
                return obj.assigned_to == request.user
            return True
        if role == "REPORTER":
            if hasattr(obj, "reporter") and obj.reporter is not None:
                return obj.reporter == request.user
            if hasattr(obj, "report") and hasattr(obj.report, "reporter") and obj.report.reporter is not None:
                return obj.report.reporter == request.user
            if hasattr(obj, "user") and obj.user is not None:
                return obj.user == request.user
            return False
        return False


class CanAccessReport(BasePermission):
    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        if request.auth and request.auth.get("actor_type") == "anonymous_reporter":
            view_action = getattr(view, "action", None)
            resource_actions = getattr(view, "resource_actions", {})
            action = resource_actions.get(view_action, view_action)
            allowed = {"create", "read_own", "submit", "evidence_upload"}
            result = action in allowed
            _audit_log(
                request,
                "ACCESS_GRANTED" if result else "ACCESS_DENIED",
                resource_type=getattr(view, "resource_type", "report"),
                resource_id=view.kwargs.get("pk", ""),
                metadata={
                    "actor_type": "anonymous_reporter",
                    "requested_action": action,
                    "view_action": view_action,
                    "allowed_actions": list(allowed),
                },
            )
            return result

        if not request.user or not request.user.is_authenticated:
            return False
        role = request.user.role
        resource_type = getattr(view, "resource_type", None)
        if not resource_type:
            return True
        view_action = getattr(view, "action", None)
        resource_actions = getattr(view, "resource_actions", {})
        action = resource_actions.get(view_action, view_action)
        if not action:
            return False
        allowed = PERMISSION_MATRIX.get(role, {}).get(resource_type, [])
        result = action in allowed
        _audit_log(
            request,
            "ACCESS_GRANTED" if result else "ACCESS_DENIED",
            resource_type=resource_type,
            resource_id=view.kwargs.get("pk", ""),
            metadata={
                "role": role,
                "requested_action": action,
                "view_action": view_action,
                "allowed_actions": allowed,
            },
        )
        return result

    def has_object_permission(self, request, view, obj):
        if request.auth and request.auth.get("actor_type") == "anonymous_reporter":
            reporter_code = request.auth.get("reporter_code", "")
            return (
                obj.anonymous_reporter is not None
                and obj.anonymous_reporter.reporter_code == reporter_code
            )
        role = getattr(request.user, "role", None)
        if role == "ADMIN":
            return True
        if role == "OFFICER":
            if obj.assigned_officer is not None:
                return obj.assigned_officer == request.user
            return True
        if role == "REPORTER":
            if obj.reporter is not None:
                return obj.reporter == request.user
            return False
        return False


class AuditLogMixin:
    def log_audit_create(self, instance):
        _audit_log(self.request, "CREATE", instance=instance)

    def log_audit_update(self, instance, extra=None):
        metadata = extra or {}
        _audit_log(self.request, "UPDATE", instance=instance, metadata=metadata)

    def log_audit_delete(self, instance):
        _audit_log(self.request, "DELETE", instance=instance)


class IsReporterUser(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "REPORTER"
        )


class IsGBVOfficer(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "OFFICER"
        )


class IsAdminUser(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "ADMIN"
        )


class IsAnonymousReporterToken(BasePermission):
    def has_permission(self, request, view):
        if not request.auth:
            return False
        return request.auth.get("actor_type") == "anonymous_reporter"


class IsOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class CustomJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        try:
            user_id = validated_token[jwt_settings.USER_ID_CLAIM]
        except KeyError:
            return AnonymousUser()
        try:
            user = self.user_model.objects.get(**{jwt_settings.USER_ID_FIELD: user_id})
        except self.user_model.DoesNotExist:
            return AnonymousUser()
        if not user.is_active:
            return AnonymousUser()
        if int(validated_token.get("pwd", -1)) != user.password_version:
            return AnonymousUser()
        issued_at = validated_token.get("iat")
        password_changed_at = getattr(user, "password_changed_at", None)
        if issued_at and password_changed_at and int(issued_at) < int(password_changed_at.timestamp()):
            return AnonymousUser()
        return user
