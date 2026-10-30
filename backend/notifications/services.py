"""
Notification Services — DentFlow Centralized WhatsApp Reminder Engine

All appointment reminders and summaries are sent from the centralized DentFlow mobile number:
1. Evening 7:00 PM IST: Summary to Clinic listing tomorrow's scheduled patients and treatments.
2. Day of Appointment: Automated message to Patient dispatched 3 hours before appointment time
   containing the appointment time, doctor, clinic name, address, and scheduled treatment.
"""

import datetime
import logging
from zoneinfo import ZoneInfo
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
from .providers.dentflow_gateway import DentFlowWhatsAppProvider

logger = logging.getLogger('dentflow.notifications')
IST = ZoneInfo('Asia/Kolkata')
MAX_RETRIES = 3


# ─── Template Helpers ─────────────────────────────────────────────────────────

def interpolate_template(body: str, context: dict) -> str:
    """Replace {{key}} placeholders with context values."""
    for key, value in context.items():
        body = body.replace(f"{{{{{key}}}}}", str(value) if value is not None else "")
    return body


def get_template(clinic, template_type: str) -> NotificationTemplate:
    """
    Return clinic-specific template, falling back to global default.
    Seeds a default template if none exists.
    """
    tmpl = NotificationTemplate.objects.filter(clinic=clinic, template_type=template_type).first()
    if tmpl:
        return tmpl

    tmpl = NotificationTemplate.objects.filter(clinic=None, template_type=template_type).first()
    if tmpl:
        return tmpl

    defaults = {
        NotificationType.PATIENT_REMINDER_24HR: (
            "Hello {{patient_name}} 👋\n\n"
            "This is a reminder from *DentFlow* that you have a dental appointment tomorrow!\n\n"
            "🗓 *Date:* {{appointment_date}}\n"
            "⏰ *Time:* {{appointment_time}}\n"
            "👨‍⚕️ *Doctor:* {{doctor}}\n"
            "🏥 *Clinic:* {{clinic_name}}\n"
            "📍 *Address:* {{clinic_address}}\n"
            "🦷 *Treatment/Purpose:* {{treatment}}\n\n"
            "Please arrive 10 minutes before your scheduled time."
        ),
        NotificationType.PATIENT_REMINDER_3HR: (
            "Hello {{patient_name}} 👋\n\n"
            "This is a reminder from *DentFlow* that you have a dental appointment in 3 hours!\n\n"
            "🗓 *Date:* {{appointment_date}}\n"
            "⏰ *Time:* {{appointment_time}}\n"
            "👨‍⚕️ *Doctor:* {{doctor}}\n"
            "🏥 *Clinic:* {{clinic_name}}\n"
            "📍 *Address:* {{clinic_address}}\n"
            "🦷 *Treatment/Purpose:* {{treatment}}\n\n"
            "Please arrive 10 minutes before your scheduled time."
        ),
        NotificationType.PATIENT_SAME_DAY: (
            "Hello {{patient_name}} 👋\n\n"
            "This is a reminder from *DentFlow* that you have a dental appointment in 3 hours!\n\n"
            "🗓 *Date:* {{appointment_date}}\n"
            "⏰ *Time:* {{appointment_time}}\n"
            "👨‍⚕️ *Doctor:* {{doctor}}\n"
            "🏥 *Clinic:* {{clinic_name}}\n"
            "📍 *Address:* {{clinic_address}}\n"
            "🦷 *Treatment/Purpose:* {{treatment}}\n\n"
            "Please arrive 10 minutes before your scheduled time."
        ),
        NotificationType.CLINIC_TOMORROW_SUMMARY: (
            "📋 *{{clinic_name}} — Tomorrow's Scheduled Patients*\n"
            "📅 Date: {{appointment_date}}\n\n"
            "{{appointments_list}}\n\n"
            "Total: {{total_count}} scheduled appointment(s)\n"
            "— Sent via DentFlow WhatsApp"
        ),
        NotificationType.CLINIC_PREV_DAY: (
            "📋 *{{clinic_name}} — Tomorrow's Scheduled Patients*\n"
            "📅 Date: {{appointment_date}}\n\n"
            "{{appointments_list}}\n\n"
            "Total: {{total_count}} scheduled appointment(s)\n"
            "— Sent via DentFlow WhatsApp"
        ),
        NotificationType.CLINIC_SAME_DAY: (
            "📋 *{{clinic_name}} — Today's Scheduled Patients*\n"
            "📅 Date: {{appointment_date}}\n\n"
            "{{appointments_list}}\n\n"
            "Total: {{total_count}} scheduled appointment(s)\n"
            "— Sent via DentFlow WhatsApp"
        ),
    }

    body = defaults.get(template_type, "DentFlow appointment reminder for {{patient_name}} at {{clinic_name}}")
    tmpl = NotificationTemplate.objects.create(clinic=None, template_type=template_type, body=body)
    return tmpl


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


