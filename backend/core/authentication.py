from rest_framework_simplejwt.authentication import JWTAuthentication

class CachedJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication subclass that avoids duplicate user retrieval queries.
    Reuses '_cached_user' attached to the Django request object by TenantMiddleware.
    """
    def authenticate(self, request):
        django_request = request._request
        cached_user = getattr(django_request, '_cached_user', None)
        
        if cached_user and cached_user.is_authenticated:
            # Return cached user and dummy auth object
            return (cached_user, None)
            
        # Fallback to standard JWT check
        auth_result = super().authenticate(request)
        if auth_result:
            django_request._cached_user = auth_result[0]
            
        return auth_result
