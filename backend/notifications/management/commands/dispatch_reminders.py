"""
Management command: dispatch_reminders
Generates and dispatches pending WhatsApp appointment reminders from the DentFlow centralized number.

Usage:
  python manage.py dispatch_reminders --slot evening    # 7 PM IST — generates tomorrow's patient 3-hr queue & sends clinic summary
  python manage.py dispatch_reminders --slot dispatch   # Periodic — dispatches all pending 3-hr reminders due now
  python manage.py dispatch_reminders --slot morning    # 7 AM IST — refreshes today's patient queue
"""

import datetime
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone

from notifications.services import (
    generate_patient_reminders,
    generate_clinic_summaries,
    dispatch_pending_reminders,
)

logger = logging.getLogger('dentflow.notifications')


class Command(BaseCommand):
    help = 'Generate and dispatch WhatsApp appointment reminders from DentFlow centralized sender'

    def add_arguments(self, parser):
        parser.add_argument(
            '--slot',
            type=str,
            choices=['evening', 'morning', 'dispatch', 'all'],
            default='dispatch',
            help='evening = 7 PM IST (summary + tomorrow queue), dispatch = send due 3-hr reminders, morning = 7 AM queue refresh',
        )

    def handle(self, *args, **options):
        slot = options['slot']
        target_date = timezone.localtime(timezone.now()).date()

        self.stdout.write(self.style.NOTICE(
            f"[dispatch_reminders] Executing slot={slot} for date={target_date}"
        ))

        created = {}
        if slot in ('evening', 'all'):
            tomorrow = target_date + datetime.timedelta(days=1)
            created['tomorrow_patient_3hr'] = generate_patient_reminders(tomorrow)
            created['clinic_evening_summary'] = generate_clinic_summaries(target_date, is_previous_day=True)
        elif slot == 'morning':
            created['today_patient_3hr'] = generate_patient_reminders(target_date)

        if created:
            self.stdout.write(f"Generated reminders: {created}")

        dispatched = dispatch_pending_reminders()
        self.stdout.write(self.style.SUCCESS(
            f"Dispatched: sent={dispatched.get('sent', 0)} "
            f"skipped={dispatched.get('skipped', 0)} "
            f"failed={dispatched.get('failed', 0)}"
        ))

