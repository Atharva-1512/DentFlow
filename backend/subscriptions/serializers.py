from rest_framework import serializers
from django.utils import timezone
from .models import SubscriptionPlan, ClinicSubscription

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = ['id', 'name', 'code', 'price', 'billing_cycle', 'is_active']


class ClinicSubscriptionSerializer(serializers.ModelSerializer):
    plan = SubscriptionPlanSerializer(read_only=True)
    trial_days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = ClinicSubscription
        fields = [
            'id', 'clinic', 'plan', 'status', 
            'trial_start_date', 'trial_end_date', 
            'start_date', 'next_billing_date', 
            'grace_period_end_date', 'cancelled_at',
            'trial_days_remaining'
        ]

    def get_trial_days_remaining(self, obj):
        if obj.trial_end_date:
            now = timezone.now()
            if obj.trial_end_date > now:
                delta = obj.trial_end_date - now
                return max(delta.days, 0)
        return 0
