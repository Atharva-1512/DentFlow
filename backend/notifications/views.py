"""
Notification Views — DentFlow

Provides REST API endpoints for:
1. WhatsApp session management (connect, status/QR, disconnect)
2. Cron-triggered reminder generation + dispatch
3. Stats for the dashboard
"""

import hmac
import logging
import requests
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import WhatsAppSession, ReminderHistory, ReminderStatus
from .services import (
    generate_patient_reminders,
    generate_clinic_summaries,
    dispatch_pending_reminders,
)

logger = logging.getLogger('dentflow.notifications')


def _whatsapp_service_headers():
    return {
        'Content-Type': 'application/json',
        'X-Service-Secret': getattr(settings, 'WHATSAPP_SERVICE_SECRET', ''),
    }


def _wa_service_url():
    return getattr(settings, 'WHATSAPP_SERVICE_URL', '').rstrip('/')


# ─── WhatsApp Session: Connect ────────────────────────────────────────────────

class WhatsAppConnectView(APIView):
    """
    POST /api/notifications/whatsapp/connect/
    Tells the Node.js microservice to start a WhatsApp session for this clinic.
    The clinic must then scan the generated QR code.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        clinic = getattr(request.user, 'clinic', None)
        if not clinic:
            return Response({'detail': 'No clinic associated.'}, status=status.HTTP_403_FORBIDDEN)

        clinic_id = str(clinic.id)
        base_url = _wa_service_url()
        if not base_url:
            return Response(
                {'detail': 'WhatsApp service is not configured.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            resp = requests.post(
                f"{base_url}/sessions/{clinic_id}/start",
                headers=_whatsapp_service_headers(),
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()

            # Upsert session record
            session, _ = WhatsAppSession.objects.get_or_create(clinic=clinic)
            session.status = data.get('status', 'INITIALIZING')
            session.save(update_fields=['status', 'updated_at'])

            return Response({'detail': 'Session starting. Poll /status for QR code.', **data})
        except requests.RequestException as e:
            logger.error(f"[WhatsAppConnectView] {e}")
            return Response(
                {'detail': f'Could not reach WhatsApp service: {e}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


# ─── WhatsApp Session: Status + QR ───────────────────────────────────────────

class WhatsAppStatusView(APIView):
    """
    GET /api/notifications/whatsapp/status/
    Returns session status and QR code (as base64 data URL) for this clinic.
    Poll this every 3 seconds while status == QR_REQUIRED.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        clinic = getattr(request.user, 'clinic', None)
        if not clinic:
            return Response({'detail': 'No clinic associated.'}, status=status.HTTP_403_FORBIDDEN)

        clinic_id = str(clinic.id)
        base_url = _wa_service_url()

        if not base_url:
            return Response({'status': 'SERVICE_UNAVAILABLE', 'detail': 'WhatsApp service not configured.'})

        try:
            # Get status
            status_resp = requests.get(
                f"{base_url}/sessions/{clinic_id}/status",
                headers=_whatsapp_service_headers(),
                timeout=10,
            )
            status_resp.raise_for_status()
            status_data = status_resp.json()

            # Sync local DB record
            session, _ = WhatsAppSession.objects.get_or_create(clinic=clinic)
            new_status = status_data.get('status', 'DISCONNECTED')
            phone_info = status_data.get('phoneInfo') or {}

            session.status = new_status
            if new_status == 'CONNECTED' and phone_info:
                session.connected_number = phone_info.get('number', '')
                session.connected_name = phone_info.get('name', '')
            elif new_status == 'DISCONNECTED':
                session.connected_number = None
                session.connected_name = None
            session.save(update_fields=['status', 'connected_number', 'connected_name', 'updated_at'])

            payload = {
                'status': new_status,
                'connected_number': session.connected_number,
                'connected_name': session.connected_name,
                'last_activity': session.last_activity,
                'qr_data_url': None,
            }

            # Fetch QR if needed
            if new_status == 'QR_REQUIRED':
                try:
                    qr_resp = requests.get(
                        f"{base_url}/sessions/{clinic_id}/qr",
                        headers=_whatsapp_service_headers(),
                        timeout=10,
                    )
                    if qr_resp.status_code == 200:
                        payload['qr_data_url'] = qr_resp.json().get('qrDataUrl')
                except requests.RequestException:
                    pass

            return Response(payload)

        except requests.RequestException as e:
            logger.warning(f"[WhatsAppStatusView] Could not reach microservice: {e}")
            # Return local DB status as fallback
            try:
                session = WhatsAppSession.objects.get(clinic=clinic)
                return Response({
                    'status': session.status,
                    'connected_number': session.connected_number,
                    'connected_name': session.connected_name,
                    'last_activity': session.last_activity,
                    'qr_data_url': None,
                    'warning': 'WhatsApp service unreachable, showing cached status.',
                })
            except WhatsAppSession.DoesNotExist:
                return Response({'status': 'DISCONNECTED', 'warning': 'WhatsApp service unreachable.'})