# ─── Patient Automated Reminder Generation (24-Hour Default) ───────────────────

def generate_patient_reminders(target_date: datetime.date) -> int:
    """
    Create automated ReminderHistory entries for every SCHEDULED appointment on target_date.
    Scheduled time is dynamically calculated based on settings.PATIENT_REMINDER_HOURS_PRIOR (default: 24 hours prior).
    Skips duplicates silently (unique constraint).

    Returns: number of new reminders created.
    """
    from django.conf import settings
    hours_prior = getattr(settings, 'PATIENT_REMINDER_HOURS_PRIOR', 24)

    appointments = (
        Appointment.objects
        .filter(appointment_date=target_date, status='SCHEDULED')
        .select_related('patient', 'clinic')
    )

    count = 0
    for appt in appointments:
        if not _clinic_is_eligible(appt.clinic):
            continue

        # Combine date + time into IST timezone-aware datetime
        naive_dt = datetime.datetime.combine(appt.appointment_date, appt.appointment_time)
        appt_ist_dt = naive_dt.replace(tzinfo=IST)
        # Schedule reminder X hours before the appointment (default 24h)
        scheduled_at = appt_ist_dt - datetime.timedelta(hours=hours_prior)

        # Determine treatment description (reason or procedure type)
        treatment = appt.appointment_reason.strip() if appt.appointment_reason else appt.get_appointment_type_display()
        clinic_address = appt.clinic.address.strip() if appt.clinic.address else "Address on file"

        if hours_prior >= 24:
            template_type = NotificationType.PATIENT_REMINDER_24HR
            slot = getattr(ReminderSlot, 'HOURS_BEFORE_24', ReminderSlot.HOURS_BEFORE_3)
        else:
            template_type = NotificationType.PATIENT_REMINDER_3HR
            slot = ReminderSlot.HOURS_BEFORE_3

        template = get_template(appt.clinic, template_type)
        context = {
            'patient_name': appt.patient.full_name,
            'appointment_time': appt.appointment_time.strftime('%I:%M %p'),
            'appointment_date': target_date.strftime('%d %B %Y'),
            'doctor': appt.consulting_doctor,
            'clinic_name': appt.clinic.name,
            'clinic_address': clinic_address,
            'treatment': treatment,
        }
        message = interpolate_template(template.body, context)

        try:
            ReminderHistory.objects.create(
                clinic=appt.clinic,
                appointment=appt,
                slot=slot,
                target=ReminderTarget.PATIENT,
                recipient_number=appt.patient.mobile_number,
                message=message,
                scheduled_for=scheduled_at,
            )
            count += 1
        except IntegrityError:
            pass  # Already scheduled for this appointment+slot+target

    logger.info(f"[generate_patient_reminders] Created {count} {hours_prior}-hour prior patient reminders for {target_date}")
    return count


# ─── Clinic Summary Generation (7 PM Evening with Treatments) ─────────────────

