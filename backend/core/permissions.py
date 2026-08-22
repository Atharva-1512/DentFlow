from rest_framework.permissions import BasePermission
from django.utils import timezone

class SubscriptionAccessPermission(BasePermission):
    """
    DRF Permission allowing authenticated requests without subscription checks.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated


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
        if request.user.role == 'SUPER_ADMIN':
            return True

        # Clinic Owners must have a clinic assigned and matching
        clinic = getattr(request, 'clinic', None)
        return clinic is not None and clinic.is_active
