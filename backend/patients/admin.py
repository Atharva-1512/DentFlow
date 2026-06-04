from django.contrib import admin
from .models import Patient

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'clinic', 'mobile_number', 'age', 'gender', 'consulting_doctor_name', 'created_date']
    list_filter = ['clinic', 'gender', 'created_date']
    search_fields = ['full_name', 'mobile_number', 'consulting_doctor_name']
    readonly_fields = ['created_at', 'updated_at', 'created_by']

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
