import hmac
import hashlib
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from .services import (
    generate_patient_reminders,
    generate_clinic_summaries,
    send_pending_reminders,
)
from django.utils import timezone


@csrf_exempt
def trigger_reminders(request, slot):
    """
    POST /api/notifications/trigger/<slot>/
    External cron calls this endpoint to generate + dispatch reminders.
    slot must be 'morning', 'evening', or 'both'.
    Secured via X-Cron-Secret header matching CRON_SECRET env var.
    """
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed.'}, status=405)

    # Verify cron secret
    cron_secret = getattr(settings, 'CRON_SECRET', '')
    if cron_secret:
        request_secret = request.headers.get('X-Cron-Secret', '')
        if not hmac.compare_digest(cron_secret, request_secret):
            return JsonResponse({'detail': 'Invalid cron secret.'}, status=403)

    target_date = timezone.localtime(timezone.now()).date()
    results = {}

    if slot in ('morning', 'both'):
        results['patient_reminders'] = generate_patient_reminders(target_date)
        results['same_day_summaries'] = generate_clinic_summaries(target_date, is_previous_day=False)

    if slot in ('evening', 'both'):
        results['prev_day_summaries'] = generate_clinic_summaries(target_date, is_previous_day=True)

    results['dispatched'] = send_pending_reminders()

    return JsonResponse({'date': str(target_date), 'slot': slot, 'results': results})
