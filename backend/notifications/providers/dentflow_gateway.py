"""
Centralized DentFlow WhatsApp Gateway Provider.

All notifications (patient 3-hour reminders and clinic evening summaries)
are sent exclusively from the centralized DentFlow WhatsApp number.
"""

import re
import uuid
import logging
import requests
from django.conf import settings
from .base import BaseWhatsAppProvider

logger = logging.getLogger('dentflow.notifications')


class DentFlowWhatsAppProvider(BaseWhatsAppProvider):
    """
    Centralized WhatsApp Provider for DentFlow.
    Dispatches outbound messages using the configured provider:
    - 'mock': Local simulation with full payload logging.
    - 'meta': Meta WhatsApp Cloud API (Graph API).
    - 'twilio': Twilio WhatsApp Messaging API.
    - 'gateway': Generic HTTP Webhook Gateway.
    """

    def __init__(self):
        self.sender_number = getattr(settings, 'DENTFLOW_WHATSAPP_NUMBER', '+919876543210')
        self.provider_type = getattr(settings, 'WHATSAPP_PROVIDER', 'mock').lower()

    def send_whatsapp_message(self, to_number: str, body: str) -> str:
        """
        Dispatch a WhatsApp message to `to_number` from the DentFlow mobile number.
        Returns the provider message ID (SID).
        """
        # Normalize phone number (strip whitespace, ensure country code)
        cleaned_to = str(to_number).strip().replace(" ", "").replace("-", "")
        if not cleaned_to.startswith("+") and len(cleaned_to) == 10:
            cleaned_to = f"+91{cleaned_to}"  # Default India code if 10 digits

        logger.info(
            f"[DentFlow WhatsApp Gateway] Sending message via provider '{self.provider_type}' "
            f"from {self.sender_number} to {cleaned_to}"
        )

        if self.provider_type == 'meta':
            return self._send_meta(cleaned_to, body)
        elif self.provider_type == 'twilio':
            return self._send_twilio(cleaned_to, body)
        elif self.provider_type == 'gateway':
            return self._send_gateway(cleaned_to, body)
        else:
            return self._send_mock(cleaned_to, body)

    def _send_meta(self, to_number: str, body: str) -> str:
        phone_number_id = getattr(settings, 'WHATSAPP_CLOUD_API_PHONE_NUMBER_ID', '')
        access_token = getattr(settings, 'WHATSAPP_CLOUD_API_ACCESS_TOKEN', '')

        if not phone_number_id or not access_token:
            raise RuntimeError(
                "Meta WhatsApp Cloud API credentials missing: "
                "WHATSAPP_CLOUD_API_PHONE_NUMBER_ID or WHATSAPP_CLOUD_API_ACCESS_TOKEN not set."
            )

        url = f"https://graph.facebook.com/v19.0/{phone_number_id}/messages"
        headers = {
            'Authorization': f"Bearer {access_token}",
            'Content-Type': 'application/json',
        }
        payload = {
            'messaging_product': 'whatsapp',
            'recipient_type': 'individual',
            'to': to_number.replace('+', ''),
            'type': 'text',
            'text': {'preview_url': False, 'body': body},
        }

        resp = requests.post(url, json=payload, headers=headers, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        messages = data.get('messages', [])
        if messages:
            return messages[0].get('id', 'meta_msg_sent')
        return 'meta_msg_sent'

    def _send_twilio(self, to_number: str, body: str) -> str:
        account_sid = getattr(settings, 'WHATSAPP_TWILIO_ACCOUNT_SID', '')
        auth_token = getattr(settings, 'WHATSAPP_TWILIO_AUTH_TOKEN', '')

        if not account_sid or not auth_token:
            raise RuntimeError(
                "Twilio WhatsApp credentials missing: "
                "WHATSAPP_TWILIO_ACCOUNT_SID or WHATSAPP_TWILIO_AUTH_TOKEN not set."
            )

        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        from_number = self.sender_number if self.sender_number.startswith('whatsapp:') else f"whatsapp:{self.sender_number}"
        dest_number = to_number if to_number.startswith('whatsapp:') else f"whatsapp:{to_number}"

        resp = requests.post(
            url,
            data={'From': from_number, 'To': dest_number, 'Body': body},
            auth=(account_sid, auth_token),
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get('sid', 'twilio_msg_sent')

    def _send_gateway(self, to_number: str, body: str) -> str:
        base_url = getattr(settings, 'WHATSAPP_GATEWAY_URL', '').rstrip('/')
        secret = getattr(settings, 'WHATSAPP_GATEWAY_SECRET', '')
        instance_name = getattr(settings, 'WHATSAPP_INSTANCE_NAME', 'dentflow')

        if not base_url:
            raise RuntimeError("WHATSAPP_GATEWAY_URL is not configured in settings or .env.")

        # Sanitize number: Evolution API and WhatsApp web expect numeric digits (e.g. 919876543210)
        digits_only = re.sub(r'\D', '', str(to_number))
        if len(digits_only) == 10:
            digits_only = f"91{digits_only}"  # Default India country code if 10 digits

        # Determine target URL:
        # If the user supplied a general server base URL like http://localhost:8080 or https://evo.myclinic.com
        if '/message/' not in base_url and not base_url.endswith('/send'):
            target_url = f"{base_url}/message/sendText/{instance_name}"
        else:
            target_url = base_url

        headers = {
            'Content-Type': 'application/json',
            'apikey': secret,
            'X-Gateway-Secret': secret,
        }
        if secret:
            headers['Authorization'] = f"Bearer {secret}"

        # Evolution API payload schema + generic webhook schema compatibility
        payload = {
            'number': digits_only,
            'text': body,
            'to': digits_only,
            'body': body,
            'sender': self.sender_number,
        }

        resp = requests.post(target_url, json=payload, headers=headers, timeout=25)
        resp.raise_for_status()
        data = resp.json()
        
        # Extract message ID across Evolution API, Baileys, and generic gateways
        key_id = data.get('key', {}).get('id') if isinstance(data.get('key'), dict) else None
        return key_id or data.get('message_id') or data.get('id') or 'gateway_msg_sent'

    def _send_mock(self, to_number: str, body: str) -> str:
        mock_id = f"DF_WA_{uuid.uuid4().hex[:12].upper()}"
        logger.info(
            f"\n"
            f"╔══════════════════════════════════════════════════════════════\n"
            f"║ 🦷 DENTFLOW CENTRAL WHATSAPP DISPATCH (MOCK)\n"
            f"╠══════════════════════════════════════════════════════════════\n"
            f"║ From: {self.sender_number}\n"
            f"║ To:   {to_number}\n"
            f"║ ID:   {mock_id}\n"
            f"╟──────────────────────────────────────────────────────────────\n"
            f"{body}\n"
            f"╚══════════════════════════════════════════════════════════════"
        )
        return mock_id
