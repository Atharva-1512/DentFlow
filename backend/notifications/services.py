"""
Notification Services — DentFlow WhatsApp Reminder Engine

All appointment reminders are sent exclusively from the clinic's own connected
WhatsApp account via the Node.js whatsapp-service microservice.

Rules enforced here:
1. Never send from a shared DentFlow number.
2. If a clinic's session is DISCONNECTED → mark reminder SKIPPED, do not send.
3. Each clinic's reminders are completely isolated from other clinics.
4. Deduplication is enforced by the unique constraint on ReminderHistory.
"""

import datetime
import logging
from django.utils import timezone
from django.db import IntegrityError
from clinics.models import Clinic
from appointments.models import Appointment
from .models import (
    NotificationTemplate,
    NotificationType,
    ReminderHistory,
    ReminderSlot,
    ReminderTarget,
    ReminderStatus,
    WhatsAppSession,
)

logger = logging.getLogger('dentflow.notifications')

# IST hours for each reminder slot
SLOT_HOURS = {
    ReminderSlot.SAME_DAY: 7,    # 7:00 AM IST — morning of appointment
    ReminderSlot.DAY_BEFORE: 19, # 7:00 PM IST — evening before appointment
}

MAX_RETRIES = 3


# ─── Template helpers ─────────────────────────────────────────────────────────

def interpolate_template(body: str, context: dict) -> str:
    """Replace {{key}} placeholders with context values."""
    for key, value in context.items():
        body = body.replace(f"{{{{{key}}}}}", str(value))
    return body


def get_template(clinic, template_type: str) -> "NotificationTemplate":
    """
    Return clinic-specific template, falling back to global default.
    Seeds a global default on first use if none exists.
    """
    tmpl = NotificationTemplate.objects.filter(clinic=clinic, template_type=template_type).first()
    if tmpl:
        return tmpl

    tmpl = NotificationTemplate.objects.filter(clinic=None, template_type=template_type).first()
    if tmpl:
        return tmpl

    defaults = {
        NotificationType.PATIENT_SAME_DAY: (
            "Hello {{patient_name}} 👋\n\n"
            "This is a reminder from *{{clinic_name}}* that you have a dental appointment today!\n\n"
            "🗓 *Date:* {{appointment_date}}\n"
            "⏰ *Time:* {{appointment_time}}\n"
            "👨‍⚕️ *Doctor:* {{doctor}}\n\n"
            "Please arrive 5 minutes early. Reply to this message if you need to reschedule."
        ),
        NotificationType.CLINIC_PREV_DAY: (
            "📋 *{{clinic_name}} — Tomorrow's Appointments*\n"
            "📅 {{appointment_date}}\n\n"
            "{{appointments_list}}\n\n"
            "Total: {{total_count}} appointment(s)"
        ),
        NotificationType.CLINIC_SAME_DAY: (
            "📋 *{{clinic_name}} — Today's Appointments*\n"
            "📅 {{appointment_date}}\n\n"
            "{{appointments_list}}\n\n"
            "Total: {{total_count}} appointment(s)"
        ),
    }

    body = defaults.get(template_type, "Appointment reminder: {{patient_name}}")
    tmpl = NotificationTemplate.objects.create(clinic=None, template_type=template_type, body=body)
    return tmpl


# ─── IST-aware scheduled datetime helper ─────────────────────────────────────

def _scheduled_at_ist(date: datetime.date, hour: int) -> datetime.datetime:
    """Return a timezone-aware datetime at `hour` IST on `date`."""
    from zoneinfo import ZoneInfo
    ist = ZoneInfo('Asia/Kolkata')
    naive = datetime.datetime.combine(date, datetime.time(hour, 0, 0))
    return naive.replace(tzinfo=ist)


# ─── Is clinic eligible? ──────────────────────────────────────────────────────

def _clinic_is_eligible(clinic: Clinic) -> bool:
    """Return True if the clinic has an active or trial subscription."""
    from subscriptions.models import ClinicSubscription, SubscriptionStatus
    try:
        sub = ClinicSubscription.objects.get(clinic=clinic)
        if sub.status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]:
            return True
        if sub.status == SubscriptionStatus.PAYMENT_DUE:
            if sub.grace_period_end_date and sub.grace_period_end_date >= timezone.now():
                return True
        return False
    except ClinicSubscription.DoesNotExist:
        return False


