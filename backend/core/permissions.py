from rest_framework.permissions import BasePermission
from accounts.models import UserRole
from subscriptions.models import SubscriptionStatus, ClinicSubscription
from django.utils import timezone

class SubscriptionAccessPermission(BasePermission):
    """
    DRF Permission to restrict access to protected resources based on clinic subscription status.
    - Super Admins are always allowed.
    - Exempts standard auth, profile, and subscription registration views.
    - Allows ACTIVE & TRIAL subscriptions.
    - Allows PAYMENT_DUE if within the grace period (grace_period_end_date >= today).
    - Blocks EXPIRED, CANCELLED, or invalid subscriptions.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Super Admins bypass subscription verification
        if request.user.role == UserRole.SUPER_ADMIN:
            return True

        # Check path exemption
        exempt_paths = [
            '/api/token/',
            '/api/token/refresh/',
            '/api/subscriptions/current/',
            '/api/subscriptions/create/',
            '/api/webhooks/razorpay/',
            '/api/accounts/me/',
        ]
        
        path = request.path
        if any(path.startswith(exempt) for exempt in exempt_paths):
            return True

        # Resolve request clinic (set by TenantMiddleware)
        clinic = getattr(request, 'clinic', None)
        if not clinic:
            return False

        # Fetch clinic subscription
        try:
            subscription = ClinicSubscription.objects.get(clinic=clinic)
        except ClinicSubscription.DoesNotExist:
            return False

        # Check status logic
        if subscription.status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]:
            return True

        if subscription.status == SubscriptionStatus.PAYMENT_DUE:
            if subscription.grace_period_end_date and subscription.grace_period_end_date >= timezone.now():
                return True

        return False


class TenantIsolationPermission(BasePermission):
    """
    DRF Permission to ensure users can only perform operations on resources matching request.clinic.
    - Super Admins (with or without active impersonation) are allowed.
    - Clinic Owners are only allowed if request.clinic is resolved and is active.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Super admin has global control (or impersonated control)
        if request.user.role == UserRole.SUPER_ADMIN:
            return True

        # Clinic Owners must have a clinic assigned and matching
        clinic = getattr(request, 'clinic', None)
        return clinic is not None and clinic.is_active
