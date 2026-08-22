from django.contrib import admin

from apps.cases.models import Case, CaseNote, InformationRequest


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ("id", "report", "status", "priority", "assigned_officer", "opened_at", "closed_at")
    list_filter = ("status", "priority", "is_active")
    search_fields = ("report__case_number", "resolution_summary")
    readonly_fields = ("opened_at",)


@admin.register(CaseNote)
class CaseNoteAdmin(admin.ModelAdmin):
    list_display = ("id", "case", "author", "is_internal", "created_at")
    list_filter = ("is_internal",)


@admin.register(InformationRequest)
class InformationRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "case", "requested_by", "status", "responded_at", "created_at")
    list_filter = ("status",)
