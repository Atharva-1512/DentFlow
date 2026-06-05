from django.core.management.base import BaseCommand
from notifications.services import dispatch_pending_reminders

class Command(BaseCommand):
    help = 'Dispatches all pending scheduled notifications that are due for delivery.'

    def handle(self, *args, **options):
        self.stdout.write("Checking for pending reminders to send...")
        dispatched = dispatch_pending_reminders()
        sent_count = dispatched.get('sent', 0)
        
        if sent_count > 0:
            self.stdout.write(self.style.SUCCESS(f"Successfully sent {sent_count} reminders."))
        else:
            self.stdout.write("No pending reminders due for delivery.")
        
        return

