from django.contrib import admin
from .models import NotificationLog

@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ['recipient_type', 'recipient_value', 'clinic', 'notification_type', 'scheduled_for', 'sent', 'sent_at']
    list_filter = ['clinic', 'recipient_type', 'notification_type', 'sent', 'scheduled_for']
    search_fields = ['recipient_value', 'message']
    readonly_fields = ['created_at', 'updated_at', 'created_by']

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
