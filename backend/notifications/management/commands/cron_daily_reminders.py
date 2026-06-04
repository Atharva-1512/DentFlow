from django.core.management.base import BaseCommand
from notifications.services import (
    generate_patient_reminders,
    generate_clinic_summaries,
    send_pending_reminders,
)
from django.utils import timezone


class Command(BaseCommand):
    help = (
        'Cron job for DentFlow WhatsApp notifications. '
        'Run at 7 AM IST and 7 PM IST daily. '
        'At 7 AM: sends patient reminders + doctor same-day summary. '
        'At 7 PM: sends doctor next-day summary.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--slot',
            type=str,
            choices=['morning', 'evening', 'both'],
            default='both',
            help=(
                'morning=7 AM slot (patient reminders + same-day clinic summary), '
                'evening=7 PM slot (next-day clinic summary), '
                'both=run both slots back-to-back'
            )
        )

    def handle(self, *args, **options):
        # Use IST-local date since TIME_ZONE is Asia/Kolkata
        target_date = timezone.localtime(timezone.now()).date()
        slot = options['slot']

        self.stdout.write(f"=== DentFlow Reminder Cron: {target_date} | Slot: {slot} ===")

        if slot in ('morning', 'both'):
            self._run_morning_slot(target_date)

        if slot in ('evening', 'both'):
            self._run_evening_slot(target_date)

        # Dispatch all pending notifications that are due
        sent_count = send_pending_reminders()
        self.stdout.write(self.style.SUCCESS(
            f"  Dispatched {sent_count} WhatsApp notifications."
        ))

        self.stdout.write(self.style.SUCCESS("=== Cron complete ==="))

    def _run_morning_slot(self, target_date):
        """7 AM IST: Patient reminders + Doctor same-day summary."""
        self.stdout.write("--- Morning Slot (7 AM IST) ---")

        # 1. Patient same-day reminders (7 AM IST)
        patient_count = generate_patient_reminders(target_date)
        self.stdout.write(self.style.SUCCESS(
            f"  Generated {patient_count} patient same-day reminders."
        ))

        # 2. Clinic same-day summaries (7 AM IST - today's list to doctor)
        same_day_count = generate_clinic_summaries(target_date, is_previous_day=False)
        self.stdout.write(self.style.SUCCESS(
            f"  Generated {same_day_count} clinic same-day summaries."
        ))

    def _run_evening_slot(self, target_date):
        """7 PM IST: Doctor gets tomorrow's appointment list."""
        self.stdout.write("--- Evening Slot (7 PM IST) ---")

        # Clinic previous-day summaries (7 PM IST - tomorrow's list to doctor)
        prev_day_count = generate_clinic_summaries(target_date, is_previous_day=True)
        self.stdout.write(self.style.SUCCESS(
            f"  Generated {prev_day_count} clinic next-day (tomorrow) summaries."
        ))
