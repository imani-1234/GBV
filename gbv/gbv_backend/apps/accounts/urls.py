from django.urls import include, path
from rest_framework_simplejwt.views import TokenVerifyView

from apps.accounts.views import (
    AnonymousLoginView,
    AnonymousRegisterView,
    LogoutView,
    PasswordAwareTokenRefreshView,
    PasswordAwareTokenObtainPairView,
    PasswordChangeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ProfileView,
    RegisterView,
    TOTPEnrollView,
    TOTPStatusView,
    TOTPVerifyView,
    TokenObtainTOTPView,
)

app_name = "accounts"

urlpatterns = [
    # JWT endpoints (use token/ for REPORTER-only; login/ for TOTP-aware login)
    path("token/", PasswordAwareTokenObtainPairView.as_view(), name="token-obtain"),
    path("token/refresh/", PasswordAwareTokenRefreshView.as_view(), name="token-refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token-verify"),
    # TOTP-secured login (required for OFFICER/ADMIN)
    path("login/", TokenObtainTOTPView.as_view(), name="totp-login"),
    # Registration
    path("register/", RegisterView.as_view(), name="register"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("password/change/", PasswordChangeView.as_view(), name="password-change"),
    path("password/reset/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password/reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path(
        "anonymous/register/",
        AnonymousRegisterView.as_view(),
        name="anonymous-register",
    ),
    path(
        "anonymous/login/",
        AnonymousLoginView.as_view(),
        name="anonymous-login",
    ),
    # Logout
    path("logout/", LogoutView.as_view(), name="logout"),
    # TOTP management
    path("totp/enroll/", TOTPEnrollView.as_view(), name="totp-enroll"),
    path("totp/verify/", TOTPVerifyView.as_view(), name="totp-verify"),
    path("totp/status/", TOTPStatusView.as_view(), name="totp-status"),
]
