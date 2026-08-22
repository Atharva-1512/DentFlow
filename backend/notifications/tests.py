"""
Tests for DentFlow Centralized WhatsApp Notification Engine.

Covers:
1. 3-hour prior patient appointment reminder with clinic name, address, and treatment.
2. Evening 7:00 PM IST clinic summary with tomorrow's patients and treatments.
3. Centralized DentFlow WhatsApp Gateway dispatcher.
"""

import datetime
from unittest.mock import MagicMock, patch
from zoneinfo import ZoneInfo
from django.test import TestCase
from django.utils import timezone

from clinics.models import Clinic
from appointments.models import Appointment
from patients.models import Patient
from subscriptions.models import ClinicSubscription, SubscriptionStatus, SubscriptionPlan
from notifications.models import (
    ReminderHistory,
    ReminderStatus,
    ReminderSlot,
    ReminderTarget,
    NotificationTemplate,
    NotificationType,
)
from notifications.services import (
    generate_patient_reminders,
    generate_clinic_summaries,
    dispatch_pending_reminders,
)
from notifications.providers.dentflow_gateway import DentFlowWhatsAppProvider

IST = ZoneInfo('Asia/Kolkata')


def make_clinic(name="DentFlow Dental Care", address="101 Smile Plaza, MG Road, Pune", phone="9876543210"):
    return Clinic.objects.create(
        name=name,
        slug=name.lower().replace(" ", "-"),
        notification_whatsapp_number=phone,
        address=address,
        is_active=True,
    )


def make_patient(clinic, name="Rahul Sharma", mobile="9988776655"):
    return Patient.objects.create(
        clinic=clinic,
        full_name=name,
        age=30,
        gender="M",
        mobile_number=mobile,
    )


def make_appointment(clinic, patient, days_offset=0, time_hour=14, time_minute=0, reason="Root Canal Treatment (RCT)"):
    target_date = timezone.localtime(timezone.now()).date() + datetime.timedelta(days=days_offset)
    return Appointment.objects.create(
        clinic=clinic,
        patient=patient,
        appointment_date=target_date,
        appointment_time=datetime.time(time_hour, time_minute),
        consulting_doctor="Dr. Aditi Deshmukh",
        appointment_type="PROCEDURE",
        appointment_reason=reason,
        status="SCHEDULED",
    )