# ─── WhatsApp Session: Disconnect ─────────────────────────────────────────────

class WhatsAppDisconnectView(APIView):
    """
    POST /api/notifications/whatsapp/disconnect/
    Logs out and destroys the clinic's WhatsApp session.
    The clinic must scan QR again to reconnect.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        clinic = getattr(request.user, 'clinic', None)
        if not clinic:
            return Response({'detail': 'No clinic associated.'}, status=status.HTTP_403_FORBIDDEN)

        clinic_id = str(clinic.id)
        base_url = _wa_service_url()

        try:
            if base_url:
                resp = requests.post(
                    f"{base_url}/sessions/{clinic_id}/disconnect",
                    headers=_whatsapp_service_headers(),
                    timeout=15,
                )
                resp.raise_for_status()
        except requests.RequestException as e:
            logger.warning(f"[WhatsAppDisconnectView] Microservice error: {e}")

        # Update local DB regardless
        WhatsAppSession.objects.filter(clinic=clinic).update(
            status='DISCONNECTED',
            connected_number=None,
            connected_name=None,
        )

        return Response({'detail': 'WhatsApp session disconnected successfully.'})


# ─── Stats ────────────────────────────────────────────────────────────────────

class WhatsAppStatsView(APIView):
    """
    GET /api/notifications/whatsapp/stats/
    Returns reminder statistics for the clinic dashboard.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        clinic = getattr(request.user, 'clinic', None)
        if not clinic:
            return Response({'detail': 'No clinic associated.'}, status=status.HTTP_403_FORBIDDEN)

        qs = ReminderHistory.objects.filter(clinic=clinic)
        total = qs.count()
        sent = qs.filter(status=ReminderStatus.SENT).count()
        skipped = qs.filter(status=ReminderStatus.SKIPPED).count()
        failed = qs.filter(status=ReminderStatus.FAILED).count()
        pending = qs.filter(status=ReminderStatus.PENDING).count()

        last_sent = qs.filter(status=ReminderStatus.SENT).order_by('-sent_at').first()

        try:
            session = clinic.whatsapp_session
            session_status = session.status
            connected_number = session.connected_number
            connected_name = session.connected_name
            last_activity = session.last_activity
        except WhatsAppSession.DoesNotExist:
            session_status = 'DISCONNECTED'
            connected_number = None
            connected_name = None
            last_activity = None

        return Response({
            'session': {
                'status': session_status,
                'connected_number': connected_number,
                'connected_name': connected_name,
                'last_activity': last_activity,
            },
            'reminders': {
                'total': total,
                'sent': sent,
                'skipped': skipped,
                'failed': failed,
                'pending': pending,
                'last_sent_at': last_sent.sent_at if last_sent else None,
            },
        })


# ─── Cron Trigger ─────────────────────────────────────────────────────────────

@csrf_exempt
def trigger_reminders(request, slot):
    """
    POST /api/notifications/trigger/<slot>/
    Called by Cron-job.org to generate and dispatch reminders.

    slot values:
      'morning' → 7 AM IST  → SAME_DAY reminders (patient + clinic same-day)
      'evening' → 7 PM IST  → DAY_BEFORE reminders (clinic preview for tomorrow)

    Secured via X-Cron-Secret header.
    """
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed.'}, status=405)

    cron_secret = getattr(settings, 'CRON_SECRET', '')
    if cron_secret:
        request_secret = request.headers.get('X-Cron-Secret', '')
        if not hmac.compare_digest(cron_secret, request_secret):
            return JsonResponse({'detail': 'Invalid cron secret.'}, status=403)

    target_date = timezone.localtime(timezone.now()).date()
    results = {}

    if slot == 'morning':
        results['patient_reminders_created'] = generate_patient_reminders(target_date)
        results['clinic_same_day_created'] = generate_clinic_summaries(target_date, is_previous_day=False)

    elif slot == 'evening':
        results['clinic_prev_day_created'] = generate_clinic_summaries(target_date, is_previous_day=True)

    else:
        return JsonResponse({'detail': f'Unknown slot: {slot}. Use morning or evening.'}, status=400)

    dispatch_results = dispatch_pending_reminders()
    results['dispatched'] = dispatch_results

    logger.info(f"[trigger_reminders] slot={slot} date={target_date} results={results}")
    return JsonResponse({'date': str(target_date), 'slot': slot, 'results': results})
