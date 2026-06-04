from django.contrib import admin
from .models import SubscriptionPlan, ClinicSubscription, SubscriptionEvent

@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'price', 'billing_cycle', 'is_active', 'created_at']
    list_filter = ['is_active', 'billing_cycle']
    search_fields = ['name', 'code']
    readonly_fields = ['created_at', 'updated_at', 'created_by']

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ClinicSubscription)
class ClinicSubscriptionAdmin(admin.ModelAdmin):
    list_display = ['clinic', 'plan', 'status', 'next_billing_date', 'trial_end_date', 'created_at']
    list_filter = ['status', 'plan', 'created_at']
    search_fields = ['clinic__name', 'razorpay_subscription_id']
    readonly_fields = ['created_at', 'updated_at', 'created_by']

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(SubscriptionEvent)
class SubscriptionEventAdmin(admin.ModelAdmin):
    list_display = ['event_type', 'clinic_subscription', 'created_at']
    list_filter = ['event_type', 'created_at']
    search_fields = ['event_type', 'clinic_subscription__clinic__name', 'clinic_subscription__razorpay_subscription_id']
    readonly_fields = ['created_at', 'clinic_subscription', 'event_type', 'payload_json']
