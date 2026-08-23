import pyotp
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.db import IntegrityError, transaction
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.settings import api_settings as jwt_settings

from apps.accounts.models import AnonymousReporter, TOTPDevice
from apps.core.utils import generate_reporter_code

User = get_user_model()


def tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    refresh["pwd"] = user.password_version
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


class PasswordValidationMixin:
    def validate_password(self, value):
        candidate = self.instance or User(
            email=self.initial_data.get("email", ""),
            full_name=self.initial_data.get("full_name", ""),
        )
        validate_password(value, candidate)
        return value


class RegisterSerializer(PasswordValidationMixin, serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "phone_number", "password")
        read_only_fields = ("id",)

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(**validated_data, password=password, role=User.Role.REPORTER)


class AnonymousRegisterSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, min_length=8)
    reporter_code = serializers.CharField(read_only=True)

    def create(self, validated_data):
        # A database-level unique constraint is authoritative. Retrying the
        # create inside a transaction handles the tiny race between generating
        # a code and persisting it without exposing a collision to the reporter.
        for _ in range(32):
            try:
                with transaction.atomic():
                    return AnonymousReporter.objects.create(
                        reporter_code=generate_reporter_code(),
                        hashed_password=make_password(validated_data["password"]),
                    )
            except IntegrityError:
                continue
        raise serializers.ValidationError(
            {"detail": "We could not create an anonymous Reporter Code right now. Please try again."}
        )


class AnonymousLoginSerializer(serializers.Serializer):
    reporter_code = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        try:
            reporter = AnonymousReporter.objects.get(reporter_code=data["reporter_code"])
        except AnonymousReporter.DoesNotExist:
            raise serializers.ValidationError("Invalid reporter code or password")
        if not check_password(data["password"], reporter.hashed_password):
            raise serializers.ValidationError("Invalid reporter code or password")
        refresh = RefreshToken()
        refresh["actor_type"] = "anonymous_reporter"
        refresh["reporter_code"] = reporter.reporter_code
        return {"refresh": str(refresh), "access": str(refresh.access_token)}


class UserSerializer(serializers.ModelSerializer):
    requires_totp = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "phone_number", "role", "is_active", "requires_totp", "date_joined", "created_at")
        read_only_fields = ("id", "role", "is_active", "requires_totp", "date_joined", "created_at")


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "full_name", "phone_number", "role", "is_active", "is_staff", "date_joined", "created_at", "updated_at", "password_changed_at")
        read_only_fields = ("id", "date_joined", "created_at", "updated_at", "password_changed_at")


class AdminUserWriteSerializer(PasswordValidationMixin, serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = User
        fields = ("email", "full_name", "phone_number", "role", "is_active", "password")

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "A password is required when creating a user."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        role = validated_data.get("role", User.Role.REPORTER)
        validated_data["is_staff"] = role == User.Role.ADMIN
        return User.objects.create_user(**validated_data, password=password)

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attribute, value in validated_data.items():
            setattr(instance, attribute, value)
        instance.is_staff = instance.role == User.Role.ADMIN
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class OfficerCreateSerializer(PasswordValidationMixin, serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "phone_number", "password")
        read_only_fields = ("id",)

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(**validated_data, password=password, role=User.Role.OFFICER)


class OfficerListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "full_name", "phone_number", "is_active", "date_joined")


class LogoutSerializer(serializers.Serializer):
    refresh_token = serializers.CharField()


class PasswordChangeSerializer(PasswordValidationMixin, serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError({"current_password": "Current password is incorrect."})
        validate_password(attrs["new_password"], user)
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password", "password_changed_at", "password_version", "updated_at"])
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(PasswordValidationMixin, serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(attrs["uid"])))
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            raise serializers.ValidationError({"token": "This reset link is invalid or has expired."})
        if not user.is_active or not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError({"token": "This reset link is invalid or has expired."})
        validate_password(attrs["new_password"], user)
        attrs["user"] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password", "password_changed_at", "password_version", "updated_at"])
        return user


class AdminPasswordSetSerializer(PasswordValidationMixin, serializers.Serializer):
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        validate_password(attrs["new_password"], self.context["user"])
        return attrs


class TOTPLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    totp_code = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        try:
            user = User.objects.get(email=data.get("email"))
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid credentials")
        if not user.check_password(data.get("password")):
            raise serializers.ValidationError("Invalid credentials")
        if not user.is_active:
            raise serializers.ValidationError("Account is disabled")
        if not user.requires_totp:
            return tokens_for_user(user)
        totp_code = data.get("totp_code", "")
        if not totp_code:
            return {"requires_totp": True, "detail": "TOTP code required"}
        device = TOTPDevice.objects.filter(user=user, is_verified=True).first()
        if not device:
            return {"requires_totp": True, "detail": "TOTP not enrolled. Call /auth/totp/enroll/ first."}
        if not pyotp.TOTP(device.secret).verify(totp_code, valid_window=1):
            raise serializers.ValidationError("Invalid TOTP code")
        return tokens_for_user(user)


class PasswordAwareTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["pwd"] = user.password_version
        return token


class PasswordAwareTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        refresh = RefreshToken(attrs["refresh"])
        try:
            user = User.objects.get(pk=refresh[jwt_settings.USER_ID_CLAIM])
        except (User.DoesNotExist, KeyError):
            raise InvalidToken({"detail": "Token is invalid or expired", "code": "token_not_valid"})
        if not user.is_active or int(refresh.get("pwd", -1)) != user.password_version:
            raise InvalidToken({"detail": "Token is invalid or expired", "code": "token_not_valid"})
        return super().validate(attrs)


class TOTPVerifySerializer(serializers.Serializer):
    code = serializers.CharField(min_length=6, max_length=6)


class TOTPEnrollSerializer(serializers.Serializer):
    pass