# ─── Reminder Generation ──────────────────────────────────────────────────────

def generate_patient_reminders(target_date: datetime.date) -> int:
    """
    Create SAME_DAY ReminderHistory entries for every SCHEDULED appointment on target_date.
    Reminder is scheduled for 7:00 AM IST on target_date.
    Skips duplicates silently (unique constraint).

    Returns: number of new reminders created.
    """
    scheduled_at = _scheduled_at_ist(target_date, SLOT_HOURS[ReminderSlot.SAME_DAY])
    appointments = (
        Appointment.objects
        .filter(appointment_date=target_date, status='SCHEDULED')
        .select_related('patient', 'clinic')
    )

    count = 0
    for appt in appointments:
        if not _clinic_is_eligible(appt.clinic):
            continue

        template = get_template(appt.clinic, NotificationType.PATIENT_SAME_DAY)
        context = {
            'patient_name': appt.patient.full_name,
            'appointment_time': appt.appointment_time.strftime('%I:%M %p'),
            'appointment_date': target_date.strftime('%d %B %Y'),
            'doctor': appt.consulting_doctor,
            'clinic_name': appt.clinic.name,
        }
        message = interpolate_template(template.body, context)

        try:
            ReminderHistory.objects.create(
                clinic=appt.clinic,
                appointment=appt,
                slot=ReminderSlot.SAME_DAY,
                target=ReminderTarget.PATIENT,
                recipient_number=appt.patient.mobile_number,
                message=message,
                scheduled_for=scheduled_at,
            )
            count += 1
        except IntegrityError:
            pass  # Already exists for this appointment+slot+target

    logger.info(f"[generate_patient_reminders] {count} new reminders for {target_date}")
    return count


def generate_clinic_summaries(target_date: datetime.date, is_previous_day: bool = False) -> int:
    """
    Create ReminderHistory entries for clinic owner summaries.

    - is_previous_day=True  → CLINIC target, DAY_BEFORE slot, 7 PM IST, for tomorrow's appts
    - is_previous_day=False → CLINIC target, SAME_DAY slot,  7 AM IST, for today's appts

    Returns: number of new reminders created.
    """
    if is_previous_day:
        slot = ReminderSlot.DAY_BEFORE
        appt_date = target_date + datetime.timedelta(days=1)
        scheduled_at = _scheduled_at_ist(target_date, SLOT_HOURS[ReminderSlot.DAY_BEFORE])
        notif_type = NotificationType.CLINIC_PREV_DAY
    else:
        slot = ReminderSlot.SAME_DAY
        appt_date = target_date
        scheduled_at = _scheduled_at_ist(target_date, SLOT_HOURS[ReminderSlot.SAME_DAY])
        notif_type = NotificationType.CLINIC_SAME_DAY

    clinics = Clinic.objects.filter(is_active=True)
    count = 0

    for clinic in clinics:
        if not _clinic_is_eligible(clinic):
            continue

        appointments = (
            Appointment.objects
            .filter(clinic=clinic, appointment_date=appt_date, status='SCHEDULED')
            .select_related('patient')
            .order_by('appointment_time')
        )

        if not appointments.exists():
            continue

        # Build appointment bullet list
        bullets = []
        for i, appt in enumerate(appointments, 1):
            time_str = appt.appointment_time.strftime('%I:%M %p')
            bullets.append(f"{i}. {time_str} — {appt.patient.full_name} ({appt.consulting_doctor})")
        appointments_list = "\n".join(bullets)

        template = get_template(clinic, notif_type)
        context = {
            'clinic_name': clinic.name,
            'appointment_date': appt_date.strftime('%d %B %Y'),
            'appointments_list': appointments_list,
            'total_count': appointments.count(),
        }
        message = interpolate_template(template.body, context)

        # Clinic owner WhatsApp number (from session or clinic field)
        try:
            session = clinic.whatsapp_session
            recipient_number = session.connected_number or ''
        except WhatsAppSession.DoesNotExist:
            recipient_number = clinic.notification_whatsapp_number or ''

        if not recipient_number:
            logger.warning(f"[generate_clinic_summaries] No recipient number for clinic {clinic.name}")
            continue

        # Use a synthetic "appointment" FK isn't possible for clinic summaries.
        # We create ONE reminder per clinic per slot per date.
        # We check for duplicates manually since there's no appointment FK here.
        exists = ReminderHistory.objects.filter(
            clinic=clinic,
            slot=slot,
            target=ReminderTarget.CLINIC,
            scheduled_for=scheduled_at,
        ).exists()

        if exists:
            continue

        ReminderHistory.objects.create(
            clinic=clinic,
            appointment=appointments.first(),  # Anchor to first appointment for FK requirement
            slot=slot,
            target=ReminderTarget.CLINIC,
            recipient_number=recipient_number,
            message=message,
            scheduled_for=scheduled_at,
        )
        count += 1

    logger.info(f"[generate_clinic_summaries] {count} new clinic summaries (prev_day={is_previous_day})")
    return count


