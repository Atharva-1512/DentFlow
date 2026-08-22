from django.contrib.auth.backends import ModelBackend
from core.mongodb import get_user_by_email_or_username
from django.contrib.auth.hashers import check_password

class EmailOrUsernameModelBackend(ModelBackend):
    """
    Custom authentication backend to allow logging in using either
    the username or the email address, querying MongoDB.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get('email') or kwargs.get('username')
        
        if not username:
            return None
            
        user = get_user_by_email_or_username(username)
        if not user:
            return None
        
        if check_password(password, user.doc.get('password')) and self.user_can_authenticate(user):
            return user
        return None

    def user_can_authenticate(self, user):
        return user.is_active
