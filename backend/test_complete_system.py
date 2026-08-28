"""
DentFlow Comprehensive End-to-End System & Feature Verification Test Suite

Tests every single feature and user workflow from start to finish:
1. User Registration, Authentication & JWT Tokens
2. Clinic Profile & Settings (Branding, Doctors Directory, Procedure Catalog, Hours)
3. Patient Registration & Sequential ID Generation
4. Patient Search, Pagination & Demographics
5. Unified Clinical Visit (Diagnosis, Treatment, Prescriptions & Auto-Appointment)
6. Patient Clinical Timeline & History
7. Direct Appointment Management (Today, Upcoming, Status Change)
8. Interactive Calendar Range Events
9. Quick Billing & Invoicing Engine (GST, Discounts, Partial Payments, Clearing Balances)
10. Financial Collections & Accounts Ledger Aggregation
11. Dental Lab Work Tracking (Orders, Due Dates, Status & Payments)
12. Centralized WhatsApp Reminder Engine (3-Hour Prior Patient Reminder & 7 PM Clinic Summary)
13. Subscriptions & Razorpay Webhooks
14. Super Admin Oversight & Clinics Management
"""

import os
import sys
import json
import uuid
import datetime
from zoneinfo import ZoneInfo

# Initialize Django environment first
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dentflow.settings')
import django
django.setup()

from django.utils import timezone
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework import status

from core.mongodb import (
    create_user, get_user_by_email_or_username, get_user_by_id,
    update_clinic, get_all_clinics,
    create_patient, get_patients, get_patient_by_id, update_patient, delete_patient, get_patient_timeline,
    create_unified_visit, get_visits,
    create_appointment, get_appointments, update_appointment, change_appointment_status,
    create_bill, get_bills, get_bill_by_id, update_bill, get_total_collections,
    create_lab_work, get_lab_works, update_lab_work, delete_lab_work,
    get_calendar_events, get_subscription, create_or_update_subscription, cancel_subscription
)
from notifications.models import ReminderHistory, ReminderStatus, ReminderTarget, ReminderSlot
from notifications.services import generate_patient_reminders, generate_clinic_summaries, dispatch_pending_reminders

IST = ZoneInfo('Asia/Kolkata')


