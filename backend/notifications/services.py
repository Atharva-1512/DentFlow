import datetime
import logging
from django.utils import timezone
from django.contrib.auth import get_user_model
from clinics.models import Clinic
from appointments.models import Appointment
from .models import NotificationLog, NotificationTemplate, NotificationType, RecipientType

User = get_user_model()
logger = logging.getLogger('dentflow.notifications')

def interpolate_template(body, context):
    """
    Replaces context placeholders like {{patient_name}} inside template body text.
    """
    for key, value in context.items():
        placeholder = f"{{{{{key}}}}}"
        body = body.replace(placeholder, str(value))
    return body

def get_template(clinic, template_type):
    """
    Retrieves the custom template for a clinic or falls back to global default.
    Seeds a global default if none exists.
    """
    # 1. Look for clinic override
    template = NotificationTemplate.objects.filter(clinic=clinic, template_type=template_type).first()
    if template:
        return template

    # 2. Look for global default
    template = NotificationTemplate.objects.filter(clinic=None, template_type=template_type).first()
    if template:
        return template

    # 3. Seed fallback global defaults on-the-fly
    defaults = {
        NotificationType.PATIENT_SAME_DAY: (
            "Reminder: {{patient_name}}, you have an appointment today at {{appointment_time}} with {{doctor}}."
        ),
        NotificationType.CLINIC_PREV_DAY: (
            "Summary: Tomorrow's appointments ({{appointment_date}}):\n{{appointments_list}}"
        ),
        NotificationType.CLINIC_SAME_DAY: (
            "Summary: Today's appointments ({{appointment_date}}):\n{{appointments_list}}"
        )
    }

    body = defaults.get(template_type, "Alert summary context.")
    template = NotificationTemplate.objects.create(
        clinic=None,
        template_type=template_type,
        body=body
    )
    return template


def generate_patient_reminders(target_date):
    """
    Generates same-day 7:00 AM reminders for patients with appointments scheduled today.
    """
    appointments = Appointment.objects.filter(
        appointment_date=target_date,
        status='SCHEDULED'
    ).select_related('patient', 'clinic')

    count = 0
    for appt in appointments:
        # Check if reminder already generated
        exists = NotificationLog.objects.filter(
            clinic=appt.clinic,
            recipient_value=appt.patient.mobile_number,
            notification_type=NotificationType.PATIENT_SAME_DAY,
            scheduled_for__date=target_date
        ).exists()
        
        if exists:
            continue

        template = get_template(appt.clinic, NotificationType.PATIENT_SAME_DAY)
        context = {
            'patient_name': appt.patient.full_name,
            'appointment_time': appt.appointment_time.strftime('%I:%M %p'),
            'doctor': appt.consulting_doctor,
            'clinic_name': appt.clinic.name
        }
        
        msg = interpolate_template(template.body, context)
        scheduled_time = datetime.datetime.combine(
            target_date, 
            datetime.time(7, 0, 0)
        )
        # Make timezone aware
        scheduled_time = timezone.make_aware(scheduled_time)

        NotificationLog.objects.create(
            clinic=appt.clinic,
            recipient_type=RecipientType.PATIENT,
            recipient_value=appt.patient.mobile_number,
            message=msg,
            scheduled_for=scheduled_time,
            notification_type=NotificationType.PATIENT_SAME_DAY
        )
        count += 1

    return count


def generate_clinic_summaries(target_date, is_previous_day=False):
    """
    Generates clinic-owner summary lists for scheduled appointments.
    - If is_previous_day=True: generates tomorrow's summary scheduled for 7:00 PM IST today (day before).
    - If is_previous_day=False: generates today's summary scheduled for 7:00 AM IST today.
    DentFlow schedule:
      - 7 PM IST (day before): doctor gets tomorrow's appointment list
      - 7 AM IST (day of): doctor gets today's appointment list
    """
    # Target date for scheduling summary checks
    query_date = target_date + datetime.timedelta(days=1) if is_previous_day else target_date
    scheduled_date = target_date
    
    # Select target type
    notification_type = (
        NotificationType.CLINIC_PREV_DAY if is_previous_day 
        else NotificationType.CLINIC_SAME_DAY
    )
    
    # Previous-day summary at 7 PM IST, same-day summary at 7 AM IST
    hour = 19 if is_previous_day else 7
    scheduled_time = timezone.make_aware(
        datetime.datetime.combine(scheduled_date, datetime.time(hour, 0, 0))
    )

    clinics = Clinic.objects.filter(is_active=True)
    count = 0

    for clinic in clinics:
        # Check active subscriptions
        from subscriptions.models import ClinicSubscription, SubscriptionStatus
        try:
            sub = ClinicSubscription.objects.get(clinic=clinic)
            # Skip expired/cancelled
            if sub.status not in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]:
                if sub.status == SubscriptionStatus.PAYMENT_DUE:
                    # Check grace expiry
                    if not sub.grace_period_end_date or sub.grace_period_end_date < timezone.now():
                        continue
                else:
                    continue
        except ClinicSubscription.DoesNotExist:
            continue

        # Get clinic owner email as recipient
        owner = User.objects.filter(clinic=clinic, role='CLINIC_OWNER').first()
        recipient_email = owner.email if owner else f"contact@{clinic.slug}.com"

        # Check if summary already scheduled
        exists = NotificationLog.objects.filter(
            clinic=clinic,
            recipient_value=recipient_email,
            notification_type=notification_type,
            scheduled_for=scheduled_time
        ).exists()
        
        if exists:
            continue

        # Fetch appointments
        appointments = Appointment.objects.filter(
            clinic=clinic,
            appointment_date=query_date,
            status='SCHEDULED'
        ).order_by('appointment_time')

        if not appointments.exists():
            continue  # Don't send empty summary logs

        # Build appointment bullet list
        appt_bullets = []
        for i, appt in enumerate(appointments, 1):
            time_str = appt.appointment_time.strftime('%I:%M %p')
            appt_bullets.append(
                f"{i}. {time_str} - {appt.patient.full_name} ({appt.consulting_doctor})"
            )
        appointments_list = "\n".join(appt_bullets)

        template = get_template(clinic, notification_type)
        context = {
            'appointment_date': query_date.strftime('%d %B %Y'),
            'appointments_list': appointments_list,
            'clinic_name': clinic.name
        }
        
        msg = interpolate_template(template.body, context)

        NotificationLog.objects.create(
            clinic=clinic,
            recipient_type=RecipientType.CLINIC,
            recipient_value=recipient_email,
            message=msg,
            scheduled_for=scheduled_time,
            notification_type=notification_type
        )
        count += 1

    return count


def send_pending_reminders():
    """
    Sends all scheduled messages that are due.
    Routes dispatches through the WhatsAppService layer.
    """
    from .whatsapp_service import WhatsAppService
    return WhatsAppService().dispatch_pending()
