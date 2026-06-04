from django.conf import settings
from twilio.rest import Client
from .base import BaseWhatsAppProvider

class TwilioWhatsAppProvider(BaseWhatsAppProvider):
    """
    Twilio concrete provider for sending WhatsApp messages using the official Twilio Python SDK.
    """
    def __init__(self):
        self.account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
        self.auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
        self.from_number = getattr(settings, 'TWILIO_WHATSAPP_FROM', '')

        if not self.account_sid or not self.auth_token:
            raise ValueError("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be configured in settings.")

        # Ensure from_number starts with "whatsapp:"
        if self.from_number and not self.from_number.startswith('whatsapp:'):
            self.from_number = f"whatsapp:{self.from_number}"

        self.client = Client(self.account_sid, self.auth_token)

    def send_whatsapp_message(self, to_number: str, body: str) -> str:
        # Ensure recipient number starts with "whatsapp:"
        to_formatted = to_number
        if not to_formatted.startswith('whatsapp:'):
            to_formatted = f"whatsapp:{to_formatted}"

        message = self.client.messages.create(
            body=body,
            from_=self.from_number,
            to=to_formatted
        )
        return message.sid