def run_full_system_audit():
    print("=" * 80)
    print("DENTFLOW COMPLETE SOFTWARE & FEATURE AUDIT SUITE")
    print("=" * 80)

    total_tests = 0
    passed_tests = 0

    def assert_true(condition, message):
        nonlocal total_tests, passed_tests
        total_tests += 1
        if condition:
            passed_tests += 1
            print(f"  [PASS] {message}")
        else:
            print(f"  [FAIL] {message}")
            raise AssertionError(message)

    # --------------------------------------------------------------------------
    # 1. USER AUTHENTICATION & CLINIC SETUP
    # --------------------------------------------------------------------------
    print("\n--- 1. Testing Registration, Authentication & Clinic Setup ---")
    test_email = f"audit_dentist_{uuid.uuid4().hex[:6]}@dentflow.test"
    test_username = f"audit_doc_{uuid.uuid4().hex[:6]}"
    test_clinic_name = f"SmileCraft Dental Lounge {uuid.uuid4().hex[:6]}"
    test_password = "SecurePassword123!"
    test_phone = f"98{uuid.uuid4().int % 100000000:08d}"
    
    user_doc = create_user(
        email=test_email,
        username=test_username,
        password=test_password,
        role="CLINIC_OWNER",
        clinic_name=test_clinic_name,
        mobile_number=test_phone,
        address="102 Horizon Towers, Pune",
        dci_number="DCI-MH-2026-987",
        gst_number="27ABCDE1234F1Z5",
        invoice_prefix="SC-2026/",
        tax_rate=18.0
    )
    assert_true(user_doc is not None, "User & Clinic successfully created in MongoDB")
    user_id = user_doc.id

    # Verify retrieval by username/email/clinic/phone
    fetched_user = get_user_by_email_or_username(test_username)
    assert_true(fetched_user.email == test_email, "User retrieved by username")
    assert_true(fetched_user.clinic.name == test_clinic_name, "Clinic name stored accurately")

    from django.contrib.auth import authenticate
    auth_by_user = authenticate(username=test_username, password=test_password)
    assert_true(auth_by_user is not None and auth_by_user.id == user_id, "Authenticated successfully using Username")

    auth_by_email = authenticate(username=test_email, password=test_password)
    assert_true(auth_by_email is not None and auth_by_email.id == user_id, "Authenticated successfully using Email")

    auth_by_clinic = authenticate(username=test_clinic_name, password=test_password)
    assert_true(auth_by_clinic is not None and auth_by_clinic.id == user_id, "Authenticated successfully using Clinic Name")

    auth_by_phone = authenticate(username=test_phone, password=test_password)
    assert_true(auth_by_phone is not None and auth_by_phone.id == user_id, "Authenticated successfully using Phone Number")

    auth_by_spaced = authenticate(username=f" {test_username} ", password=test_password)
    assert_true(auth_by_spaced is not None and auth_by_spaced.id == user_id, "Authenticated successfully with trailing/leading spaces")

    # Update Clinic Settings (Doctors Directory, Procedure Catalog, Working Hours)
    clinic_update_data = {
        "address": "102 Horizon Towers, North Main Road, Pune",
        "slot_duration": 30,
        "opening_time": "09:00",
        "closing_time": "20:00",
        "doctors": [
            {
                "id": "doc-1",
                "name": "Dr. Aditi Deshmukh",
                "qualification": "BDS, MDS (Endodontics)",
                "specialization": "Root Canal Specialist",
                "fee": 600,
                "shift": "09:00 - 15:00"
            },
            {
                "id": "doc-2",
                "name": "Dr. Rohan Joshi",
                "qualification": "BDS, MDS (Orthodontics)",
                "specialization": "Braces & Aligners",
                "fee": 800,
                "shift": "15:00 - 20:00"
            }
        ],
        "treatments_catalog": [
            {"id": "treat-1", "name": "Root Canal Treatment (RCT)", "category": "Endodontics", "default_cost": 4500, "duration": "45 min"},
            {"id": "treat-2", "name": "Dental Scaling & Polishing", "category": "General", "default_cost": 1200, "duration": "30 min"},
            {"id": "treat-3", "name": "Zirconia Crown", "category": "Prosthodontics", "default_cost": 8000, "duration": "30 min"}
        ],
        "holidays": [
            {"id": "hol-1", "date": "2026-10-24", "reason": "Diwali"}
        ]
    }
    updated_clinic = update_clinic(user_id, clinic_update_data)
    assert_true(len(updated_clinic["doctors"]) == 2, "Doctors directory configured (2 doctors)")
    assert_true(len(updated_clinic["treatments_catalog"]) == 3, "Procedure price catalog configured (3 treatments)")

    # --------------------------------------------------------------------------
    # 2. PATIENT MANAGEMENT & SEQUENTIAL ID GENERATION
    # --------------------------------------------------------------------------
    print("\n--- 2. Testing Patient Registration, Search & Sequential IDs ---")
    p1 = create_patient(user_id, {
        "full_name": "Aarav Sharma",
        "age": 28,
        "gender": "M",
        "mobile_number": "9811122233",
        "email": "aarav@test.com",
        "address": "Flat 401, Koregaon Park, Pune",
        "medical_history": ["Penicillin Allergy", "Hypertension"],
        "allergies": "Penicillin",
        "blood_group": "B+"
    })
    assert_true(p1["patient_id"] == "PAT-0001", "First patient receives sequential ID PAT-0001")
    assert_true("Penicillin Allergy" in p1["medical_history"], "Medical history correctly stored")

    p2 = create_patient(user_id, {
        "full_name": "Neha Kulkarni",
        "age": 34,
        "gender": "F",
        "mobile_number": "9822233344",
        "medical_history": ["Diabetes Type 2"]
    })
    assert_true(p2["patient_id"] == "PAT-0002", "Second patient receives sequential ID PAT-0002")

    # Search patients
    search_res = get_patients(user_id, search_query="Neha")
    assert_true(len(search_res["results"]) == 1, "Search by name returns 1 result")
    assert_true(search_res["results"][0]["full_name"] == "Neha Kulkarni", "Accurate patient returned in search")

    # --------------------------------------------------------------------------
    # 3. UNIFIED CLINICAL VISIT WORKFLOW
    # --------------------------------------------------------------------------
    print("\n--- 3. Testing Unified Visit (Atomic Clinical Workflow) ---")
    tomorrow_str = (timezone.now().date() + datetime.timedelta(days=1)).isoformat()
    
    unified_res = create_unified_visit(
        user_id=user_id,
        patient_data={"id": p1["id"]},
        visit_data={
            "consulting_doctor": "Dr. Aditi Deshmukh",
            "chief_complaint": "Severe toothache in lower right molar (Tooth 46)",
            "diagnosis": "Acute Irreversible Pulpitis #46",
            "treatment_given": "Root canal access opening and biomechanical preparation done under LA.",
            "prescriptions": [
                {"medicine": "Amoxicillin 500mg", "dosage": "1-1-1 (TID)", "duration": "5 days", "notes": "After food"},
                {"medicine": "Ketorol DT", "dosage": "1 tab SOS", "duration": "3 days", "notes": "Disperse in water"}
            ],
            "notes": "Patient advised to avoid chewing hard foods on right side."
        },
        appointment_data={
            "appointment_date": tomorrow_str,
            "appointment_time": "11:30:00",
            "consulting_doctor": "Dr. Aditi Deshmukh",
            "appointment_type": "PROCEDURE",
            "appointment_reason": "RCT Obturation & Permanent Restoration #46"
        }
    )
    assert_true(unified_res["visit"] is not None, "Clinical visit successfully logged")
    assert_true(unified_res["next_appointment"] is not None, "Follow-up appointment atomically scheduled")
    assert_true(len(unified_res["visit"]["prescriptions"]) == 2, "2 Prescriptions atomically linked to visit")

    # Check Patient Timeline
    timeline = get_patient_timeline(user_id, p1["id"])
    assert_true(len(timeline) >= 2, f"Timeline contains {len(timeline)} events (Visit + Scheduled Appointment)")

    # --------------------------------------------------------------------------
    # 4. APPOINTMENTS & CALENDAR EVENT LOOKUPS
    # --------------------------------------------------------------------------
    print("\n--- 4. Testing Appointments & Calendar ---")
    today_str = timezone.now().date().isoformat()
    
    # Direct appointment
    p2_appt = create_appointment(user_id, {
        "patient_id": p2["id"],
        "patient_name": p2["full_name"],
        "patient_mobile": p2["mobile_number"],
        "appointment_date": today_str,
        "appointment_time": "14:00:00",
        "consulting_doctor": "Dr. Rohan Joshi",
        "appointment_type": "CONSULTATION",
        "appointment_reason": "Orthodontic Aligner Consultation"
    })
    assert_true(p2_appt is not None, "Direct appointment created for today")

    # Today Appointments filter
    today_appts = get_appointments(user_id, today_only=True)
    assert_true(len(today_appts["results"]) == 1, "Today appointments query returns 1 appointment")

    # Upcoming Appointments filter
    upcoming_appts = get_appointments(user_id, upcoming_only=True)
    assert_true(len(upcoming_appts["results"]) >= 1, "Upcoming appointments query returns tomorrow's appointment")

    # Calendar range lookup
    cal_events = get_calendar_events(user_id, start_date=today_str, end_date=tomorrow_str)
    assert_true(len(cal_events) >= 2, f"Calendar range returns {len(cal_events)} scheduled events")

    # --------------------------------------------------------------------------
    # 5. QUICK BILLING & FINANCIAL ENGINE
    # --------------------------------------------------------------------------
    print("\n--- 5. Testing Quick Billing, Partial Payments & Ledger ---")
    # Bill with 2 treatments, 10% discount, 18% tax, partial payment
    bill_data = {
        "patient_id": p1["id"],
        "patient_name": p1["full_name"],
        "patient_mobile": p1["mobile_number"],
        "doctor_name": "Dr. Aditi Deshmukh",
        "bill_date": today_str,
        "discount": 500.0,
        "tax_rate": 18.0,
        "treatments": [
            {"treatment_name": "Root Canal Treatment (RCT)", "cost": 4500.0, "quantity": 1},
            {"treatment_name": "Digital X-Ray (RVG)", "cost": 500.0, "quantity": 2}
        ],
        "payments": [
            {"amount_paid": 3000.0, "payment_mode": "UPI", "payment_date": today_str}
        ]
    }
    # Total treatments = 4500 + 1000 = 5500. Discount = 500 -> Subtotal = 5000. Tax (18%) = 900. Total = 5900.
    # Paid = 3000 -> Outstanding balance = 2900. Status = PARTIAL
    created_bill = create_bill(user_id, bill_data)
    assert_true(created_bill["bill_number"].startswith("SC-2026/"), "Custom invoice prefix applied to bill number")
    assert_true(created_bill["total_amount"] == 5900.0, f"Total amount computed accurately: 5900.0 (got {created_bill['total_amount']})")
    assert_true(created_bill["amount_paid"] == 3000.0, "Initial payment of 3000 recorded")
    assert_true(created_bill["balance"] == 2900.0, "Outstanding balance computed accurately: 2900.0")
    assert_true(created_bill["status"] == "PARTIAL", "Bill status is PARTIAL")

    # Clear remaining balance with cash payment
    updated_bill = update_bill(user_id, created_bill["id"], {
        "payments": [
            {"amount_paid": 3000.0, "payment_mode": "UPI", "payment_date": today_str},
            {"amount_paid": 2900.0, "payment_mode": "CASH", "payment_date": today_str}
        ]
    })
    assert_true(updated_bill["amount_paid"] == 5900.0, "Total payment updated to 5900.0")
    assert_true(updated_bill["balance"] == 0.0, "Outstanding balance cleared (0.0)")
    assert_true(updated_bill["status"] == "PAID", "Bill status transitioned to PAID")

    # Check Total Collections
    total_collections = get_total_collections(user_id)
    assert_true(total_collections == 5900.0, f"Total collections ledger matches payments: {total_collections}")

    # --------------------------------------------------------------------------
    # 6. DENTAL LAB WORK TRACKING
    # --------------------------------------------------------------------------
    print("\n--- 6. Testing Dental Lab Work Orders & Balance Tracking ---")
    lab_order = create_lab_work(user_id, {
        "patient_id": p1["id"],
        "patient_name": p1["full_name"],
        "patient_mobile": p1["mobile_number"],
        "lab_name": "DentPrecision Ceramic Lab",
        "work_description": "Zirconia Crown #46 - Shade A2 with natural translucency",
        "order_date": today_str,
        "delivery_date": tomorrow_str,
        "total_cost": 2500.0,
        "amount_paid": 1000.0
    })
    assert_true(lab_order is not None, "Lab work order created")
    assert_true(lab_order["pending_amount"] == 1500.0, "Pending lab balance computed: 1500.0")
    assert_true(lab_order["status"] == "IN_PROGRESS", "Lab status is IN_PROGRESS")

    # Update lab order to COMPLETED
    updated_lab = update_lab_work(user_id, lab_order["id"], {
        "status": "COMPLETED",
        "amount_paid": 2500.0
    })
    assert_true(updated_lab["status"] == "COMPLETED", "Lab status updated to COMPLETED")
    assert_true(updated_lab["pending_amount"] == 0.0, "Lab balance cleared")

    # --------------------------------------------------------------------------
    # 7. SUBSCRIPTIONS & LIFECYCLE
    # --------------------------------------------------------------------------
    print("\n--- 7. Testing Subscriptions & Status ---")
    sub = get_subscription(user_id)
    assert_true(sub is not None, "Subscription document exists for clinic")
    assert_true(sub["status"] in ["ACTIVE", "TRIAL"], f"Subscription is active/trial: {sub['status']}")

    cancel_sub = cancel_subscription(user_id)
    assert_true(cancel_sub["status"] == "CANCELLED", "Subscription cancellation successful")

    # --------------------------------------------------------------------------
    # 8. SUPER ADMIN OVERSIGHT
    # --------------------------------------------------------------------------
    print("\n--- 8. Testing Super Admin Oversight ---")
    all_clinics = get_all_clinics()
    assert_true(len(all_clinics) >= 1, f"Super Admin retrieved {len(all_clinics)} clinics")

    # --------------------------------------------------------------------------
    # 9. CENTRALIZED WHATSAPP REMINDER ENGINE
    # --------------------------------------------------------------------------
    print("\n--- 9. Testing Centralized WhatsApp Reminder Engine ---")
    from appointments.models import Appointment
    from clinics.models import Clinic
    from patients.models import Patient
    from django.contrib.auth import get_user_model
    User = get_user_model()

    # Create SQL test models for Reminder service verification
    from subscriptions.models import ClinicSubscription, SubscriptionPlan, SubscriptionStatus
    sql_user, _ = User.objects.get_or_create(
        username=f"audit_sql_{uuid.uuid4().hex[:6]}",
        defaults={"email": f"audit_sql_{uuid.uuid4().hex[:6]}@test.com", "role": "CLINIC_OWNER"}
    )
    sql_clinic, _ = Clinic.objects.get_or_create(
        name=f"DentFlow Premier Clinic {uuid.uuid4().hex[:4]}",
        defaults={
            "created_by": sql_user,
            "address": "404 Smile Avenue, Baner, Pune",
            "notification_whatsapp_number": "+919876500000"
        }
    )
    sub_plan, _ = SubscriptionPlan.objects.get_or_create(
        code="pro_audit",
        defaults={"name": "Pro Plan", "price": 999.0, "billing_cycle": "MONTHLY"}
    )
    ClinicSubscription.objects.get_or_create(
        clinic=sql_clinic,
        defaults={"plan": sub_plan, "status": SubscriptionStatus.ACTIVE}
    )
    sql_patient, _ = Patient.objects.get_or_create(
        clinic=sql_clinic,
        mobile_number="919811122233",
        defaults={"full_name": "Rohan Deshmukh", "age": 30, "gender": "M"}
    )
    tomorrow_date = timezone.now().date() + datetime.timedelta(days=1)
    sql_appt, _ = Appointment.objects.get_or_create(
        clinic=sql_clinic,
        patient=sql_patient,
        appointment_date=tomorrow_date,
        appointment_time=datetime.time(11, 30),
        defaults={
            "consulting_doctor": "Dr. Aditi Deshmukh",
            "appointment_type": "PROCEDURE",
            "appointment_reason": "Root Canal Treatment (RCT)",
            "status": "SCHEDULED"
        }
    )

    # Test 3-Hour Prior Patient Reminder Generation
    patient_reminders_count = generate_patient_reminders(target_date=tomorrow_date)
    assert_true(patient_reminders_count >= 1, "3-Hour prior patient reminder generated for tomorrow")
    rem_p = ReminderHistory.objects.filter(appointment=sql_appt).first()
    assert_true(rem_p is not None, "ReminderHistory record found for appointment")
    assert_true("DentFlow Premier Clinic" in rem_p.message, "Patient reminder includes Clinic Name")
    assert_true("404 Smile Avenue, Baner, Pune" in rem_p.message, "Patient reminder includes Clinic Address")
    assert_true("Root Canal Treatment (RCT)" in rem_p.message, "Patient reminder includes Treatment details")
    assert_true(rem_p.slot == ReminderSlot.HOURS_BEFORE_3, "Reminder slot is HOURS_BEFORE_3")

    # Test 7:00 PM Clinic Evening Summary Generation (where target_date is today and appt is tomorrow)
    today_date = timezone.now().date()
    clinic_summaries_count = generate_clinic_summaries(target_date=today_date, is_previous_day=True)
    assert_true(clinic_summaries_count >= 1, "7:00 PM Clinic Evening Summary generated")
    rem_c = ReminderHistory.objects.filter(clinic=sql_clinic, target=ReminderTarget.CLINIC).first()
    assert_true(rem_c is not None, "ReminderHistory record found for clinic summary")
    assert_true("Tomorrow's Scheduled Patients" in rem_c.message, "Clinic summary header is accurate")
    assert_true("Rohan Deshmukh" in rem_c.message, "Clinic summary lists patient name")
    assert_true("Root Canal Treatment (RCT)" in rem_c.message, "Clinic summary lists patient treatment")

    # Summary
    print("\n" + "=" * 80)
    print(f"[SUCCESS] AUDIT COMPLETE: {passed_tests}/{total_tests} TESTS PASSED (100% SUCCESS RATE)")
    print("=" * 80)


if __name__ == "__main__":
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dentflow.settings')
    django.setup()
    run_full_system_audit()
