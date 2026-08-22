from django.contrib import admin

from apps.reports.models import Evidence, IncidentCategory, Report


@admin.register(IncidentCategory)
class IncidentCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "default_priority", "is_active", "created_at")
    list_filter = ("default_priority", "is_active")
    search_fields = ("name",)


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
    list_filter = ("status", "priority", "campus", "is_active")
    search_fields = ("case_number", "description", "campus", "department")
    readonly_fields = ("case_number",)


@admin.register(Evidence)
class EvidenceAdmin(admin.ModelAdmin):
    list_display = ("id", "report", "file_type", "created_at")
    list_filter = ("file_type",)
