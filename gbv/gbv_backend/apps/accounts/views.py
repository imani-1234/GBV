import logging
from urllib.parse import urlencode

import pyotp
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.models import AnonymousReporter, TOTPDevice
from apps.accounts.serializers import (
    AdminPasswordSetSerializer,
    AdminUserSerializer,
    AdminUserWriteSerializer,
    AnonymousLoginSerializer,
    AnonymousRegisterSerializer,
    LogoutSerializer,
    OfficerCreateSerializer,
    OfficerListSerializer,
    PasswordAwareTokenRefreshSerializer,
    PasswordAwareTokenObtainPairSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    TOTPLoginSerializer,
    TOTPVerifySerializer,
    UserSerializer,
)
from apps.core.permissions import IsAdminUser, _audit_log
from apps.core.throttles import AnonymousRegisterRateThrottle, LoginRateThrottle, PasswordResetRateThrottle, RegisterRateThrottle

logger = logging.getLogger(__name__)
User = get_user_model()
PASSWORD_RESET_RESPONSE = {"detail": "If an active account matches this email, reset instructions have been sent."}


def _send_password_reset_email(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    base_url = settings.PASSWORD_RESET_CONFIRM_URL
    separator = "&" if "?" in base_url else "?"
    reset_url = f"{base_url}{separator}{urlencode({'uid': uid, 'token': token})}"
    send_mail(
        subject="Reset your Sauti Yako password",
        message=("A password reset was requested for your Sauti Yako account.\n\n"
                 f"Use this one-time link to choose a new password:\n{reset_url}\n\n"
                 "If you did not request this, no action is needed."),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


@extend_schema(tags=["auth"])
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [RegisterRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({"id": str(user.id), "email": user.email, "full_name": user.full_name}, status=status.HTTP_201_CREATED)


@extend_schema(tags=["auth"])
class AnonymousRegisterView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [AnonymousRegisterRateThrottle]

    def post(self, request):
        serializer = AnonymousRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reporter = serializer.save()
        return Response({"reporter_code": reporter.reporter_code, "message": "Save this code - it will never be shown again"}, status=status.HTTP_201_CREATED)


@extend_schema(tags=["auth"])
class AnonymousLoginView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = AnonymousLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


@extend_schema(tags=["auth"])
class TokenObtainTOTPView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = TOTPLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


@extend_schema(tags=["auth"])
class PasswordAwareTokenRefreshView(TokenRefreshView):
    serializer_class = PasswordAwareTokenRefreshSerializer


@extend_schema(tags=["auth"])
class PasswordAwareTokenObtainPairView(TokenObtainPairView):
    serializer_class = PasswordAwareTokenObtainPairSerializer


@extend_schema(tags=["auth"])
class ProfileView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        return Response(UserSerializer(request.user).data)


@extend_schema(tags=["auth"])
class PasswordChangeView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        _audit_log(request, "PASSWORD_CHANGED", instance=user)
        return Response({"detail": "Password changed. Please sign in again on other devices."})


@extend_schema(tags=["auth"])
class PasswordResetRequestView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=serializer.validated_data["email"], is_active=True).first()
        if user:
            transaction.on_commit(lambda: _send_password_reset_email(user))
        return Response(PASSWORD_RESET_RESPONSE, status=status.HTTP_200_OK)


@extend_schema(tags=["auth"])
class PasswordResetConfirmView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        _audit_log(request, "PASSWORD_RESET", instance=user)
        return Response({"detail": "Password reset successful. You can now sign in."})


@extend_schema(tags=["auth"])
class LogoutView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = LogoutSerializer

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            RefreshToken(serializer.validated_data["refresh_token"]).blacklist()
            return Response({"detail": "Successfully logged out"}, status=status.HTTP_200_OK)
        except (TokenError, InvalidToken):
            return Response({"detail": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["auth"])
class TOTPEnrollView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user
        if not user.requires_totp:
            return Response({"error": "TOTP is only required for OFFICER and ADMIN roles"}, status=status.HTTP_403_FORBIDDEN)
        TOTPDevice.objects.filter(user=user, is_verified=True).delete()
        device, _ = TOTPDevice.objects.update_or_create(user=user, defaults={"secret": pyotp.random_base32(), "is_verified": False})
        provisioning_uri = pyotp.totp.TOTP(device.secret).provisioning_uri(name=user.email, issuer_name="GBV System")
        return Response({"secret": device.secret, "provisioning_uri": provisioning_uri, "qr_code_url": None})


@extend_schema(tags=["auth"])
class TOTPVerifyView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user
        if not user.requires_totp:
            return Response({"error": "TOTP is only required for OFFICER and ADMIN roles"}, status=status.HTTP_403_FORBIDDEN)
        serializer = TOTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        device = TOTPDevice.objects.filter(user=user, is_verified=False).first()
        if not device:
            return Response({"error": "No pending TOTP enrollment found. Call /totp/enroll/ first."}, status=status.HTTP_400_BAD_REQUEST)
        if pyotp.TOTP(device.secret).verify(serializer.validated_data["code"], valid_window=1):
            device.is_verified = True
            device.save(update_fields=["is_verified"])
            return Response({"status": "verified"})
        return Response({"error": "Invalid TOTP code"}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["auth"])
class TOTPStatusView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        return Response({"requires_totp": user.requires_totp, "enrolled": user.requires_totp and TOTPDevice.objects.filter(user=user, is_verified=True).exists()})


class OfficerViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    queryset = User.objects.filter(role=User.Role.OFFICER).order_by("-date_joined")

    def get_serializer_class(self):
        return OfficerListSerializer if self.action == "list" else OfficerCreateSerializer

    def list(self, request):
        return Response(self.get_serializer(self.get_queryset(), many=True).data)

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        _audit_log(request, "USER_CREATED", instance=user, metadata={"role": user.role})
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class UserManagementViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    queryset = User.objects.all().order_by("-created_at")

    def get_serializer_class(self):
        return AdminUserWriteSerializer if self.action in {"create", "update", "partial_update"} else AdminUserSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        role = self.request.query_params.get("role")
        if role:
            queryset = queryset.filter(role=role)
        active = self.request.query_params.get("is_active")
        if active in {"true", "false"}:
            queryset = queryset.filter(is_active=active == "true")
        search = self.request.query_params.get("search")
        if search:
            from django.db.models import Q
            queryset = queryset.filter(Q(full_name__icontains=search) | Q(email__icontains=search))
        return queryset

    def _prevent_admin_lockout(self, target, *, role=None, is_active=None):
        if target == self.request.user and (role not in (None, User.Role.ADMIN) or is_active is False):
            raise ValidationError({"detail": "You cannot remove or deactivate your own administrator access."})
        remains_admin = (target.role == User.Role.ADMIN and (role not in (None, User.Role.ADMIN) or is_active is False))
        if remains_admin and not User.objects.filter(role=User.Role.ADMIN, is_active=True).exclude(pk=target.pk).exists():
            raise ValidationError({"detail": "At least one active administrator account is required."})

    def perform_create(self, serializer):
        user = serializer.save()
        _audit_log(self.request, "USER_CREATED", instance=user, metadata={"role": user.role})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(AdminUserSerializer(serializer.instance).data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        self._prevent_admin_lockout(serializer.instance, role=serializer.validated_data.get("role"), is_active=serializer.validated_data.get("is_active"))
        user = serializer.save()
        _audit_log(self.request, "USER_UPDATED", instance=user, metadata={"role": user.role})

    def destroy(self, request, *args, **kwargs):
        raise MethodNotAllowed("DELETE", detail="Safeguarding accounts are retained for auditability. Deactivate the account instead.")

    @action(detail=True, methods=["patch", "post"])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        self._prevent_admin_lockout(user, is_active=False)
        user.is_active = False
        user.save(update_fields=["is_active", "updated_at"])
        _audit_log(request, "USER_DEACTIVATED", instance=user)
        return Response({"status": "deactivated", "id": str(user.id)})

    @action(detail=True, methods=["patch", "post"])
    def reactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=["is_active", "updated_at"])
        _audit_log(request, "USER_REACTIVATED", instance=user)
        return Response({"status": "reactivated", "id": str(user.id)})

    @action(detail=True, methods=["post"], url_path="set-password")
    def set_password(self, request, pk=None):
        user = self.get_object()
        if user == request.user:
            raise ValidationError({"detail": "Use the authenticated password-change endpoint for your own account."})
        serializer = AdminPasswordSetSerializer(data=request.data, context={"user": user})
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password", "password_changed_at", "password_version", "updated_at"])
        _audit_log(request, "ADMIN_PASSWORD_SET", instance=user)
        return Response({"detail": "Password updated. Existing sessions for this account are no longer valid."})


# Backward-compatible import name used by the existing administrator router.
UserStatusViewSet = UserManagementViewSet
