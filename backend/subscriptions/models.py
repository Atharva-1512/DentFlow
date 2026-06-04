from django.db import models
from core.models import UUIDModel, AuditModel

class SubscriptionStatus(models.TextChoices):
    TRIAL = 'TRIAL', 'Trial'
    ACTIVE = 'ACTIVE', 'Active'
    PAYMENT_DUE = 'PAYMENT_DUE', 'Payment Due'
    EXPIRED = 'EXPIRED', 'Expired'
    CANCELLED = 'CANCELLED', 'Cancelled'


class SubscriptionPlan(AuditModel):
    """
    Represents the pricing plans available for the SaaS.
    """
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    billing_cycle = models.CharField(max_length=50, default='monthly')  # e.g., monthly, yearly
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['price']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.price} / {self.billing_cycle})"


class ClinicSubscription(AuditModel):
    """
    Tracks the subscription state of a specific Clinic (Tenant).
    Each Clinic has one current subscription context.
    """
    clinic = models.OneToOneField(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='subscription'
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name='clinic_subscriptions'
    )
    razorpay_plan_id = models.CharField(max_length=100, null=True, blank=True)
    razorpay_subscription_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        unique=True,
        db_index=True
    )
    status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.TRIAL,
        db_index=True
    )
    trial_start_date = models.DateField(null=True, blank=True)
    # Changed to timezone-aware DateTimeField
    trial_end_date = models.DateTimeField(null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    next_billing_date = models.DateField(null=True, blank=True)
    # Changed to timezone-aware DateTimeField
    grace_period_end_date = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['razorpay_subscription_id']),
        ]

    def __str__(self):
        return f"{self.clinic.name} - {self.plan.name} ({self.status})"


class SubscriptionEvent(UUIDModel):
    """
    Audit log for storing raw webhook event payloads received from Razorpay.
    Includes unique event deduplication check.
    """
    clinic_subscription = models.ForeignKey(
        ClinicSubscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events'
    )
    event_type = models.CharField(max_length=100)
    # Added unique razorpay_event_id for event deduplication
    razorpay_event_id = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
        db_index=True
    )
    payload_json = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event_type']),
            models.Index(fields=['created_at']),
            models.Index(fields=['razorpay_event_id']),
        ]

    def __str__(self):
        return f"Event {self.event_type} (ID: {self.razorpay_event_id}) at {self.created_at}"
