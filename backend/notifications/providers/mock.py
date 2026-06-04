import uuid
import logging
from .base import BaseWhatsAppProvider

logger = logging.getLogger('dentflow.notifications')

class MockWhatsAppProvider(BaseWhatsAppProvider):
    """
    Mock provider for local testing and developer preview.
    """
    def send_whatsapp_message(self, to_number: str, body: str) -> str:
        mock_sid = f"SMmock_{uuid.uuid4().hex[:12]}"
        logger.info(
            f"MOCK WHATSAPP DISPATCH\n"
            f"To: {to_number}\n"
            f"Body: {body}\n"
            f"Mock SID: {mock_sid}"
        )
        return mock_sid
