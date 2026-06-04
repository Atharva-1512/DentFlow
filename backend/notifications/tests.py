from unittest.mock import MagicMock, patch
from django.test import TestCase
from django.utils import timezone
from clinics.models import Clinic
from notifications.models import NotificationLog, RecipientType, NotificationType
from notifications.providers.base import BaseWhatsAppProvider
from notifications.providers.twilio import TwilioWhatsAppProvider
from notifications.whatsapp_service import WhatsAppService

class MockCustomWhatsAppProvider(BaseWhatsAppProvider):
    def __init__(self, should_fail=False):
        self.should_fail = should_fail
        self.sent_messages = []

    def send_whatsapp_message(self, to_number: str, body: str) -> str:
        if self.should_fail:
            raise Exception("Mock provider simulated network failure.")
        self.sent_messages.append({'to': to_number, 'body': body})
        return "SMmock_custom_12345"


class WhatsAppIntegrationTest(TestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(
            name="Test Dental Clinic",
            slug="test-dental",
            is_active=True,
            notification_whatsapp_number="9876543210"
        )
        
    def test_phone_number_normalization(self):
        service = WhatsAppService(provider=MockCustomWhatsAppProvider())
        
        # Test standard 10-digit Indian number
        self.assertEqual(service.normalize_phone("9876543210"), "+919876543210")
        # Test number with spaces and formatting
        self.assertEqual(service.normalize_phone("  98765 43210 "), "+919876543210")
        # Test international formatting
        self.assertEqual(service.normalize_phone("+1 415 523 8886"), "+14155238886")

    def test_invalid_phone_numbers(self):
        service = WhatsAppService(provider=MockCustomWhatsAppProvider())
        
        # Test letters
        with self.assertRaises(ValueError):
            service.normalize_phone("not-a-phone-number")
        
        # Test too short
        with self.assertRaises(ValueError):
            service.normalize_phone("123")

    def test_successful_dispatch_and_tracking(self):
        provider = MockCustomWhatsAppProvider()
        service = WhatsAppService(provider=provider)
        
        log = NotificationLog.objects.create(
            clinic=self.clinic,
            recipient_type=RecipientType.PATIENT,
            recipient_value="9876543210",
            message="Your appointment is scheduled.",
            scheduled_for=timezone.now(),
            notification_type=NotificationType.PATIENT_SAME_DAY
        )
        
        sent_count = service.dispatch_pending()
        self.assertEqual(sent_count, 1)
        
        # Verify status updates in DB
        log.refresh_from_db()
        self.assertEqual(log.status, 'SENT')
        self.assertTrue(log.sent)
        self.assertEqual(log.provider_message_id, "SMmock_custom_12345")
        
        # Verify provider received correct message details
        self.assertEqual(len(provider.sent_messages), 1)
        self.assertEqual(provider.sent_messages[0]['to'], "+919876543210")
        self.assertEqual(provider.sent_messages[0]['body'], "Your appointment is scheduled.")

    def test_failed_dispatch_and_tracking(self):
        provider = MockCustomWhatsAppProvider(should_fail=True)
        service = WhatsAppService(provider=provider)
        
        log = NotificationLog.objects.create(
            clinic=self.clinic,
            recipient_type=RecipientType.PATIENT,
            recipient_value="9876543210",
            message="Your appointment is scheduled.",
            scheduled_for=timezone.now(),
            notification_type=NotificationType.PATIENT_SAME_DAY
        )
        
        sent_count = service.dispatch_pending()
        self.assertEqual(sent_count, 0)
        
        # Verify status updates to FAILED in DB
        log.refresh_from_db()
        self.assertEqual(log.status, 'FAILED')
        self.assertFalse(log.sent)

    def test_invalid_phone_log_failure_state(self):
        service = WhatsAppService(provider=MockCustomWhatsAppProvider())
        
        log = NotificationLog.objects.create(
            clinic=self.clinic,
            recipient_type=RecipientType.PATIENT,
            recipient_value="invalid-number-123",
            message="This should fail.",
            scheduled_for=timezone.now(),
            notification_type=NotificationType.PATIENT_SAME_DAY
        )
        
        sent_count = service.dispatch_pending()
        self.assertEqual(sent_count, 0)
        
        log.refresh_from_db()
        self.assertEqual(log.status, 'FAILED')

    def test_clinic_specific_routing(self):
        provider = MockCustomWhatsAppProvider()
        service = WhatsAppService(provider=provider)
        
        # summary recipient_value is usually email, which is ignored
        log = NotificationLog.objects.create(
            clinic=self.clinic,
            recipient_type=RecipientType.CLINIC,
            recipient_value="doctor@clinic.com",
            message="Daily summary: 5 appointments.",
            scheduled_for=timezone.now(),
            notification_type=NotificationType.CLINIC_SAME_DAY
        )
        
        sent_count = service.dispatch_pending()
        self.assertEqual(sent_count, 1)
        
        log.refresh_from_db()
        self.assertEqual(log.status, 'SENT')
        
        # Verify summary was routed to clinic.notification_whatsapp_number ("+919876543210")
        self.assertEqual(len(provider.sent_messages), 1)
        self.assertEqual(provider.sent_messages[0]['to'], "+919876543210")

    @patch('notifications.providers.twilio.Client')
    def test_twilio_provider_instantiation_and_send(self, mock_twilio_client):
        # Configure settings mock
        from django.conf import settings
        with self.settings(
            TWILIO_ACCOUNT_SID="ACtest_sid",
            TWILIO_AUTH_TOKEN="test_token",
            TWILIO_WHATSAPP_FROM="+14155238886"
        ):
            provider = TwilioWhatsAppProvider()
            
            # Setup Twilio client mock return value
            mock_message = MagicMock()
            mock_message.sid = "SMtwilio_sid_123"
            mock_twilio_client.return_value.messages.create.return_value = mock_message
            
            sid = provider.send_whatsapp_message("+919876543210", "Hello via Twilio")
            self.assertEqual(sid, "SMtwilio_sid_123")
            
            # Assert client was called with correct parameters
            mock_twilio_client.return_value.messages.create.assert_called_once_with(
                body="Hello via Twilio",
                from_="whatsapp:+14155238886",
                to="whatsapp:+919876543210"
            )
