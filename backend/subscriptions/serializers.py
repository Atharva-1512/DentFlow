from rest_framework import serializers
from django.utils import timezone
import datetime

class SubscriptionPlanSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    name = serializers.CharField()
    code = serializers.CharField()
    price = serializers.FloatField()
    billing_cycle = serializers.CharField()
    is_active = serializers.BooleanField()


class ClinicSubscriptionSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    clinic = serializers.CharField(required=False, allow_null=True)
    plan = SubscriptionPlanSerializer(read_only=True)
    status = serializers.CharField()
    trial_start_date = serializers.CharField(required=False, allow_null=True)
    trial_end_date = serializers.CharField(required=False, allow_null=True)
    start_date = serializers.CharField(required=False, allow_null=True)
    next_billing_date = serializers.CharField(required=False, allow_null=True)
    grace_period_end_date = serializers.CharField(required=False, allow_null=True)
    cancelled_at = serializers.CharField(required=False, allow_null=True)
    trial_days_remaining = serializers.SerializerMethodField()

    def get_trial_days_remaining(self, obj):
        trial_end_date = None
        if isinstance(obj, dict):
            trial_end_date = obj.get('trial_end_date')
        else:
            trial_end_date = getattr(obj, 'trial_end_date', None)

        if trial_end_date:
            from django.utils.dateparse import parse_datetime, parse_date
            if isinstance(trial_end_date, str):
                dt = parse_datetime(trial_end_date)
                if not dt:
                    d = parse_date(trial_end_date)
                    if d:
                        dt = timezone.make_aware(datetime.datetime.combine(d, datetime.time.min))
            else:
                dt = trial_end_date

            if dt:
                if timezone.is_naive(dt):
                    dt = timezone.make_aware(dt)
                now = timezone.now()
                if dt > now:
                    delta = dt - now
                    return max(delta.days, 0)
        return 0

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        plan_code = None
        if isinstance(instance, dict):
            plan_code = instance.get('plan_code', 'starter')
        else:
            plan_code = getattr(instance, 'plan_code', 'starter')

        plans = {
            'starter': {
                'id': 'starter-plan-id',
                'name': 'Starter Plan (Monthly)',
                'code': 'starter',
                'price': 199.00,
                'billing_cycle': 'monthly',
                'is_active': True
            },
            'starter_quarterly': {
                'id': 'starter-quarterly-plan-id',
                'name': 'Starter Plan (3-Months)',
                'code': 'starter_quarterly',
                'price': 299.00,
                'billing_cycle': 'quarterly',
                'is_active': True
            }
        }
        ret['plan'] = plans.get(plan_code, plans['starter'])
        return ret
