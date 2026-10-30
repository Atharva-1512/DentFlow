"""
Test WhatsApp Option 4 Gateway & Festival Campaign Integration
"""
import os
import django
import datetime
from zoneinfo import ZoneInfo

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dentflow.settings')
django.setup()

from django.utils import timezone
from django.conf import settings
from clinics.models import Clinic
from patients.models import Patient
from appointments.models import Appointment
from notifications.models import ReminderHistory, ReminderSlot, ReminderStatus, CampaignBroadcast
from notifications.services import generate_patient_reminders, dispatch_pending_reminders, dispatch_campaign_broadcast
from notifications.providers.dentflow_gateway import DentFlowWhatsAppProvider

IST = ZoneInfo('Asia/Kolkata')

def run_tests():
    print("=" * 70)
    print("TESTING DENTFLOW 24-HOUR REMINDERS & FESTIVAL BROADCAST (OPTION 4)")
    print("=" * 70)

    # 1. Setup test clinic
    clinic, _ = Clinic.objects.get_or_create(
        name="SmileCraft Dental Lounge",
        defaults={
            "slug": "smilecraft-test",
            "is_active": True,
            "address": "102 Horizon Towers, North Main Road, Pune",
            "notification_whatsapp_number": "+919876543210"
        }
    )

    from subscriptions.models import SubscriptionPlan, ClinicSubscription, SubscriptionStatus
    plan, _ = SubscriptionPlan.objects.get_or_create(
        code="standard_trial",
        defaults={
            "name": "Standard Trial",
            "price": 0.00,
            "billing_cycle": "monthly",
            "is_active": True
        }
    )
    ClinicSubscription.objects.get_or_create(
        clinic=clinic,
        defaults={
            "plan": plan,
            "status": SubscriptionStatus.TRIAL,
            "trial_start_date": timezone.now().date(),
            "trial_end_date": timezone.now() + datetime.timedelta(days=30),
        }
    )

    # 2. Setup test patient
    patient, _ = Patient.objects.get_or_create(
        clinic=clinic,
        full_name="Vikramaditya Sharma",
        defaults={
            "age": 32,
            "gender": "M",
            "mobile_number": "9876543210",
            "patient_id": "PAT-9999",
        }
    )

    # 3. Test 24-Hour Prior Automated Reminder Generation
    print("\n[TEST 1] Testing 24-Hour Prior Automated Reminder Generation...")
    target_date = timezone.localtime(timezone.now()).date() + datetime.timedelta(days=1)
    
    appt, _ = Appointment.objects.get_or_create(
        clinic=clinic,
        patient=patient,
        appointment_date=target_date,
        defaults={
            "appointment_time": datetime.time(16, 0), # 4:00 PM
            "consulting_doctor": "Dr. Amit Mehta",
            "appointment_type": "PROCEDURE",
            "appointment_reason": "Root Canal Treatment - Sitting 2",
            "status": "SCHEDULED"
        }
    )

    created_count = generate_patient_reminders(target_date)
    print(f"  -> Generated {created_count} reminders for {target_date}")

    reminder = ReminderHistory.objects.filter(appointment=appt).first()
    assert reminder is not None, "ReminderHistory should be created"
    assert reminder.slot == ReminderSlot.HOURS_BEFORE_24, f"Slot should be 24_HOURS_BEFORE, got {reminder.slot}"
    assert "tomorrow" in reminder.message.lower(), "Message should indicate appointment is tomorrow"
    print(f"  -> Slot: {reminder.slot} | Scheduled for: {reminder.scheduled_for}")
    print("  -> Message snippet:")
    print("     " + reminder.message.split("\n")[2])
    print("  [PASS] 24-Hour Reminder logic verified!")

    # 4. Test Gateway Provider Dispatch Logic
    print("\n[TEST 2] Testing Gateway Provider Formatting...")
    provider = DentFlowWhatsAppProvider()
    print(f"  -> Active Provider: {provider.provider_type}")
    print(f"  -> Sender Number: {provider.sender_number}")
    msg_id = provider.send_whatsapp_message(
        to_number="9876543210",
        body="Test message from DentFlow Gateway"
    )
    assert msg_id, "Provider should return a message ID"
    print(f"  -> Dispatched successfully with ID: {msg_id}")
    print("  [PASS] Gateway Provider dispatch verified!")

    # 5. Test Festival Campaign Broadcast (Happy Diwali)
    print("\n[TEST 3] Testing Festival Campaign Broadcast (Happy Diwali)...")
    diwali_message = (
        "🪔 *Happy Diwali from {{clinic_name}}!* 🪔\n\n"
        "Dear {{patient_name}},\n"
        "Wishing you and your family a festive season filled with light, laughter, and radiant smiles!\n\n"
        "Warm regards,\n"
        "Dr. {{doctor_name}} & Team"
    )

    broadcast_result = dispatch_campaign_broadcast(
        clinic=clinic,
        title="Diwali Wishes 2026",
        message_body=diwali_message,
        audience="ALL_PATIENTS",
        template_type="DIWALI"
    )

    print(f"  -> Broadcast completed: {broadcast_result}")
    assert broadcast_result['status'] == 'COMPLETED', "Campaign status should be COMPLETED"
    assert broadcast_result['sent'] >= 1, "At least 1 message should be sent"

    campaign_record = CampaignBroadcast.objects.get(id=broadcast_result['campaign_id'])
    assert campaign_record.title == "Diwali Wishes 2026"
    assert campaign_record.sent_count >= 1
    print(f"  -> Stored in DB: {campaign_record}")
    print("  [PASS] Festival Campaign Broadcast verified!")

    print("\n" + "=" * 70)
    print("ALL TESTS PASSED SUCCESSFULLY! (100% VERIFIED)")
    print("=" * 70)

if __name__ == '__main__':
    run_tests()