# ─── Reminder Dispatch ────────────────────────────────────────────────────────

def dispatch_pending_reminders() -> dict:
    """
    Dispatch all PENDING reminders that are due now (scheduled_for <= now).

    CLINIC ISOLATION ENFORCED HERE:
    - Each clinic's WhatsApp session is checked independently.
    - If a clinic's session is DISCONNECTED → reminder is marked SKIPPED.
    - Messages are NEVER sent from a shared or fallback number.
    - Retries up to MAX_RETRIES times before marking FAILED permanently.

    Returns: {'sent': N, 'skipped': N, 'failed': N}
    """
    from .providers.whatsapp_web import WhatsAppWebProvider

    now = timezone.now()
    pending = ReminderHistory.objects.filter(
        status__in=[ReminderStatus.PENDING, ReminderStatus.FAILED],
        scheduled_for__lte=now,
        retry_count__lt=MAX_RETRIES,
    ).select_related('clinic', 'appointment', 'appointment__patient')

    results = {'sent': 0, 'skipped': 0, 'failed': 0}

    for reminder in pending:
        clinic = reminder.clinic
        clinic_id = str(clinic.id)

        try:
            provider = WhatsAppWebProvider(clinic_id=clinic_id)
            # This will raise RuntimeError if not CONNECTED
            msg_id = provider.send_whatsapp_message(
                to_number=reminder.recipient_number,
                body=reminder.message,
            )

            reminder.status = ReminderStatus.SENT
            reminder.sent_at = timezone.now()
            reminder.error_message = None
            reminder.save(update_fields=['status', 'sent_at', 'error_message'])

            # Update session last_activity
            WhatsAppSession.objects.filter(clinic=clinic).update(last_activity=timezone.now())

            logger.info(
                f"[dispatch] ✅ Sent {reminder.slot}/{reminder.target} "
                f"→ {reminder.recipient_number} (clinic={clinic.name}, msg_id={msg_id})"
            )
            results['sent'] += 1

        except RuntimeError as e:
            # Session disconnected — skip this reminder
            err_str = str(e)
            if 'not connected' in err_str.lower():
                reminder.status = ReminderStatus.SKIPPED
                reminder.error_message = err_str
                reminder.save(update_fields=['status', 'error_message'])
                logger.warning(
                    f"[dispatch] ⚠️  SKIPPED {reminder.slot}/{reminder.target} "
                    f"for clinic={clinic.name} — WhatsApp session not connected"
                )
                results['skipped'] += 1
            else:
                reminder.status = ReminderStatus.FAILED
                reminder.retry_count += 1
                reminder.error_message = err_str
                reminder.save(update_fields=['status', 'retry_count', 'error_message'])
                logger.error(f"[dispatch] ❌ FAILED: {e}")
                results['failed'] += 1

        except Exception as e:
            reminder.status = ReminderStatus.FAILED
            reminder.retry_count += 1
            reminder.error_message = str(e)
            reminder.save(update_fields=['status', 'retry_count', 'error_message'])
            logger.exception(f"[dispatch] ❌ Unexpected error for reminder {reminder.id}: {e}")
            results['failed'] += 1

    logger.info(f"[dispatch_pending_reminders] Results: {results}")
    return results
