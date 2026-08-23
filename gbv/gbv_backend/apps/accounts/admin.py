from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import BaseUserCreationForm, UserChangeForm

from apps.accounts.models import AnonymousReporter, User


class SautiYakoUserChangeForm(UserChangeForm):
    """Uses Django's read-only password summary and its dedicated change form."""

    class Meta(UserChangeForm.Meta):
        model = User


class SautiYakoUserCreationForm(BaseUserCreationForm):
    class Meta(BaseUserCreationForm.Meta):
        model = User
        fields = ("email", "full_name", "phone_number", "role")


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = SautiYakoUserChangeForm
    add_form = SautiYakoUserCreationForm
    list_display = ("email", "full_name", "role", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_active")
    search_fields = ("email", "full_name")
    ordering = ("-date_joined",)
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "full_name", "phone_number", "role", "password1", "password2"),
            },
        ),
    )
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal Info", {"fields": ("full_name", "phone_number")}),
        ("Permissions", {"fields": ("role", "is_staff", "is_superuser", "is_active", "groups", "user_permissions")}),
        ("Important Dates", {"fields": ("last_login", "date_joined", "password_changed_at")}),
    )
    readonly_fields = ("date_joined", "last_login", "password_changed_at")


@admin.register(AnonymousReporter)
class AnonymousReporterAdmin(admin.ModelAdmin):
    list_display = ("reporter_code", "created_at")
    search_fields = ("reporter_code",)
    readonly_fields = ("reporter_code", "created_at")
