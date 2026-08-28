from django.contrib.auth.backends import ModelBackend
from core.mongodb import get_users_by_identifier, get_user_by_email_or_username
from django.contrib.auth.hashers import check_password

class EmailOrUsernameModelBackend(ModelBackend):
    """
    Custom authentication backend to allow logging in using:
    - Username
    - Email address
    - Clinic Name
    - Clinic Slug
    - Mobile / WhatsApp Number
    Querying MongoDB with SQL fallback.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get('email') or kwargs.get('username')
        
        if not username or not password:
            return None
            
        clean_username = str(username).strip()
        
        # 1. Check all candidate MongoDB users matching the identifier
        candidate_users = get_users_by_identifier(clean_username)
        for user in candidate_users:
            if check_password(password, user.doc.get('password')) and self.user_can_authenticate(user):
                return user
                
        # 2. SQL user fallback
        try:
            import re
            from django.contrib.auth import get_user_model
            from django.db.models import Q
            UserModel = get_user_model()
            alphanumeric = re.sub(r'[^a-zA-Z0-9]', '', clean_username.lower())
            
            sql_users = UserModel.objects.filter(
                Q(username__iexact=clean_username) | 
                Q(email__iexact=clean_username) |
                Q(clinic__name__iexact=clean_username) |
                Q(clinic__slug__iexact=clean_username) |
                Q(username__iexact=alphanumeric)
            )
            for sql_u in sql_users:
                if sql_u.check_password(password) and self.user_can_authenticate(sql_u):
                    return sql_u
        except Exception:
            pass

        return None

    def user_can_authenticate(self, user):
        return getattr(user, 'is_active', True)
