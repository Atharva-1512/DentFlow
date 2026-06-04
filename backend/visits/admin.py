from django.contrib import admin
from .models import Visit

@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display = ['patient', 'clinic', 'consulting_doctor', 'visit_date', 'status']
    list_filter = ['clinic', 'status', 'visit_date']
    search_fields = ['patient__full_name', 'consulting_doctor', 'diagnosis']
    readonly_fields = ['created_at', 'updated_at', 'created_by']

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
