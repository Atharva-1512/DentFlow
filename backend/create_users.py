import os
import django
import datetime
from django.utils import timezone

# Setup Django (needed to load settings and make password hashing utilities work)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dentflow.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.mongodb import (
    db, create_user, create_patient, create_unified_visit,
    create_bill, create_lab_work, create_appointment, update_clinic, save_mock_db
)

User = get_user_model()

print("Seeding DentFlow Database...")

# Clear existing users to start fresh
db.users.delete_many({})
db.subscription_events.delete_many({})

# 1. Create Super Admin (admin & atharva with Atharva@2026)
admin_user = create_user(
    email="admin@dentflow.com",
    username="admin",
    password="Atharva@2026",
    role="SUPER_ADMIN",
    clinic_name="DentFlow HQ",
    mobile_number="+919999999999",
    address="DentFlow Tower, Pune"
)

atharva_user = create_user(
    email="atharva@dentflow.com",
    username="atharva",
    password="Atharva@2026",
    role="SUPER_ADMIN",
    clinic_name="DentFlow HQ",
    mobile_number="+919999999999",
    address="DentFlow Tower, Pune"
)

# 2. Create Clinic Owner (doctor with password123)
doctor_user = create_user(
    email="doctor@dentflow.com",
    username="doctor",
    password="password123",
    role="CLINIC_OWNER",
    clinic_name="SmileCraft Dental Lounge",
    mobile_number="+919876543210",
    address="102 Horizon Towers, North Main Road, Pune",
    dci_number="DCI-MH-2026-8874",
    gst_number="27ABCDE1234F1Z5",
    invoice_prefix="SC-2026/",
    tax_rate=18.0
)

# Add Doctors directory & Treatment catalog to doctor's clinic
doc_id = doctor_user.id
update_clinic(doc_id, {
    "doctors": [
        {"id": "doc-1", "name": "Dr. Aditi Deshmukh", "qualification": "BDS, MDS (Endodontics)", "specialization": "Root Canal Specialist", "fee": 600, "shift": "09:00 - 14:00"},
        {"id": "doc-2", "name": "Dr. Rohan Joshi", "qualification": "BDS, MDS (Orthodontics)", "specialization": "Braces & Aligners", "fee": 800, "shift": "15:00 - 20:00"}
    ],
    "treatments_catalog": [
        {"id": "t-1", "name": "Root Canal Treatment (RCT)", "category": "Endodontics", "default_cost": 4500, "duration": "45 min"},
        {"id": "t-2", "name": "Scaling & Polishing", "category": "General", "default_cost": 1200, "duration": "30 min"},
        {"id": "t-3", "name": "Zirconia Crown", "category": "Prosthodontics", "default_cost": 7500, "duration": "30 min"}
    ]
})

# Seed Sample Patients
p1 = create_patient(doc_id, {
    "full_name": "Aarav Sharma",
    "age": 29,
    "gender": "M",
    "mobile_number": "9811122233",
    "email": "aarav@example.com",
    "address": "Flat 401, Koregaon Park, Pune",
    "medical_history": ["Penicillin Allergy"],
    "allergies": "Penicillin",
    "blood_group": "B+"
})

p2 = create_patient(doc_id, {
    "full_name": "Priya Patil",
    "age": 34,
    "gender": "F",
    "mobile_number": "9822233344",
    "email": "priya@example.com",
    "address": "Aundh, Pune",
    "medical_history": ["Diabetes Type 2"],
    "allergies": "None",
    "blood_group": "O+"
})

# Seed Unified Clinical Visit & Appointment
today_str = timezone.now().date().isoformat()
tomorrow_str = (timezone.now().date() + datetime.timedelta(days=1)).isoformat()

create_unified_visit(
    user_id=doc_id,
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
        "notes": "Advised soft diet."
    },
    appointment_data={
        "appointment_date": tomorrow_str,
        "appointment_time": "11:30:00",
        "consulting_doctor": "Dr. Aditi Deshmukh",
        "appointment_type": "PROCEDURE",
        "appointment_reason": "RCT Obturation & Permanent Restoration #46"
    }
)

# Seed Appointment for Today
create_appointment(doc_id, {
    "patient_id": p2["id"],
    "appointment_date": today_str,
    "appointment_time": "15:00:00",
    "consulting_doctor": "Dr. Rohan Joshi",
    "appointment_type": "CONSULTATION",
    "appointment_reason": "Orthodontic Aligners Follow-up"
})

# Seed Bill
create_bill(doc_id, {
    "patient_id": p1["id"],
    "doctor_name": "Dr. Aditi Deshmukh",
    "bill_date": today_str,
    "discount": 500.0,
    "tax_rate": 18.0,
    "treatments": [
        {"treatment_name": "Root Canal Treatment (RCT)", "cost": 4500.0, "quantity": 1},
        {"treatment_name": "Digital X-Ray (RVG)", "cost": 500.0, "quantity": 1}
    ],
    "payments": [
        {"amount_paid": 3000.0, "payment_mode": "UPI", "payment_date": today_str}
    ]
})

# Seed Lab Order
create_lab_work(doc_id, {
    "patient_id": p1["id"],
    "patient_name": p1["full_name"],
    "patient_mobile": p1["mobile_number"],
    "lab_name": "DentPrecision Ceramic Lab",
    "work_description": "Zirconia Crown #46 - Shade A2",
    "order_date": today_str,
    "delivery_date": tomorrow_str,
    "total_cost": 2500.0,
    "amount_paid": 1000.0
})

save_mock_db()

# Sync to Django SQL Auth
for u_name, u_email, u_role, u_pwd in [
    ("admin", "admin@dentflow.com", "SUPER_ADMIN", "Atharva@2026"),
    ("atharva", "atharva@dentflow.com", "SUPER_ADMIN", "Atharva@2026"),
    ("doctor", "doctor@dentflow.com", "CLINIC_OWNER", "password123")
]:
    sql_u, _ = User.objects.get_or_create(username=u_name, defaults={"email": u_email, "role": u_role})
    sql_u.email = u_email
    sql_u.role = u_role
    sql_u.is_staff = (u_role == "SUPER_ADMIN")
    sql_u.is_superuser = (u_role == "SUPER_ADMIN")
    sql_u.is_active = True
    sql_u.set_password(u_pwd)
    sql_u.save()

print("\n" + "=" * 60)
print("SUCCESS: Database Seeded!")
print("=" * 60)
print("Accounts Ready for Login:")
print("  • Super Admin 1: username: 'admin'   | password: 'Atharva@2026'")
print("  • Super Admin 2: username: 'atharva' | password: 'Atharva@2026'")
print("  • Clinic Owner:  username: 'doctor'  | password: 'password123'")
print("=" * 60)
