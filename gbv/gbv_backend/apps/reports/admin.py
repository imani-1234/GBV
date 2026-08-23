from django.contrib import admin

from apps.reports.models import Campus, Department, Evidence, IncidentCategory, Report


@admin.register(IncidentCategory)
class IncidentCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "default_priority", "is_active", "created_at")
    list_filter = ("default_priority", "is_active")
    search_fields = ("name",)


@admin.register(Campus)
class CampusAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "code")


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "campus", "code", "is_active", "created_at")
    list_filter = ("campus", "is_active")
    search_fields = ("name", "code", "campus__name")


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = (
        "case_number",
        "status",
        "priority",
        "campus",
        "department",
        "incident_date",
        "created_at",
    )
    list_filter = ("status", "priority", "campus_option", "department_option", "is_active")
    search_fields = ("case_number", "description", "campus", "department")
    readonly_fields = ("case_number",)


@admin.register(Evidence)
class EvidenceAdmin(admin.ModelAdmin):
    list_display = ("id", "report", "file_type", "created_at")
    list_filter = ("file_type",)
