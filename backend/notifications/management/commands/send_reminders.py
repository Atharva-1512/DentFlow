from django.core.management.base import BaseCommand
from notifications.services import send_pending_reminders

class Command(BaseCommand):
    help = 'Dispatches all pending scheduled notifications that are due for delivery.'

    def handle(self, *args, **options):
        self.stdout.write("Checking for pending reminders to send...")
        sent_count = send_pending_reminders()
        
        if sent_count > 0:
            self.stdout.write(self.style.SUCCESS(f"Successfully sent {sent_count} reminders."))
        else:
            self.stdout.write("No pending reminders due for delivery.")
        
        return
