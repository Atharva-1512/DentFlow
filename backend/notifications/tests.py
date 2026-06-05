"""
Tests for the WhatsApp Web notification system.
Tests the new ReminderHistory-based architecture and WhatsApp Web provider.
"""

import datetime
from unittest.mock import MagicMock, patch
from django.test import TestCase
from django.utils import timezone
from clinics.models import Clinic
from appointments.models import Appointment
from patients.models import Patient
from notifications.models import (
    WhatsAppSession,
    ReminderHistory,
    ReminderStatus,
    ReminderSlot,
    ReminderTarget,
)
from notifications.services import (
    generate_patient_reminders,
    generate_clinic_summaries,
    dispatch_pending_reminders,
)
from notifications.providers.whatsapp_web import WhatsAppWebProvider


# ─── Helpers ──────────────────────────────────────────────────────────────────

def make_clinic(name="Test Dental Clinic"):
    return Clinic.objects.create(
        name=name,
        slug=name.lower().replace(" ", "-"),
        is_active=True,
    )


def make_patient(clinic, mobile="9876543210"):
    return Patient.objects.create(
        clinic=clinic,
        full_name="Ravi Kumar",
        age=35,
        gender="M",
        mobile_number=mobile,
    )


def make_appointment(clinic, patient, days_offset=0):
    target_date = timezone.localtime(timezone.now()).date() + datetime.timedelta(days=days_offset)
    return Appointment.objects.create(
        clinic=clinic,
        patient=patient,
        appointment_date=target_date,
        appointment_time=datetime.time(10, 0),
        consulting_doctor="Dr. Sharma",
        status="SCHEDULED",
    )


# ─── WhatsApp Session Tests ───────────────────────────────────────────────────

class WhatsAppSessionTest(TestCase):
    def setUp(self):
        self.clinic = make_clinic()

    def test_session_defaults_to_disconnected(self):
        session = WhatsAppSession.objects.create(clinic=self.clinic)
        self.assertEqual(session.status, "DISCONNECTED")
        self.assertFalse(session.is_connected)

    def test_session_is_connected_when_status_connected(self):
        session = WhatsAppSession.objects.create(
            clinic=self.clinic, status="CONNECTED", connected_number="919876543210"
        )
        self.assertTrue(session.is_connected)

    def test_one_session_per_clinic(self):
        WhatsAppSession.objects.create(clinic=self.clinic)
        with self.assertRaises(Exception):
            WhatsAppSession.objects.create(clinic=self.clinic)


# ─── Reminder Generation Tests ────────────────────────────────────────────────

class ReminderGenerationTest(TestCase):
    def setUp(self):
        self.clinic = make_clinic()
        self.patient = make_patient(self.clinic)
        self.today = timezone.localtime(timezone.now()).date()

        # Give the clinic an active subscription
        from subscriptions.models import ClinicSubscription, SubscriptionStatus, SubscriptionPlan
        plan = SubscriptionPlan.objects.create(
            name="Test Plan",
            code="STARTER",
            price=0,
        )
        ClinicSubscription.objects.create(
            clinic=self.clinic,
            plan=plan,
            status=SubscriptionStatus.TRIAL,
            trial_end_date=timezone.now() + datetime.timedelta(days=30),
        )

    def test_generate_patient_reminder_creates_record(self):
        appt = make_appointment(self.clinic, self.patient, days_offset=0)
        count = generate_patient_reminders(self.today)
        self.assertEqual(count, 1)

        reminder = ReminderHistory.objects.get(appointment=appt, slot=ReminderSlot.SAME_DAY)
        self.assertEqual(reminder.target, ReminderTarget.PATIENT)
        self.assertEqual(reminder.status, ReminderStatus.PENDING)
        self.assertEqual(reminder.recipient_number, self.patient.mobile_number)

    def test_generate_patient_reminder_no_duplicate(self):
        make_appointment(self.clinic, self.patient, days_offset=0)
        count1 = generate_patient_reminders(self.today)
        count2 = generate_patient_reminders(self.today)
        self.assertEqual(count1, 1)
        self.assertEqual(count2, 0)  # second call creates nothing

    def test_no_reminder_for_cancelled_appointment(self):
        appt = make_appointment(self.clinic, self.patient, days_offset=0)
        appt.status = "CANCELLED"
        appt.save()
        count = generate_patient_reminders(self.today)
        self.assertEqual(count, 0)