def generate_clinic_summaries(target_date: datetime.date, is_previous_day: bool = True) -> int:
    """
    Create ReminderHistory entries for clinic owner summaries.

    - is_previous_day=True (Default at 7:00 PM IST):
      Sends tomorrow's appointment list with each patient's scheduled treatments to the clinic.
    - is_previous_day=False (Morning at 7:00 AM IST):
      Sends today's appointment list with treatments to the clinic.

    Returns: number of new reminders created.
    """
    if is_previous_day:
        slot = ReminderSlot.DAY_BEFORE
        appt_date = target_date + datetime.timedelta(days=1)
        # Schedule at 7:00 PM IST on target_date
        scheduled_at = datetime.datetime.combine(target_date, datetime.time(19, 0, 0)).replace(tzinfo=IST)
        notif_type = NotificationType.CLINIC_TOMORROW_SUMMARY
    else:
        slot = ReminderSlot.SAME_DAY
        appt_date = target_date
        scheduled_at = datetime.datetime.combine(target_date, datetime.time(7, 0, 0)).replace(tzinfo=IST)
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

        # Build itemized list with Patient Name, Time, Doctor, and Treatment
        bullets = []
        for i, appt in enumerate(appointments, 1):
            time_str = appt.appointment_time.strftime('%I:%M %p')
            treatment_str = appt.appointment_reason.strip() if appt.appointment_reason else appt.get_appointment_type_display()
            bullets.append(f"{i}. *{time_str}* — {appt.patient.full_name} ({appt.consulting_doctor}) | Treatment: _{treatment_str}_")
        appointments_list = "\n".join(bullets)

        template = get_template(clinic, notif_type)
        context = {
            'clinic_name': clinic.name,
            'appointment_date': appt_date.strftime('%d %B %Y'),
            'appointments_list': appointments_list,
            'total_count': appointments.count(),
        }
        message = interpolate_template(template.body, context)

        # Clinic destination WhatsApp number
        recipient_number = clinic.notification_whatsapp_number
        if not recipient_number:
            try:
                session = clinic.whatsapp_session
                recipient_number = session.connected_number or ''
            except WhatsAppSession.DoesNotExist:
                recipient_number = ''

        if not recipient_number:
            logger.warning(f"[generate_clinic_summaries] No WhatsApp number configured for clinic {clinic.name}")
            continue

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
            appointment=appointments.first(),
            slot=slot,
            target=ReminderTarget.CLINIC,
            recipient_number=recipient_number,
            message=message,
            scheduled_for=scheduled_at,
        )
        count += 1

    logger.info(f"[generate_clinic_summaries] Created {count} clinic summaries (tomorrow={is_previous_day})")
    return count


# ─── Centralized Reminder Dispatch Engine ─────────────────────────────────────

def dispatch_pending_reminders() -> dict:
    """
    Dispatch all PENDING reminders that are due now (scheduled_for <= now).
    All messages are sent from the centralized DentFlow mobile number.

    Returns: {'sent': N, 'skipped': N, 'failed': N}
    """
    now = timezone.now()
    pending = ReminderHistory.objects.filter(
        status__in=[ReminderStatus.PENDING, ReminderStatus.FAILED],
        scheduled_for__lte=now,
        retry_count__lt=MAX_RETRIES,
    ).select_related('clinic', 'appointment', 'appointment__patient')

    results = {'sent': 0, 'skipped': 0, 'failed': 0}
    provider = DentFlowWhatsAppProvider()

    for reminder in pending:
        try:
            msg_id = provider.send_whatsapp_message(
                to_number=reminder.recipient_number,
                body=reminder.message,
            )

            reminder.status = ReminderStatus.SENT
            reminder.sent_at = timezone.now()
            reminder.error_message = None
            reminder.save(update_fields=['status', 'sent_at', 'error_message'])

            # Update session last_activity if present
            WhatsAppSession.objects.filter(clinic=reminder.clinic).update(last_activity=timezone.now())

            logger.info(
                f"[dispatch] ✅ Sent reminder ({reminder.slot}/{reminder.target}) "
                f"→ {reminder.recipient_number} (Clinic: {reminder.clinic.name}, MsgID: {msg_id})"
            )
            results['sent'] += 1

        except Exception as e:
            reminder.status = ReminderStatus.FAILED
            reminder.retry_count += 1
            reminder.error_message = str(e)
            reminder.save(update_fields=['status', 'retry_count', 'error_message'])
            logger.exception(f"[dispatch] ❌ Failed to dispatch reminder {reminder.id}: {e}")
            results['failed'] += 1

    logger.info(f"[dispatch_pending_reminders] Dispatch results: {results}")
    return results


# ─── Campaign & Festival Broadcast Dispatcher ────────────────────────────────

