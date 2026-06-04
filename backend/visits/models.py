from django.db import models
from django.utils import timezone
from core.models import TenantModel, SoftDeleteModel, TenantSoftDeleteManager

class Visit(TenantModel, SoftDeleteModel):
    """
    A completed consultation log for a patient, with soft-delete support.
    """
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='visits'
    )
    visit_date = models.DateTimeField(default=timezone.now, db_index=True)
    consulting_doctor = models.CharField(max_length=255)
    diagnosis = models.TextField()
    treatment_given = models.TextField()
    prescription_notes = models.TextField(blank=True, default='')
    general_notes = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, default='COMPLETED')

    # Attach TenantSoftDeleteManager explicitly
    objects = TenantSoftDeleteManager()

    class Meta:
        ordering = ['-visit_date']
        indexes = [
            models.Index(fields=['clinic', 'patient']),
            models.Index(fields=['visit_date']),
            models.Index(fields=['is_deleted']),
        ]

    def __str__(self):
        return f"Visit for {self.patient.full_name} on {self.visit_date.date()}"
