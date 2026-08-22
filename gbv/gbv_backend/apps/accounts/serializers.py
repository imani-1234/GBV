import pyotp
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import AnonymousReporter, TOTPDevice
from apps.core.utils import generate_reporter_code

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "phone_number", "password")
        read_only_fields = ("id",)

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(
            **validated_data,
            password=password,
            role=User.Role.REPORTER,
        )
        return user


class AnonymousRegisterSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, min_length=8)
    reporter_code = serializers.CharField(read_only=True)

    def create(self, validated_data):
        code_gen = generate_reporter_code()
        for attempt in range(10):
            code = next(code_gen)
            if not AnonymousReporter.objects.filter(reporter_code=code).exists():
                break
        else:
            raise serializers.ValidationError("Could not generate unique code")
        reporter = AnonymousReporter.objects.create(
            reporter_code=code,
            hashed_password=make_password(validated_data["password"]),
        )
        return reporter


class AnonymousLoginSerializer(serializers.Serializer):
    reporter_code = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        try:
            reporter = AnonymousReporter.objects.get(
                reporter_code=data["reporter_code"]
            )
        except AnonymousReporter.DoesNotExist:
            raise serializers.ValidationError(
                "Invalid reporter code or password"
            )
        if not check_password(data["password"], reporter.hashed_password):
            raise serializers.ValidationError(
                "Invalid reporter code or password"
            )
        refresh = RefreshToken()
        refresh["actor_type"] = "anonymous_reporter"
        refresh["reporter_code"] = reporter.reporter_code
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }


class UserSerializer(serializers.ModelSerializer):
    requires_totp = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "phone_number", "role", "is_active", "requires_totp", "date_joined", "created_at")
        read_only_fields = ("id", "role", "is_active", "requires_totp", "date_joined", "created_at")


class OfficerCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "phone_number", "password")
        read_only_fields = ("id",)

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(
            **validated_data,
            password=password,
            role=User.Role.OFFICER,
        )
        return user


class OfficerListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "full_name", "phone_number", "is_active", "date_joined")


class LogoutSerializer(serializers.Serializer):
    refresh_token = serializers.CharField()


class TOTPLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    totp_code = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        email = data.get("email")
        password = data.get("password")
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid credentials")

        if not user.check_password(password):
            raise serializers.ValidationError("Invalid credentials")

        if not user.is_active:
            raise serializers.ValidationError("Account is disabled")

        if not user.requires_totp:
            refresh = RefreshToken.for_user(user)
            return {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            }

        totp_code = data.get("totp_code", "")
        if not totp_code:
            return {"requires_totp": True, "detail": "TOTP code required"}

        device = TOTPDevice.objects.filter(user=user, is_verified=True).first()
        if not device:
            return {
                "requires_totp": True,
                "detail": "TOTP not enrolled. Call /auth/totp/enroll/ first.",
            }

        totp = pyotp.TOTP(device.secret)
        if not totp.verify(totp_code, valid_window=1):
            raise serializers.ValidationError("Invalid TOTP code")

        refresh = RefreshToken.for_user(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }


class TOTPVerifySerializer(serializers.Serializer):
    code = serializers.CharField(min_length=6, max_length=6)


class TOTPEnrollSerializer(serializers.Serializer):
    pass
