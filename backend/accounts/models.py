import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser

class UserRole(models.TextChoices):
    SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin'
    CLINIC_OWNER = 'CLINIC_OWNER', 'Clinic Owner'

class User(AbstractUser):
    """
    Custom user model for DentFlow SaaS.
    Uses UUID as the primary key and links users to their respective clinic.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.CLINIC_OWNER,
        db_index=True
    )
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='users'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_joined']
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['clinic']),
        ]

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    @property
    def is_super_admin(self):
        return self.role == UserRole.SUPER_ADMIN

    @property
    def is_clinic_owner(self):
        return self.role == UserRole.CLINIC_OWNER
