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
    patient_id = models.CharField(max_length=50, blank=True, null=True, db_index=True)
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

    def save(self, *args, **kwargs):
        if not self.patient_id:
            import re
            # Find the patient with the highest ID sequence for this clinic
            last_patient = Patient.objects.all_with_deleted().filter(
                clinic=self.clinic,
                patient_id__isnull=False
            ).order_by('-created_at').first()
            
            next_num = 1
            if last_patient and last_patient.patient_id:
                match = re.search(r'\d+', last_patient.patient_id)
                if match:
                    next_num = int(match.group()) + 1
            self.patient_id = f"PAT-{next_num:04d}"
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.clinic.name})"
