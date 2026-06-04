import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.dateparse import parse_date
from notifications.services import generate_patient_reminders, generate_clinic_summaries

class Command(BaseCommand):
    help = 'Generates scheduled patient same-day reminders and clinic owner summaries.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date', 
            type=str, 
            help='Target date in YYYY-MM-DD format (defaults to today)'
        )

    def handle(self, *args, **options):
        date_str = options.get('date')
        if date_str:
            target_date = parse_date(date_str)
            if not target_date:
                self.stderr.write(self.style.ERROR(f"Invalid date format: {date_str}. Must be YYYY-MM-DD."))
                return
        else:
            target_date = timezone.now().date()

        self.stdout.write(f"Generating reminders for target date: {target_date}...")

        # 1. Generate patient same-day reminders (for today)
        patient_count = generate_patient_reminders(target_date)
        self.stdout.write(self.style.SUCCESS(f"Generated {patient_count} patient same-day reminders."))

        # 2. Generate clinic same-day summaries (for today)
        same_day_count = generate_clinic_summaries(target_date, is_previous_day=False)
        self.stdout.write(self.style.SUCCESS(f"Generated {same_day_count} clinic same-day summaries."))

        # 3. Generate clinic previous-day summaries (tomorrow's summary generated today)
        prev_day_count = generate_clinic_summaries(target_date, is_previous_day=True)
        self.stdout.write(self.style.SUCCESS(f"Generated {prev_day_count} clinic previous-day summaries."))
