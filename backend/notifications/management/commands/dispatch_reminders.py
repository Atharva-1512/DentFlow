"""
Management command: dispatch_reminders
Generates and dispatches pending WhatsApp appointment reminders.

Usage:
  python manage.py dispatch_reminders --slot morning   # 7 AM IST — SAME_DAY
  python manage.py dispatch_reminders --slot evening   # 7 PM IST — DAY_BEFORE

This command replaces the old cron_daily_reminders, generate_reminders,
and send_reminders commands. All messages are sent from each clinic's own
connected WhatsApp account via the Node.js whatsapp-service microservice.

Clinics without an active WhatsApp session will have their reminders SKIPPED.
"""

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
    help = 'Generate and dispatch WhatsApp appointment reminders for a given slot'

    def add_arguments(self, parser):
        parser.add_argument(
            '--slot',
            type=str,
            choices=['morning', 'evening'],
            required=True,
            help='morning = 7 AM IST (same-day reminders), evening = 7 PM IST (day-before preview)',
        )

    def handle(self, *args, **options):
        slot = options['slot']
        target_date = timezone.localtime(timezone.now()).date()

        self.stdout.write(self.style.NOTICE(
            f"[dispatch_reminders] Starting slot={slot} for date={target_date}"
        ))

        created = {}
        if slot == 'morning':
            created['patient_reminders'] = generate_patient_reminders(target_date)
            created['clinic_same_day'] = generate_clinic_summaries(target_date, is_previous_day=False)
        else:  # evening
            created['clinic_prev_day'] = generate_clinic_summaries(target_date, is_previous_day=True)

        self.stdout.write(f"Created reminders: {created}")

        dispatched = dispatch_pending_reminders()
        self.stdout.write(self.style.SUCCESS(
            f"Dispatched: sent={dispatched['sent']} "
            f"skipped={dispatched['skipped']} "
            f"failed={dispatched['failed']}"
        ))
