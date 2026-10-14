from django.contrib import admin

from .models import Job


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ("task_name", "status", "attempts", "run_at", "locked_at")
    list_filter = ("status", "task_name")
    search_fields = ("task_name", "idempotency_key", "last_error")
    readonly_fields = ("created_at", "updated_at", "locked_at", "last_error")
