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
                'patient_reminder_timing': '3 Hours prior to scheduled appointment time',
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

    if slot == 'evening':
        tomorrow = target_date + datetime.timedelta(days=1)
        created['tomorrow_patient_3hr'] = generate_patient_reminders(tomorrow)
        created['clinic_evening_summary'] = generate_clinic_summaries(target_date, is_previous_day=True)
    elif slot == 'morning':
        created['today_patient_3hr'] = generate_patient_reminders(target_date)
        created['clinic_today_summary'] = generate_clinic_summaries(target_date, is_previous_day=False)

    dispatched = dispatch_pending_reminders()

    return JsonResponse({
        'status': 'success',
        'slot': slot,
        'target_date': str(target_date),
        'generated': created,
        'dispatched': dispatched,
    })
