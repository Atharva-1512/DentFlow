"""
Notification Views — DentFlow Centralized WhatsApp Engine
"""

import datetime
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import ReminderHistory, ReminderStatus
from .services import (
    generate_patient_reminders,
    generate_clinic_summaries,
    dispatch_pending_reminders,
)


class WhatsAppStatusView(APIView):
    """
    Returns the status of DentFlow's Centralized WhatsApp notification engine.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        clinic = getattr(request, 'clinic', None)
        sender_number = getattr(settings, 'DENTFLOW_WHATSAPP_NUMBER', '+919876543210')
        provider = getattr(settings, 'WHATSAPP_PROVIDER', 'mock')

        return Response({
            'status': 'ACTIVE',
            'sender_number': sender_number,
            'provider': provider,
            'clinic_notification_number': clinic.notification_whatsapp_number if clinic else None,
            'clinic_name': clinic.name if clinic else None,
            'rules': {
                'evening_summary_time': '19:00 IST (Tomorrow\'s patients & treatments to clinic)',
                'patient_reminder_timing': f"{getattr(settings, 'PATIENT_REMINDER_HOURS_PRIOR', 24)} Hours prior to scheduled appointment time",
            }
        })


class WhatsAppStatsView(APIView):
    """
    Returns notification and reminder dispatch statistics for the clinic.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        clinic = getattr(request, 'clinic', None)
        if not clinic:
            return Response({'detail': 'Clinic context not found.'}, status=400)

        reminders_qs = ReminderHistory.objects.filter(clinic=clinic)
        total = reminders_qs.count()
        sent = reminders_qs.filter(status=ReminderStatus.SENT).count()
        pending = reminders_qs.filter(status=ReminderStatus.PENDING).count()
        failed = reminders_qs.filter(status=ReminderStatus.FAILED).count()
        skipped = reminders_qs.filter(status=ReminderStatus.SKIPPED).count()

        last_sent = reminders_qs.filter(status=ReminderStatus.SENT).order_by('-sent_at').first()

        return Response({
            'sender_number': getattr(settings, 'DENTFLOW_WHATSAPP_NUMBER', '+919876543210'),
            'reminders': {
                'total': total,
                'sent': sent,
                'pending': pending,
                'failed': failed,
                'skipped': skipped,
                'last_sent_at': last_sent.sent_at if last_sent else None,
            },
        })


class WhatsAppConnectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({
            'message': 'Centralized DentFlow WhatsApp sender is active. No local QR linking required.',
            'sender_number': getattr(settings, 'DENTFLOW_WHATSAPP_NUMBER', '+919876543210'),
        })


class WhatsAppDisconnectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({'message': 'Centralized sender operates at platform level.'})


@csrf_exempt
def trigger_reminders(request, slot):
    """
    Cron trigger endpoint (called by external cron or task scheduler).
    Secured by X-Cron-Secret header or secret query parameter.
    """
    expected_secret = getattr(settings, 'CRON_SECRET', '')
    if expected_secret:
        auth_header = request.headers.get('X-Cron-Secret') or request.GET.get('secret')
        if auth_header != expected_secret:
            return JsonResponse({'error': 'Unauthorized'}, status=401)

    target_date = timezone.localtime(timezone.now()).date()
    created = {}

    if slot in ('evening', 'all'):
        tomorrow = target_date + datetime.timedelta(days=1)
        created['tomorrow_patient_reminders'] = generate_patient_reminders(tomorrow)
        created['clinic_evening_summary'] = generate_clinic_summaries(target_date, is_previous_day=True)
    elif slot == 'morning':
        created['today_patient_reminders'] = generate_patient_reminders(target_date)
        created['clinic_today_summary'] = generate_clinic_summaries(target_date, is_previous_day=False)

    dispatched = dispatch_pending_reminders()

    return JsonResponse({
        'status': 'success',
        'slot': slot,
        'target_date': str(target_date),
        'generated': created,
        'dispatched': dispatched,
    })


# ─── Campaign & Festival Greetings Views ──────────────────────────────────────

