from rest_framework import viewsets
from accounts.models import UserRole
from .permissions import TenantIsolationPermission, SubscriptionAccessPermission

class TenantViewSetMixin:
    """
    Base viewset mixin for multi-tenant database operations.
    - Enforces TenantIsolationPermission and SubscriptionAccessPermission checks.
    - Scopes list/retrieve database query queries strictly to request.clinic.
    - Forces injected clinic tenant context mapping upon entity creation.
    """
    permission_classes = [TenantIsolationPermission, SubscriptionAccessPermission]

    def get_queryset(self):
        queryset = super().get_queryset()
        clinic = getattr(self.request, 'clinic', None)
        
        # If Super Admin has no impersonation context: return global listings
        if self.request.user and self.request.user.role == UserRole.SUPER_ADMIN:
            if clinic:
                return queryset.filter(clinic=clinic)
            return queryset
            
        # Regular clinic owner: lock context to active clinic tenant
        return queryset.filter(clinic=clinic)

    def perform_create(self, serializer):
        # Automatically attach the resolved clinic tenant context on creation
        serializer.save(clinic=self.request.clinic)