# ─── WhatsApp Web Provider Tests ──────────────────────────────────────────────

class WhatsAppWebProviderTest(TestCase):
    def test_provider_raises_if_url_not_configured(self):
        with self.settings(WHATSAPP_SERVICE_URL='', WHATSAPP_SERVICE_SECRET='test'):
            with self.assertRaises(RuntimeError):
                WhatsAppWebProvider(clinic_id="1")

    @patch('notifications.providers.whatsapp_web.requests.get')
    @patch('notifications.providers.whatsapp_web.requests.post')
    def test_send_succeeds_when_connected(self, mock_post, mock_get):
        # Status returns CONNECTED
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {'status': 'CONNECTED'},
        )
        mock_get.return_value.raise_for_status = lambda: None

        # Send returns success
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {'success': True, 'to': '919876543210@c.us'},
        )
        mock_post.return_value.raise_for_status = lambda: None

        with self.settings(
            WHATSAPP_SERVICE_URL='http://localhost:3001',
            WHATSAPP_SERVICE_SECRET='test',
        ):
            provider = WhatsAppWebProvider(clinic_id="1")
            result = provider.send_whatsapp_message("+919876543210", "Hello!")
            self.assertEqual(result, "919876543210@c.us")

    @patch('notifications.providers.whatsapp_web.requests.get')
    def test_send_raises_if_not_connected(self, mock_get):
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {'status': 'DISCONNECTED'},
        )
        mock_get.return_value.raise_for_status = lambda: None

        with self.settings(
            WHATSAPP_SERVICE_URL='http://localhost:3001',
            WHATSAPP_SERVICE_SECRET='test',
        ):
            provider = WhatsAppWebProvider(clinic_id="1")
            with self.assertRaises(RuntimeError) as ctx:
                provider.send_whatsapp_message("+919876543210", "Hello!")
            self.assertIn("not connected", str(ctx.exception).lower())


# ─── Dispatch Tests ───────────────────────────────────────────────────────────

class DispatchRemindersTest(TestCase):
    def setUp(self):
        self.clinic = make_clinic()
        self.patient = make_patient(self.clinic)
        self.appt = make_appointment(self.clinic, self.patient)

    def _create_pending_reminder(self, slot=ReminderSlot.SAME_DAY, target=ReminderTarget.PATIENT):
        return ReminderHistory.objects.create(
            clinic=self.clinic,
            appointment=self.appt,
            slot=slot,
            target=target,
            recipient_number="9876543210",
            message="Test reminder message",
            scheduled_for=timezone.now() - datetime.timedelta(minutes=1),
        )

    @patch('notifications.providers.whatsapp_web.requests.get')
    @patch('notifications.providers.whatsapp_web.requests.post')
    def test_dispatch_sends_when_connected(self, mock_post, mock_get):
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {'status': 'CONNECTED'},
        )
        mock_get.return_value.raise_for_status = lambda: None
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {'success': True, 'to': '9876543210@c.us'},
        )
        mock_post.return_value.raise_for_status = lambda: None

        reminder = self._create_pending_reminder()

        with self.settings(
            WHATSAPP_SERVICE_URL='http://localhost:3001',
            WHATSAPP_SERVICE_SECRET='test',
        ):
            results = dispatch_pending_reminders()

        self.assertEqual(results['sent'], 1)
        self.assertEqual(results['skipped'], 0)
        reminder.refresh_from_db()
        self.assertEqual(reminder.status, ReminderStatus.SENT)

    @patch('notifications.providers.whatsapp_web.requests.get')
    def test_dispatch_skips_when_disconnected(self, mock_get):
        """CRITICAL: Reminders must be SKIPPED when clinic WhatsApp is disconnected."""
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {'status': 'DISCONNECTED'},
        )
        mock_get.return_value.raise_for_status = lambda: None

        reminder = self._create_pending_reminder()

        with self.settings(
            WHATSAPP_SERVICE_URL='http://localhost:3001',
            WHATSAPP_SERVICE_SECRET='test',
        ):
            results = dispatch_pending_reminders()

        self.assertEqual(results['sent'], 0)
        self.assertEqual(results['skipped'], 1)
        reminder.refresh_from_db()
        self.assertEqual(reminder.status, ReminderStatus.SKIPPED)