class CentralizedWhatsAppReminderTest(TestCase):
    def setUp(self):
        self.clinic = make_clinic()
        self.patient = make_patient(self.clinic)
        self.today = timezone.localtime(timezone.now()).date()
        self.tomorrow = self.today + datetime.timedelta(days=1)

        # Active trial subscription
        plan = SubscriptionPlan.objects.create(name="Pro Plan", code="PRO", price=999)
        ClinicSubscription.objects.create(
            clinic=self.clinic,
            plan=plan,
            status=SubscriptionStatus.TRIAL,
            trial_end_date=timezone.now() + datetime.timedelta(days=30),
        )

    def test_patient_reminder_scheduled_3_hours_prior(self):
        """
        Verify that appointment at 2:00 PM (14:00) has reminder scheduled at 11:00 AM (3 hours prior).
        """
        appt = make_appointment(self.clinic, self.patient, days_offset=0, time_hour=14, time_minute=0)
        count = generate_patient_reminders(self.today)
        self.assertEqual(count, 1)

        reminder = ReminderHistory.objects.get(appointment=appt, target=ReminderTarget.PATIENT)
        self.assertEqual(reminder.status, ReminderStatus.PENDING)
        self.assertEqual(reminder.recipient_number, self.patient.mobile_number)

        # Expected scheduled_for: 11:00 AM IST on target date
        expected_scheduled = datetime.datetime.combine(self.today, datetime.time(11, 0, 0)).replace(tzinfo=IST)
        self.assertEqual(reminder.scheduled_for, expected_scheduled)

    def test_patient_reminder_message_contains_clinic_and_treatment_details(self):
        """
        Verify that patient reminder text includes Clinic Name, Clinic Address, Doctor, and Treatment.
        """
        appt = make_appointment(
            self.clinic,
            self.patient,
            days_offset=0,
            time_hour=10,
            time_minute=30,
            reason="Scaling & Polishing"
        )
        generate_patient_reminders(self.today)

        reminder = ReminderHistory.objects.get(appointment=appt, target=ReminderTarget.PATIENT)
        msg = reminder.message

        self.assertIn(self.patient.full_name, msg)
        self.assertIn(self.clinic.name, msg)
        self.assertIn(self.clinic.address, msg)
        self.assertIn("Dr. Aditi Deshmukh", msg)
        self.assertIn("Scaling & Polishing", msg)
        self.assertIn("10:30 AM", msg)

    def test_evening_clinic_summary_includes_tomorrow_patients_and_treatments(self):
        """
        Verify that evening 7 PM summary lists all patients scheduled for tomorrow with treatments.
        """
        patient2 = make_patient(self.clinic, name="Priya Patil", mobile="9123456789")
        make_appointment(self.clinic, self.patient, days_offset=1, time_hour=10, time_minute=0, reason="RCT Stage 1")
        make_appointment(self.clinic, patient2, days_offset=1, time_hour=11, time_minute=30, reason="Crown Fitting")

        count = generate_clinic_summaries(self.today, is_previous_day=True)
        self.assertEqual(count, 1)

        summary = ReminderHistory.objects.get(clinic=self.clinic, target=ReminderTarget.CLINIC)
        self.assertEqual(summary.recipient_number, self.clinic.notification_whatsapp_number)

        # Scheduled for 7:00 PM IST (19:00) today
        expected_time = datetime.datetime.combine(self.today, datetime.time(19, 0, 0)).replace(tzinfo=IST)
        self.assertEqual(summary.scheduled_for, expected_time)

        # Content verification
        self.assertIn("Rahul Sharma", summary.message)
        self.assertIn("RCT Stage 1", summary.message)
        self.assertIn("Priya Patil", summary.message)
        self.assertIn("Crown Fitting", summary.message)
        self.assertIn("Total: 2", summary.message)

    def test_no_duplicate_patient_reminders_generated(self):
        """
        Calling reminder generation multiple times must not create duplicate records.
        """
        make_appointment(self.clinic, self.patient, days_offset=0)
        count1 = generate_patient_reminders(self.today)
        count2 = generate_patient_reminders(self.today)
        self.assertEqual(count1, 1)
        self.assertEqual(count2, 0)

    def test_centralized_gateway_dispatch(self):
        """
        Verify that dispatch_pending_reminders dispatches due items and marks them SENT.
        """
        appt = make_appointment(self.clinic, self.patient, days_offset=0, time_hour=10, time_minute=0)
        generate_patient_reminders(self.today)

        reminder = ReminderHistory.objects.get(appointment=appt, target=ReminderTarget.PATIENT)
        # Simulate that reminder time has arrived
        reminder.scheduled_for = timezone.now() - datetime.timedelta(minutes=5)
        reminder.save()

        results = dispatch_pending_reminders()
        self.assertEqual(results['sent'], 1)
        self.assertEqual(results['failed'], 0)

        reminder.refresh_from_db()
        self.assertEqual(reminder.status, ReminderStatus.SENT)
        self.assertIsNotNone(reminder.sent_at)


class DentFlowGatewayProviderTest(TestCase):
    def test_mock_provider_dispatch(self):
        with self.settings(WHATSAPP_PROVIDER='mock', DENTFLOW_WHATSAPP_NUMBER='+919876543210'):
            provider = DentFlowWhatsAppProvider()
            msg_id = provider.send_whatsapp_message("9988776655", "Test message body")
            self.assertTrue(msg_id.startswith("DF_WA_"))

    @patch('notifications.providers.dentflow_gateway.requests.post')
    def test_meta_cloud_provider_dispatch(self, mock_post):
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {'messages': [{'id': 'wamid.HBgL...'}]},
        )
        mock_post.return_value.raise_for_status = lambda: None

        with self.settings(
            WHATSAPP_PROVIDER='meta',
            DENTFLOW_WHATSAPP_NUMBER='+919876543210',
            WHATSAPP_CLOUD_API_PHONE_NUMBER_ID='123456789',
            WHATSAPP_CLOUD_API_ACCESS_TOKEN='EAAxxxxxx',
        ):
            provider = DentFlowWhatsAppProvider()
            msg_id = provider.send_whatsapp_message("+919988776655", "Hello Patient")
            self.assertEqual(msg_id, "wamid.HBgL...")
            self.assertTrue(mock_post.called)
