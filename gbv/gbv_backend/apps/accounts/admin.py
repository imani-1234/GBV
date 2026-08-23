from django.contrib import admin

from apps.accounts.models import AnonymousReporter, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("email", "full_name", "role", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_active")
    search_fields = ("email", "full_name")
    ordering = ("-date_joined",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal Info", {"fields": ("full_name", "phone_number")}),
        ("Permissions", {"fields": ("role", "is_staff", "is_superuser", "is_active", "groups", "user_permissions")}),
        ("Important Dates", {"fields": ("last_login", "date_joined")}),
    )
    readonly_fields = ("date_joined", "last_login", "password_changed_at")


@admin.register(AnonymousReporter)
class AnonymousReporterAdmin(admin.ModelAdmin):
    list_display = ("reporter_code", "created_at")
    search_fields = ("reporter_code",)
    readonly_fields = ("reporter_code", "created_at")
