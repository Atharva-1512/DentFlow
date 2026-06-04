from django.db import models
from core.models import AuditModel, TenantModel

class RecipientType(models.TextChoices):
    PATIENT = 'PATIENT', 'Patient'
    CLINIC = 'CLINIC', 'Clinic'

class NotificationType(models.TextChoices):
    PATIENT_SAME_DAY = 'PATIENT_SAME_DAY', 'Patient Same Day Reminder'
    CLINIC_PREV_DAY = 'CLINIC_PREV_DAY', 'Clinic Previous Day Summary'
    CLINIC_SAME_DAY = 'CLINIC_SAME_DAY', 'Clinic Same Day Summary'


class NotificationTemplate(AuditModel):
    """
    Saves message text templates for notifications.
    Can be a global default (clinic=None) or overridden per clinic.
    """
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notification_templates'
    )
    template_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        db_index=True
    )
    subject = models.CharField(max_length=255, blank=True, default='')
    body = models.TextField()

    class Meta:
        ordering = ['template_type']
        constraints = [
            models.UniqueConstraint(
                fields=['clinic', 'template_type'],
                name='unique_clinic_template_type'
            )
        ]

    def __str__(self):
        scope = self.clinic.name if self.clinic else "Global"
        return f"{scope} - {self.get_template_type_display()}"


class NotificationLog(TenantModel):
    """
    Log of automated notification alerts sent (or scheduled) to patients and clinic owners.
    """
    recipient_type = models.CharField(
        max_length=20,
        choices=RecipientType.choices,
        default=RecipientType.PATIENT
    )
    recipient_value = models.CharField(max_length=255)  # Phone number, email, or webhook target
    message = models.TextField()
    scheduled_for = models.DateTimeField(db_index=True)
    sent = models.BooleanField(default=False, db_index=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('PENDING', 'Pending'),
            ('SENT', 'Sent'),
            ('FAILED', 'Failed')
        ],
        default='PENDING',
        db_index=True
    )
    provider_message_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_index=True
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        db_index=True
    )

    class Meta:
        ordering = ['-scheduled_for']
        indexes = [
            models.Index(fields=['clinic', 'sent']),
            models.Index(fields=['scheduled_for', 'sent']),
        ]

    def __str__(self):
        status = "Sent" if self.sent else "Pending"
        return f"{self.notification_type} to {self.recipient_value} - {status}"
