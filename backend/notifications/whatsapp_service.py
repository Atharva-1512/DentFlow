import logging
import phonenumbers
from django.conf import settings
from django.utils import timezone
from clinics.models import Clinic
from notifications.models import NotificationLog, RecipientType
from notifications.providers.twilio import TwilioWhatsAppProvider

logger = logging.getLogger('dentflow.notifications')

class WhatsAppService:
    """
    Service layer coordinating phone normalization, routing logic,
    and provider dispatch for multi-tenant notifications.
    """
    def __init__(self, provider=None):
        if provider:
            self.provider = provider
        else:
            from django.conf import settings
            account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
            auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
            
            # Use mock provider if settings are empty or contain default placeholders
            is_mock = (
                not account_sid or
                'placeholder' in account_sid.lower() or
                'your_twilio' in account_sid.lower()
            )
            
            if is_mock:
                from notifications.providers.mock import MockWhatsAppProvider
                self.provider = MockWhatsAppProvider()
            else:
                from notifications.providers.twilio import TwilioWhatsAppProvider
                self.provider = TwilioWhatsAppProvider()

    def normalize_phone(self, phone_str: str) -> str:
        """
        Parses, validates, and normalizes a phone number to E.164 format.
        Raises ValueError if the phone number is invalid.
        """
        try:
            # Clean string
            clean_str = phone_str.strip()
            
            # If it doesn't start with '+', parse it using standard India default ("IN")
            # If it does start with '+', it will parse as international
            parsed = phonenumbers.parse(clean_str, "IN")
            
            if not phonenumbers.is_valid_number(parsed):
                raise ValueError("Invalid phone number structure according to rules.")
                
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        except Exception as e:
            raise ValueError(f"Phone validation/normalization failed: {str(e)}")

    def dispatch_pending(self) -> int:
        now = timezone.now()
        pending_logs = NotificationLog.objects.filter(
            status='PENDING',
            scheduled_for__lte=now
        ).select_related('clinic')

        sent_count = 0

        for log in pending_logs:
            clinic = log.clinic
            target_phone = None

            if log.recipient_type == RecipientType.PATIENT:
                # Patient reminders use mobile_number from patient profile (stored in recipient_value)
                target_phone = log.recipient_value
            elif log.recipient_type == RecipientType.CLINIC:
                # Doctor daily summaries pull notification_whatsapp_number from clinic configuration
                target_phone = getattr(clinic, 'notification_whatsapp_number', None)
                if not target_phone:
                    from notifications.providers.mock import MockWhatsAppProvider
                    if isinstance(self.provider, MockWhatsAppProvider):
                        target_phone = "+919876543210"
                    else:
                        logger.warning(
                            f"Clinic {clinic.name} has no notification_whatsapp_number configured. "
                            f"Skipping summary log ID {log.id}."
                        )
                        log.status = 'FAILED'
                        log.save(update_fields=['status'])
                        continue

            # Normalize and validate target phone number
            try:
                normalized_phone = self.normalize_phone(target_phone)
            except ValueError as e:
                logger.error(
                    f"NotificationLog ID {log.id} failed validation check: {str(e)}. "
                    f"Setting status to FAILED."
                )
                log.status = 'FAILED'
                log.save(update_fields=['status'])
                continue

            # Dispatch via configured provider
            try:
                logger.info(f"Dispatching WhatsApp message to {normalized_phone} via provider...")
                msg_sid = self.provider.send_whatsapp_message(normalized_phone, log.message)
                
                log.status = 'SENT'
                log.sent = True
                log.sent_at = timezone.now()
                log.provider_message_id = msg_sid
                log.save(update_fields=['status', 'sent', 'sent_at', 'provider_message_id'])
                
                sent_count += 1
                logger.info(f"NotificationLog ID {log.id} successfully sent. Provider SID: {msg_sid}")
            except Exception as e:
                logger.error(f"Failed to dispatch message for NotificationLog ID {log.id}: {str(e)}")
                log.status = 'FAILED'
                log.save(update_fields=['status'])

        return sent_count
