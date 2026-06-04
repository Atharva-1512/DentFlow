from django.db import models
from core.models import TenantModel, SoftDeleteModel, TenantSoftDeleteManager

class AppointmentType(models.TextChoices):
    CONSULTATION = 'CONSULTATION', 'Consultation'
    PROCEDURE = 'PROCEDURE', 'Procedure'
    FOLLOW_UP = 'FOLLOW_UP', 'Follow Up'
    EMERGENCY = 'EMERGENCY', 'Emergency'

class AppointmentStatus(models.TextChoices):
    SCHEDULED = 'SCHEDULED', 'Scheduled'
    COMPLETED = 'COMPLETED', 'Completed'
    CANCELLED = 'CANCELLED', 'Cancelled'

class Appointment(TenantModel, SoftDeleteModel):
    """
    Tracks future or completed scheduled appointments, with soft-delete support.
    """
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='appointments'
    )
    appointment_date = models.DateField(db_index=True)
    appointment_time = models.TimeField()
    consulting_doctor = models.CharField(max_length=255)
    appointment_type = models.CharField(
        max_length=25,
        choices=AppointmentType.choices,
        default=AppointmentType.CONSULTATION,
        db_index=True
    )
    appointment_reason = models.TextField(blank=True, default='')
    status = models.CharField(
        max_length=20,
        choices=AppointmentStatus.choices,
        default=AppointmentStatus.SCHEDULED,
        db_index=True
    )

    # Attach TenantSoftDeleteManager explicitly
    objects = TenantSoftDeleteManager()

    class Meta:
        ordering = ['appointment_date', 'appointment_time']
        indexes = [
            models.Index(fields=['clinic', 'appointment_date']),
            models.Index(fields=['clinic', 'status']),
            models.Index(fields=['appointment_date', 'appointment_time']),
            models.Index(fields=['is_deleted']),
        ]

    def __str__(self):
        return f"{self.patient.full_name} - {self.appointment_date} {self.appointment_time} ({self.status})"