class CampaignPresetsView(APIView):
    """
    GET /api/notifications/campaigns/presets/
    Returns festive greeting presets (Diwali, New Year, Checkup) and available recipient count.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        clinic = getattr(request, 'clinic', None)
        if not clinic:
            return Response({'detail': 'Clinic context not found.'}, status=400)

        total_patients = 0
        user_id = getattr(request.user, 'id', None) or getattr(request.user, 'pk', None)

        # 1. Fetch from MongoDB first (active tenant data layer)
        if user_id:
            try:
                from core.mongodb import get_patients
                patient_data = get_patients(str(user_id), page=1, page_size=10000)
                results = patient_data.get('results', [])
                total_patients = len([p for p in results if p.get('mobile_number')])
            except Exception:
                pass

        # 2. Fallback to SQL Patient if MongoDB returned 0
        if total_patients == 0:
            clinic_id = getattr(clinic, 'id', None)
            if clinic_id:
                try:
                    from patients.models import Patient
                    total_patients = Patient.objects.filter(clinic_id=clinic_id, is_deleted=False).exclude(mobile_number='').count()
                except Exception:
                    pass

        presets = [
            {
                'id': 'DIWALI',
                'name': 'Happy Diwali Greeting 🪔',
                'title': 'Diwali Festive Wishes',
                'message': (
                    "🪔 *Happy Diwali from {{clinic_name}}!* 🪔\n\n"
                    "Wishing you and your family a joyous festival filled with light, laughter, and radiant smiles.\n"
                    "May this auspicious season bring health, happiness, and peace to your home!\n\n"
                    "Warm greetings,\n"
                    "*Dr. {{doctor_name}}* & the team at {{clinic_name}}\n"
                    "📍 {{clinic_address}}"
                )
            },
            {
                'id': 'NEW_YEAR',
                'name': 'New Year Wishes 🎉',
                'title': 'Happy New Year Greeting',
                'message': (
                    "🎉 *Happy New Year from {{clinic_name}}!* 🎊\n\n"
                    "Wishing you and your family a healthy, prosperous, and smiling year ahead!\n"
                    "Keep your smile bright and healthy all year long.\n\n"
                    "Best wishes,\n"
                    "*Dr. {{doctor_name}}* & Team\n"
                    "{{clinic_name}}"
                )
            },
            {
                'id': 'CHECKUP',
                'name': 'Routine 6-Month Dental Checkup 🦷',
                'title': 'Preventive Dental Care Reminder',
                'message': (
                    "🦷 *Routine Dental Care Reminder* 🦷\n\n"
                    "Hello {{patient_name}},\n\n"
                    "It has been over 6 months since your last dental visit at {{clinic_name}}. "
                    "Routine checkups and cleaning help prevent cavities and ensure your teeth stay strong and healthy!\n\n"
                    "Call us today to schedule your preventive checkup.\n\n"
                    "Best regards,\n"
                    "*Dr. {{doctor_name}}*\n"
                    "{{clinic_name}}\n"
                    "📍 {{clinic_address}}"
                )
            },
            {
                'id': 'CUSTOM',
                'name': 'Custom Specialized Message ✍️',
                'title': 'Custom Broadcast',
                'message': (
                    "Hello {{patient_name}},\n\n"
                    "Warm greetings from {{clinic_name}}!\n\n"
                    "[Write your custom message here]\n\n"
                    "Best regards,\n"
                    "Dr. {{doctor_name}}\n"
                    "{{clinic_name}}"
                )
            }
        ]

        return Response({
            'total_eligible_patients': total_patients,
            'presets': presets,
        })


class CampaignBroadcastView(APIView):
    """
    POST /api/notifications/campaigns/broadcast/
    Launches a personalized broadcast to clinic patients using the centralized gateway.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        clinic = getattr(request, 'clinic', None)
        if not clinic:
            return Response({'detail': 'Clinic context not found.'}, status=400)

        title = request.data.get('title', 'Special Announcement').strip()
        message_body = request.data.get('message', '').strip()
        audience = request.data.get('audience', 'ALL_PATIENTS')
        template_type = request.data.get('template_type', 'CUSTOM')

        if not message_body:
            return Response({'detail': 'Message body cannot be empty.'}, status=400)

        user_id = getattr(request.user, 'id', None) or getattr(request.user, 'pk', None)

        from .services import dispatch_campaign_broadcast
        result = dispatch_campaign_broadcast(
            clinic=clinic,
            title=title,
            message_body=message_body,
            audience=audience,
            template_type=template_type,
            user_id=str(user_id) if user_id else None,
        )

        return Response({
            'status': 'success',
            'detail': f"Campaign '{title}' dispatched: {result['sent']} sent, {result['failed']} failed.",
            'result': result,
        })


class CampaignHistoryView(APIView):
    """
    GET /api/notifications/campaigns/history/
    Lists past marketing / festival broadcasts for the clinic.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        clinic = getattr(request, 'clinic', None)
        if not clinic:
            return Response({'detail': 'Clinic context not found.'}, status=400)

        clinic_id = getattr(clinic, 'id', None)
        from .models import CampaignBroadcast
        campaigns = CampaignBroadcast.objects.filter(clinic_id=clinic_id).order_by('-created_at')[:30] if clinic_id else []

        data = [
            {
                'id': str(c.id),
                'title': c.title,
                'template_type': c.template_type,
                'message_body': c.message_body,
                'target_audience': c.target_audience,
                'total_recipients': c.total_recipients,
                'sent_count': c.sent_count,
                'failed_count': c.failed_count,
                'status': c.status,
                'created_at': c.created_at,
                'completed_at': c.completed_at,
            }
            for c in campaigns
        ]

        return Response(data)

