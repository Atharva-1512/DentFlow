import logging
from django.utils.functional import SimpleLazyObject
from django.core.exceptions import PermissionDenied, ValidationError
from rest_framework_simplejwt.authentication import JWTAuthentication

logger = logging.getLogger('dentflow.security')

def get_clinic_for_request(request):
    """
    Evaluates and caches the active clinic context for a request.
    Caching: Checks request._cached_user to reuse verified authentication objects
    across middleware and view filters, eliminating double DB calls.
    """
    if not hasattr(request, '_cached_clinic'):
        # Check request-level user cache first
        user = getattr(request, '_cached_user', None)
        
        if not user or not user.is_authenticated:
            # Check standard django request.user (e.g. session auth in admin)
            if hasattr(request, 'user') and request.user.is_authenticated:
                user = request.user
                request._cached_user = user
            else:
                try:
                    authenticator = JWTAuthentication()
                    header = authenticator.get_header(request)
                    if header:
                        raw_token = authenticator.get_raw_token(header)
                        if raw_token:
                            validated_token = authenticator.get_validated_token(raw_token)
                            user = authenticator.get_user(validated_token)
                            request.user = user
                            request._cached_user = user
                except Exception as e:
                    logger.warning(f"TenantMiddleware JWT authentication failure: {str(e)}")
                    pass

        if not user or not user.is_authenticated:
            request._cached_clinic = None
            return request._cached_clinic

        from accounts.models import UserRole
        from clinics.models import Clinic

        if user.role == UserRole.SUPER_ADMIN:
            impersonate_id = request.headers.get('X-Impersonate-Clinic')
            if impersonate_id:
                try:
                    clinic = Clinic.objects.get(id=impersonate_id)
                    request._cached_clinic = clinic
                except (Clinic.DoesNotExist, ValueError, ValidationError) as e:
                    logger.warning(f"Impersonation failure by Super Admin: {str(e)}")
                    raise PermissionDenied("Invalid impersonation clinic ID.")
            else:
                request._cached_clinic = None
        else:
            request._cached_clinic = user.clinic

    return request._cached_clinic


class TenantMiddleware:
    """
    Middleware that attaches 'clinic' lazy property to incoming request.
    Allows easy, secure, and thread-safe multi-tenant clinic lookup.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.clinic = SimpleLazyObject(lambda: get_clinic_for_request(request))
        return self.get_response(request)
