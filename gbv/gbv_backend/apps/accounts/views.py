import pyotp
from django.contrib.auth import get_user_model
from django.db.models import Q
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action, throttle_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView

from apps.accounts.models import AnonymousReporter, TOTPDevice
from apps.accounts.serializers import (
    AnonymousLoginSerializer,
    AnonymousRegisterSerializer,
    LogoutSerializer,
    OfficerCreateSerializer,
    OfficerListSerializer,
    RegisterSerializer,
    TOTPEnrollSerializer,
    TOTPLoginSerializer,
    TOTPVerifySerializer,
    UserSerializer,
)
from apps.core.permissions import IsAdminUser
from apps.core.throttles import (
    AnonymousRegisterRateThrottle,
    LoginRateThrottle,
    RegisterRateThrottle,
)

User = get_user_model()


@extend_schema(tags=["auth"])
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [RegisterRateThrottle]

    @extend_schema(
        summary="Register a new user",
        description="Create a REPORTER account with email and password",
        request=RegisterSerializer,
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["auth"])
class AnonymousRegisterView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [AnonymousRegisterRateThrottle]

    @extend_schema(
        summary="Register anonymous reporter",
        description="Create an anonymous reporter identity (no email/password)",
        request=AnonymousRegisterSerializer,
    )
    def post(self, request):
        serializer = AnonymousRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reporter = serializer.save()
        return Response(
            {
                "reporter_code": reporter.reporter_code,
                "message": "Save this code - it will never be shown again",
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["auth"])
class AnonymousLoginView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [LoginRateThrottle]

    @extend_schema(
        summary="Login as anonymous reporter",
        description="Exchange reporter_code + password for JWT tokens",
        request=AnonymousLoginSerializer,
    )
    def post(self, request):
        serializer = AnonymousLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


@extend_schema(tags=["auth"])
class TokenObtainTOTPView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [LoginRateThrottle]

    @extend_schema(
        summary="Login with TOTP support",
        description="Returns tokens directly for REPORTER; requires totp_code for OFFICER/ADMIN",
        request=TOTPLoginSerializer,
    )
    def post(self, request):
        serializer = TOTPLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


@extend_schema(tags=["auth"])
class ProfileView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        summary="Get current user profile",
        description="Returns the authenticated user's profile data",
        responses={200: UserSerializer},
    )
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


@extend_schema(tags=["auth"])
class LogoutView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = LogoutSerializer

    @extend_schema(
        summary="Logout and blacklist refresh token",
        description="Blacklists the provided refresh token so it cannot be used again",
        request=LogoutSerializer,
    )
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            refresh_token = serializer.validated_data["refresh_token"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Successfully logged out"}, status=status.HTTP_200_OK)
        except (TokenError, InvalidToken):
            return Response(
                {"detail": "Invalid or expired token"},
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(tags=["auth"])
class TOTPEnrollView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        summary="Enroll in TOTP 2FA",
        description="Generate a TOTP secret and provisioning URI for authenticator apps. Only OFFICER/ADMIN.",
    )
    def post(self, request):
        user = request.user
        if not user.requires_totp:
            return Response(
                {"error": "TOTP is only required for OFFICER and ADMIN roles"},
                status=status.HTTP_403_FORBIDDEN,
            )
        TOTPDevice.objects.filter(user=user, is_verified=True).delete()
        secret = pyotp.random_base32()
        device, created = TOTPDevice.objects.update_or_create(
            user=user,
            defaults={"secret": secret, "is_verified": False},
        )
        issuer = "GBV System"
        provisioning_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user.email,
            issuer_name=issuer,
        )
        return Response(
            {
                "secret": secret,
                "provisioning_uri": provisioning_uri,
                "qr_code_url": None,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["auth"])
class TOTPVerifyView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        summary="Verify TOTP enrollment",
        description="Submit a 6-digit TOTP code to verify the enrolled device",
        request=TOTPVerifySerializer,
    )
    def post(self, request):
        user = request.user
        if not user.requires_totp:
            return Response(
                {"error": "TOTP is only required for OFFICER and ADMIN roles"},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = TOTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data["code"]
        device = TOTPDevice.objects.filter(user=user, is_verified=False).first()
        if not device:
            return Response(
                {"error": "No pending TOTP enrollment found. Call /totp/enroll/ first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        totp = pyotp.TOTP(device.secret)
        if totp.verify(code, valid_window=1):
            device.is_verified = True
            device.save(update_fields=["is_verified"])
            return Response({"status": "verified"}, status=status.HTTP_200_OK)
        return Response(
            {"error": "Invalid TOTP code"},
            status=status.HTTP_400_BAD_REQUEST,
        )


@extend_schema(tags=["auth"])
class TOTPStatusView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        summary="Check TOTP enrollment status",
        description="Returns whether the current user requires TOTP and whether they are enrolled",
    )
    def get(self, request):
        user = request.user
        if not user.requires_totp:
            return Response({"requires_totp": False, "enrolled": False})
        enrolled = TOTPDevice.objects.filter(user=user, is_verified=True).exists()
        return Response({"requires_totp": True, "enrolled": enrolled})


# ── Admin User-Management Views ────────────────────────────────────


class OfficerViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    queryset = User.objects.filter(role=User.Role.OFFICER).order_by("-date_joined")

    def get_serializer_class(self):
        if self.action == "list":
            from apps.accounts.serializers import OfficerListSerializer
            return OfficerListSerializer
        return OfficerCreateSerializer

    @extend_schema(summary="List all officers")
    def list(self, request):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Create a new officer",
        request=OfficerCreateSerializer,
    )
    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class UserStatusViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    queryset = User.objects.all()
    serializer_class = UserSerializer

    @extend_schema(
        summary="List all users",
        description="Admin-only paginated user list with optional search and role filters",
        parameters=[
            OpenApiParameter("search", str, description="Filter by name or email (partial)"),
            OpenApiParameter("role", str, description="Filter by role: REPORTER, OFFICER, ADMIN"),
        ],
    )
    def list(self, request):
        queryset = self.get_queryset()
        role = request.query_params.get("role")
        if role:
            queryset = queryset.filter(role=role)
        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(Q(full_name__icontains=search) | Q(email__icontains=search))
        queryset = queryset.order_by("-created_at")
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @extend_schema(summary="Deactivate a user account")
    @action(detail=True, methods=["patch", "post"])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=["is_active"])
        return Response({"status": "deactivated", "id": str(user.id)})

    @extend_schema(summary="Reactivate a user account")
    @action(detail=True, methods=["patch", "post"])
    def reactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=["is_active"])
        return Response({"status": "reactivated", "id": str(user.id)})
