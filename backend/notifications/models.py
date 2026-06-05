from django.db import models
from core.models import AuditModel, TenantModel


# ─── Enums ────────────────────────────────────────────────────────────────────

class RecipientType(models.TextChoices):
    PATIENT = 'PATIENT', 'Patient'
    CLINIC = 'CLINIC', 'Clinic'


class NotificationType(models.TextChoices):
    PATIENT_SAME_DAY = 'PATIENT_SAME_DAY', 'Patient Same Day Reminder'
    CLINIC_PREV_DAY = 'CLINIC_PREV_DAY', 'Clinic Previous Day Summary'
    CLINIC_SAME_DAY = 'CLINIC_SAME_DAY', 'Clinic Same Day Summary'


class ReminderSlot(models.TextChoices):
    """Identifies WHEN a reminder is scheduled relative to the appointment."""
    DAY_BEFORE = 'DAY_BEFORE', 'Evening before appointment (7 PM IST)'
    SAME_DAY = 'SAME_DAY', 'Morning of appointment (7 AM IST)'


class ReminderTarget(models.TextChoices):
    """Who receives the reminder."""
    PATIENT = 'PATIENT', 'Patient'
    CLINIC = 'CLINIC', 'Clinic (Doctor)'


class ReminderStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    SENT = 'SENT', 'Sent'
    FAILED = 'FAILED', 'Failed (will retry)'
    SKIPPED = 'SKIPPED', 'Skipped (session disconnected)'


# ─── WhatsApp Session (per clinic) ───────────────────────────────────────────

class WhatsAppSession(AuditModel):
    """
    Tracks the WhatsApp Web session state for each clinic.

    Each clinic has exactly ONE WhatsAppSession record. Reminders are only
    dispatched when the session status is CONNECTED. If disconnected, reminders
    for that clinic are SKIPPED until the clinic reconnects their own WhatsApp.

    ISOLATION: Each clinic session is completely independent. No shared sender.
    """
    clinic = models.OneToOneField(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='whatsapp_session'
    )
    status = models.CharField(
        max_length=20,
        default='DISCONNECTED',
        db_index=True,
        help_text="INITIALIZING | QR_REQUIRED | CONNECTED | DISCONNECTED | RECONNECTING"
    )
    connected_number = models.CharField(
        max_length=30,
        blank=True,
        null=True,
        help_text="The WhatsApp number currently connected (e.g. 919876543210)"
    )
    connected_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="WhatsApp display name of the connected account"
    )
    last_activity = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time a message was sent or session was active"
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.clinic.name} — WhatsApp: {self.status}"

    @property
    def is_connected(self):
        return self.status == 'CONNECTED'


# ─── Reminder History (per appointment) ──────────────────────────────────────

class ReminderHistory(TenantModel):
    """
    The source of truth for every reminder sent (or attempted) by DentFlow.

    One record per (appointment, slot, target) combination — enforced by a
    unique constraint to prevent double-sending.

    ISOLATION: Only sent when the clinic's own WhatsApp session is CONNECTED.
    Messages are always sent from the clinic's WhatsApp number.
    """
    appointment = models.ForeignKey(
        'appointments.Appointment',
        on_delete=models.CASCADE,
        related_name='reminders'
    )
    slot = models.CharField(
        max_length=15,
        choices=ReminderSlot.choices,
        db_index=True
    )
    target = models.CharField(
        max_length=10,
        choices=ReminderTarget.choices,
        db_index=True
    )
    recipient_number = models.CharField(
        max_length=30,
        help_text="Phone number this reminder was/will be sent to"
    )
    message = models.TextField(
        help_text="Exact message text that was/will be sent"
    )
    status = models.CharField(
        max_length=10,
        choices=ReminderStatus.choices,
        default=ReminderStatus.PENDING,
        db_index=True
    )
    scheduled_for = models.DateTimeField(
        db_index=True,
        help_text="When this reminder should be dispatched (in UTC)"
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    retry_count = models.PositiveSmallIntegerField(default=0)
    error_message = models.TextField(
        blank=True,
        null=True,
        help_text="Last error message if send failed"
    )

    class Meta:
        ordering = ['-scheduled_for']
        constraints = [
            models.UniqueConstraint(
                fields=['appointment', 'slot', 'target'],
                name='unique_appointment_slot_target'
            )
        ]
        indexes = [
            models.Index(fields=['clinic', 'status']),
            models.Index(fields=['scheduled_for', 'status']),
            models.Index(fields=['appointment', 'slot']),
        ]

    def __str__(self):
        return (
            f"{self.appointment} | {self.slot} | "
            f"{self.target} → {self.recipient_number} [{self.status}]"
        )


# ─── Notification Template ────────────────────────────────────────────────────

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


# ─── Notification Log (general audit trail) ───────────────────────────────────

class NotificationLog(TenantModel):
    """
    General audit log for all notifications. Kept for historical reference.
    New code uses ReminderHistory for appointment reminders.
    """
    recipient_type = models.CharField(
        max_length=20,
        choices=RecipientType.choices,
        default=RecipientType.PATIENT
    )
    recipient_value = models.CharField(max_length=255)
    message = models.TextField()
    scheduled_for = models.DateTimeField(db_index=True)
    sent = models.BooleanField(default=False, db_index=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('PENDING', 'Pending'),
            ('SENT', 'Sent'),
            ('FAILED', 'Failed'),
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