def dispatch_campaign_broadcast(clinic, title: str, message_body: str, audience: str = 'ALL_PATIENTS', template_type: str = 'CUSTOM', user_id: str = None) -> dict:
    """
    Sends personalized festival greetings or custom broadcasts to patients of a clinic.
    Includes anti-ban rate limiting throttling (delay between messages).
    """
    import time
    from django.conf import settings
    from clinics.models import Clinic as SqlClinic
    from .models import CampaignBroadcast

    delay = getattr(settings, 'WHATSAPP_BROADCAST_DELAY_SECONDS', 2.0)
    provider = DentFlowWhatsAppProvider()

    clinic_id = getattr(clinic, 'id', None)
    clinic_name = getattr(clinic, 'name', 'DentFlow Clinic')
    clinic_address = getattr(clinic, 'address', '')

    # 1. Fetch Patients (MongoDB primary, SQL fallback)
    raw_patients = []
    if user_id:
        try:
            from core.mongodb import get_patients
            data = get_patients(str(user_id), page=1, page_size=10000)
            for p in data.get('results', []):
                mob = str(p.get('mobile_number', '')).strip()
                if mob:
                    raw_patients.append({
                        'full_name': p.get('full_name', 'Patient'),
                        'mobile_number': mob,
                        'created_at': p.get('created_at'),
                    })
        except Exception:
            pass

    if not raw_patients and clinic_id:
        try:
            from patients.models import Patient
            sql_patients = Patient.objects.filter(clinic_id=clinic_id, is_deleted=False).exclude(mobile_number='')
            for p in sql_patients:
                raw_patients.append({
                    'full_name': p.full_name,
                    'mobile_number': str(p.mobile_number).strip(),
                    'created_at': p.created_at,
                })
        except Exception:
            pass

    total = len(raw_patients)

    # 2. Resolve SQL Clinic for CampaignBroadcast relation
    sql_clinic = None
    if isinstance(clinic, SqlClinic):
        sql_clinic = clinic
    elif clinic_id:
        try:
            sql_clinic, _ = SqlClinic.objects.get_or_create(
                id=clinic_id,
                defaults={
                    'name': clinic_name,
                    'address': clinic_address,
                    'notification_whatsapp_number': getattr(clinic, 'notification_whatsapp_number', ''),
                }
            )
        except Exception:
            sql_clinic = SqlClinic.objects.filter(id=clinic_id).first()

    campaign = None
    if sql_clinic:
        try:
            campaign = CampaignBroadcast.objects.create(
                clinic=sql_clinic,
                title=title,
                template_type=template_type,
                message_body=message_body,
                target_audience=audience,
                total_recipients=total,
                status='IN_PROGRESS',
            )
        except Exception as e:
            logger.warning(f"Could not persist CampaignBroadcast in SQL: {e}")

    sent = 0
    failed = 0

    # 3. Determine doctor name for interpolation
    doctor_name = "Doctor"
    if hasattr(clinic, 'data') and isinstance(clinic.data, dict):
        docs = clinic.data.get('doctors', [])
        if docs and len(docs) > 0:
            doctor_name = docs[0].get('name', 'Doctor')
    elif hasattr(clinic, 'users'):
        try:
            first_owner = clinic.users.filter(role='CLINIC_OWNER').first()
            if first_owner:
                doctor_name = f"{first_owner.first_name} {first_owner.last_name}".strip() or first_owner.username
        except Exception:
            pass

    # 4. Dispatch messages with anti-ban delay
    for i, pat in enumerate(raw_patients):
        context = {
            'patient_name': pat['full_name'],
            'clinic_name': clinic_name,
            'doctor_name': doctor_name,
            'doctor': doctor_name,
            'clinic_address': clinic_address or '',
        }
        personalized_text = interpolate_template(message_body, context)

        try:
            provider.send_whatsapp_message(
                to_number=pat['mobile_number'],
                body=personalized_text
            )
            sent += 1
        except Exception as e:
            logger.error(f"[Campaign Broadcast] Failed to send to {pat['mobile_number']}: {e}")
            failed += 1

        if i < total - 1 and delay > 0 and provider.provider_type != 'mock':
            time.sleep(delay)

    if campaign:
        try:
            campaign.sent_count = sent
            campaign.failed_count = failed
            campaign.status = 'COMPLETED' if failed < total else 'FAILED'
            campaign.completed_at = timezone.now()
            campaign.save(update_fields=['sent_count', 'failed_count', 'status', 'completed_at'])
        except Exception:
            pass

    logger.info(f"[dispatch_campaign_broadcast] Completed broadcast '{title}': {sent}/{total} sent, {failed} failed.")
    return {
        'campaign_id': str(campaign.id) if campaign else 'local_campaign',
        'title': title,
        'total': total,
        'sent': sent,
        'failed': failed,
        'status': 'COMPLETED' if failed < total else 'FAILED',
    }


