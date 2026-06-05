"""
WhatsApp Web Provider for DentFlow.

Calls the Node.js whatsapp-service microservice to send messages
from the clinic's own connected WhatsApp account.

CRITICAL BEHAVIOUR:
- Messages are sent exclusively from the CLINIC'S connected WhatsApp number.
- DentFlow never uses a shared company number.
- If the clinic's session is not CONNECTED, the send fails immediately — no fallback.
- Each clinic has a completely isolated session identified by its clinic ID.
"""

import logging
import requests
from django.conf import settings
from .base import BaseWhatsAppProvider

logger = logging.getLogger('dentflow.notifications')


class WhatsAppWebProvider(BaseWhatsAppProvider):
    """
    Sends WhatsApp messages via the Node.js whatsapp-service microservice.
    Messages are always sent from the clinic's own connected WhatsApp account.
    """

    def __init__(self, clinic_id: str):
        self.clinic_id = str(clinic_id)
        self.base_url = getattr(settings, 'WHATSAPP_SERVICE_URL', '').rstrip('/')
        self.secret = getattr(settings, 'WHATSAPP_SERVICE_SECRET', '')
        self.timeout = 30

        if not self.base_url:
            raise RuntimeError(
                "WHATSAPP_SERVICE_URL is not configured. "
                "The WhatsApp microservice URL must be set."
            )

    def _headers(self):
        return {
            'Content-Type': 'application/json',
            'X-Service-Secret': self.secret,
        }

    def get_session_status(self) -> dict:
        """
        Returns the current session status dict for this clinic.
        Possible statuses: INITIALIZING, QR_REQUIRED, CONNECTED, DISCONNECTED, RECONNECTING
        """
        try:
            resp = requests.get(
                f"{self.base_url}/sessions/{self.clinic_id}/status",
                headers=self._headers(),
                timeout=self.timeout,
            )
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as e:
            logger.error(f"[Clinic {self.clinic_id}] Failed to fetch session status: {e}")
            return {'status': 'DISCONNECTED', 'error': str(e)}

    def send_whatsapp_message(self, to_number: str, body: str) -> str:
        """
        Send a WhatsApp message from the clinic's own connected account.

        Raises:
            RuntimeError: If the clinic's session is not CONNECTED.
            requests.RequestException: If the microservice call fails.
        """
        # Guard: verify session is connected before attempting to send
        status_data = self.get_session_status()
        if status_data.get('status') != 'CONNECTED':
            raise RuntimeError(
                f"Clinic {self.clinic_id} WhatsApp session is not connected "
                f"(current status: {status_data.get('status', 'UNKNOWN')}). "
                "Reminder not sent. Clinic must reconnect WhatsApp first."
            )

        payload = {'to': to_number, 'message': body}
        resp = requests.post(
            f"{self.base_url}/sessions/{self.clinic_id}/send",
            json=payload,
            headers=self._headers(),
            timeout=self.timeout,
        )
        resp.raise_for_status()
        data = resp.json()

        if not data.get('success'):
            raise RuntimeError(f"Microservice returned failure: {data}")

        # Return recipient chat ID as message identifier
        return data.get('to', to_number)
