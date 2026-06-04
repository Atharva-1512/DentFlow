from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """
    Admin configuration for Custom User Model.
    """
    model = User
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'clinic', 'is_staff', 'is_active']
    list_filter = ['role', 'is_staff', 'is_active', 'clinic']
    fieldsets = UserAdmin.fieldsets + (
        ('DentFlow SaaS Details', {'fields': ('role', 'clinic')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('DentFlow SaaS Details', {'fields': ('role', 'clinic')}),
    )
    search_fields = ['username', 'email', 'first_name', 'last_name', 'clinic__name']
