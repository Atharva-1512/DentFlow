class BaseWhatsAppProvider:
    """
    Abstract interface for WhatsApp notification providers.
    """
    def send_whatsapp_message(self, to_number: str, body: str) -> str:
        """
        Sends a WhatsApp message and returns the provider's message identifier (SID).
        Raises an exception if the dispatch fails.
        """
        raise NotImplementedError("Subclasses must implement send_whatsapp_message")
