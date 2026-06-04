from django.db import models
from core.models import TenantModel, SoftDeleteModel, TenantSoftDeleteManager

class GenderChoices(models.TextChoices):
    MALE = 'M', 'Male'
    FEMALE = 'F', 'Female'
    OTHER = 'O', 'Other'

class Patient(TenantModel, SoftDeleteModel):
    """
    Patient represents a clinic's client profile and consultation records.
    Owned by a specific Clinic (tenant), with soft-delete support.
    """
    full_name = models.CharField(max_length=255)
    age = models.IntegerField()
    gender = models.CharField(
        max_length=5,
        choices=GenderChoices.choices,
        default=GenderChoices.MALE
    )
    mobile_number = models.CharField(max_length=20, db_index=True)
    address = models.TextField(blank=True, default='')
    consulting_doctor_name = models.CharField(max_length=255, blank=True, default='')
    chief_complaint = models.TextField(blank=True, default='')
    notes = models.TextField(blank=True, default='')
    created_date = models.DateField(auto_now_add=True, db_index=True)

    # Attach TenantSoftDeleteManager explicitly
    objects = TenantSoftDeleteManager()

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['clinic', 'mobile_number']),
            models.Index(fields=['clinic', 'full_name']),
            models.Index(fields=['created_date']),
            models.Index(fields=['is_deleted']),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.clinic.name})"
