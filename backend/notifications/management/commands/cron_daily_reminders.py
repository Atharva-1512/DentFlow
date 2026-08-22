import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from notifications.services import (
    generate_patient_reminders,
    generate_clinic_summaries,
    dispatch_pending_reminders,
)


class Command(BaseCommand):
    help = (
        'DentFlow Centralized WhatsApp Notification Engine.\n'
        '1. Evening 7 PM IST (--slot evening): Sends tomorrow\'s clinic summary with treatments, '
        'and prepares 3-hour prior patient reminders.\n'
        '2. Periodic (--slot dispatch): Dispatches all patient reminders due 3 hours before appointment time.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--slot',
            type=str,
            choices=['evening', 'morning', 'dispatch', 'all'],
            default='dispatch',
            help=(
                'evening = 7 PM IST slot (generates tomorrow\'s patient queue & sends clinic summary), '
                'morning = 7 AM slot (refreshes today\'s patient queue), '
                'dispatch = sends all pending 3-hour reminders currently due, '
                'all = generates queue and dispatches'
            )
        )

    def handle(self, *args, **options):
        target_date = timezone.localtime(timezone.now()).date()
        slot = options['slot']

        self.stdout.write(f"=== DentFlow WhatsApp Engine: Date {target_date} | Slot: {slot} ===")

        if slot in ('evening', 'all'):
            self._run_evening_slot(target_date)

        if slot in ('morning', 'all'):
            self._run_morning_slot(target_date)

        # Dispatch all pending notifications that are due
        dispatched = dispatch_pending_reminders()
        self.stdout.write(self.style.SUCCESS(
            f"  Dispatched WhatsApp notifications: Sent={dispatched.get('sent', 0)}, "
            f"Failed={dispatched.get('failed', 0)}"
        ))
        self.stdout.write(self.style.SUCCESS("=== Engine run complete ==="))

    def _run_evening_slot(self, target_date):
        """7 PM IST: Generates tomorrow's patient 3-hour reminders + dispatches clinic summary with treatments."""
        self.stdout.write("--- Evening Slot (7:00 PM IST) ---")
        tomorrow = target_date + datetime.timedelta(days=1)

        # 1. Pre-generate tomorrow's patient 3-hour reminders
        patient_count = generate_patient_reminders(tomorrow)
        self.stdout.write(self.style.SUCCESS(
            f"  Generated {patient_count} patient 3-hour reminders for tomorrow ({tomorrow})."
        ))

        # 2. Generate and queue clinic summary for tomorrow's appointments
        clinic_count = generate_clinic_summaries(target_date, is_previous_day=True)
        self.stdout.write(self.style.SUCCESS(
            f"  Generated {clinic_count} clinic evening summaries with treatment details."
        ))

    def _run_morning_slot(self, target_date):
        """7 AM IST: Ensures today's appointments are queued for 3-hour prior reminder."""
        self.stdout.write("--- Morning Slot (7:00 AM IST) ---")
        patient_count = generate_patient_reminders(target_date)
        self.stdout.write(self.style.SUCCESS(
            f"  Queued {patient_count} patient 3-hour reminders for today ({target_date})."
        ))
