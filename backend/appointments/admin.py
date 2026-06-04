from django.contrib import admin
from .models import Appointment

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ['patient', 'clinic', 'appointment_date', 'appointment_time', 'consulting_doctor', 'appointment_type', 'status']
    list_filter = ['clinic', 'status', 'appointment_type', 'appointment_date']
    search_fields = ['patient__full_name', 'consulting_doctor', 'appointment_reason']
    readonly_fields = ['created_at', 'updated_at', 'created_by']

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
