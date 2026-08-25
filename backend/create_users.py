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
        {"id": "doc-1", "name": "Dr. Aditi Deshmukh", "qualification": "BDS, MDS (Endodontics)", "specialization": "Root Canal & Restorative Specialist", "fee": 600, "shift": "09:00 - 14:00"},
        {"id": "doc-2", "name": "Dr. Rohan Joshi", "qualification": "BDS, MDS (Orthodontics)", "specialization": "Braces & Clear Aligners", "fee": 800, "shift": "14:00 - 19:00"},
        {"id": "doc-3", "name": "Dr. Sameer Kulkarni", "qualification": "BDS, MDS (Oral & Maxillofacial)", "specialization": "Implantologist & Surgeon", "fee": 1000, "shift": "10:00 - 16:00"}
    ],
    "treatments_catalog": [
        {"id": "t-1", "name": "Rotary Root Canal Treatment (RCT)", "category": "Endodontics", "default_cost": 4500, "duration": "45 min"},
        {"id": "t-2", "name": "Scaling & Ultrasonic Polishing", "category": "General", "default_cost": 1500, "duration": "30 min"},
        {"id": "t-3", "name": "Premium Zirconia Ceramic Crown", "category": "Prosthodontics", "default_cost": 8500, "duration": "30 min"},
        {"id": "t-4", "name": "Titanium Dental Implant (Single)", "category": "Implantology", "default_cost": 28000, "duration": "60 min"},
        {"id": "t-5", "name": "Clear Aligner 3D Scan & Assessment", "category": "Orthodontics", "default_cost": 2500, "duration": "30 min"},
        {"id": "t-6", "name": "Digital RVG Intraoral X-Ray", "category": "Diagnostics", "default_cost": 500, "duration": "15 min"}
    ]
})

# Seed Sample Patients
p1 = create_patient(doc_id, {
    "full_name": "Aarav Sharma",
    "age": 29,
    "gender": "M",
    "mobile_number": "9811122233",
    "email": "aarav.sharma@example.com",
    "address": "Flat 401, Koregaon Park, Pune",
    "medical_history": ["Penicillin Allergy", "Mild Asthmatic"],
    "allergies": "Penicillin",
    "blood_group": "B+"
})

p2 = create_patient(doc_id, {
    "full_name": "Priya Patil",
    "age": 34,
    "gender": "F",
    "mobile_number": "9822233344",
    "email": "priya.patil@example.com",
    "address": "B-12 Meadows, Aundh, Pune",
    "medical_history": ["Diabetes Type 2 (HbA1c 6.8)"],
    "allergies": "None",
    "blood_group": "O+"
})

p3 = create_patient(doc_id, {
    "full_name": "Vikram Malhotra",
    "age": 42,
    "gender": "M",
    "mobile_number": "9833344455",
    "email": "vikram.m@example.com",
    "address": "Penthouse 14, Kalyani Nagar, Pune",
    "medical_history": ["Hypertension"],
    "allergies": "Sulfa drugs",
    "blood_group": "A+"
})

p4 = create_patient(doc_id, {
    "full_name": "Ananya Verma",
    "age": 26,
    "gender": "F",
    "mobile_number": "9844455566",
    "email": "ananya.v@example.com",
    "address": "Row House 7, Viman Nagar, Pune",
    "medical_history": ["No known allergies"],
    "allergies": "None",
    "blood_group": "AB+"
})

today = timezone.now().date()
today_str = today.isoformat()
tomorrow_str = (today + datetime.timedelta(days=1)).isoformat()
day_after_str = (today + datetime.timedelta(days=2)).isoformat()
yesterday_str = (today - datetime.timedelta(days=1)).isoformat()

# Seed Unified Clinical Visits
create_unified_visit(
    user_id=doc_id,
    patient_data={"id": p1["id"]},
    visit_data={
        "consulting_doctor": "Dr. Aditi Deshmukh",
        "chief_complaint": "Acute pulsating pain in lower right tooth (Tooth 46) aggravated by cold foods",
        "diagnosis": "Acute Irreversible Pulpitis #46 with periapical tenderness",
        "treatment_given": "Rotary biomechanical preparation (BMP) done up to #25 6% under 2% Lignocaine. Calcium hydroxide medicament placed.",
        "prescriptions": [
            {"medicine": "Amoxicillin + Clavulanic Acid 625mg", "dosage": "1-0-1 (BID)", "duration": "5 days", "notes": "Post meals"},
            {"medicine": "Ketorol DT 10mg", "dosage": "1 tab SOS", "duration": "3 days", "notes": "Disperse in 15ml water during pain"}
        ],
        "notes": "Advised avoid chewing on right side. Next appointment scheduled for gutta-percha obturation & core build-up."
    },
    appointment_data={
        "appointment_date": tomorrow_str,
        "appointment_time": "11:30:00",
        "consulting_doctor": "Dr. Aditi Deshmukh",
        "appointment_type": "PROCEDURE",
        "appointment_reason": "RCT Obturation & Permanent Restoration #46"
    }
)

create_unified_visit(
    user_id=doc_id,
    patient_data={"id": p3["id"]},
    visit_data={
        "consulting_doctor": "Dr. Sameer Kulkarni",
        "chief_complaint": "Missing lower left first molar (Tooth 36), masticatory difficulty",
        "diagnosis": "Edentulous space #36 with adequate bone density",
        "treatment_given": "Pre-implant CBCT evaluation and digital surgical guide planned. Osteotomy performed.",
        "prescriptions": [
            {"medicine": "Augmentin 625mg", "dosage": "1-0-1", "duration": "5 days", "notes": "After food"},
            {"medicine": "Chlorhexidine 0.2% Rinse", "dosage": "10ml BID", "duration": "7 days", "notes": "Do not swallow"}
        ],
        "notes": "Advised oral hygiene maintenance."
    },
    appointment_data={
        "appointment_date": day_after_str,
        "appointment_time": "10:00:00",
        "consulting_doctor": "Dr. Sameer Kulkarni",
        "appointment_type": "SURGERY",
        "appointment_reason": "Titanium Implant Placement #36"
    }
)

# Seed Appointments
create_appointment(doc_id, {
    "patient_id": p2["id"],
    "appointment_date": today_str,
    "appointment_time": "14:30:00",
    "consulting_doctor": "Dr. Rohan Joshi",
    "appointment_type": "CONSULTATION",
    "appointment_reason": "Clear Aligners Progress Review (Tray #8)"
})

create_appointment(doc_id, {
    "patient_id": p4["id"],
    "appointment_date": today_str,
    "appointment_time": "16:15:00",
    "consulting_doctor": "Dr. Aditi Deshmukh",
    "appointment_type": "PROCEDURE",
    "appointment_reason": "Ultrasonic Scaling & Polishing"
})

# Seed Bills
create_bill(doc_id, {
    "patient_id": p1["id"],
    "doctor_name": "Dr. Aditi Deshmukh",
    "bill_date": today_str,
    "discount": 500.0,
    "tax_rate": 18.0,
    "treatments": [
        {"treatment_name": "Rotary Root Canal Treatment (RCT)", "cost": 4500.0, "quantity": 1},
        {"treatment_name": "Digital RVG Intraoral X-Ray", "cost": 500.0, "quantity": 1},
        {"treatment_name": "Premium Zirconia Ceramic Crown", "cost": 8500.0, "quantity": 1}
    ],
    "payments": [
        {"amount_paid": 5000.0, "payment_mode": "UPI", "payment_date": today_str}
    ]
})

create_bill(doc_id, {
    "patient_id": p3["id"],
    "doctor_name": "Dr. Sameer Kulkarni",
    "bill_date": yesterday_str,
    "discount": 1000.0,
    "tax_rate": 18.0,
    "treatments": [
        {"treatment_name": "Titanium Dental Implant (Single)", "cost": 28000.0, "quantity": 1}
    ],
    "payments": [
        {"amount_paid": 15000.0, "payment_mode": "Card", "payment_date": yesterday_str}
    ]
})

# Seed Lab Orders
create_lab_work(doc_id, {
    "patient_id": p1["id"],
    "patient_name": p1["full_name"],
    "patient_mobile": p1["mobile_number"],
    "lab_name": "DentPrecision Ceramic Lab",
    "work_description": "Zirconia Crown #46 - Shade A2 (Translucent)",
    "order_date": today_str,
    "delivery_date": tomorrow_str,
    "total_cost": 2800.0,
    "amount_paid": 1500.0
})

create_lab_work(doc_id, {
    "patient_id": p2["id"],
    "patient_name": p2["full_name"],
    "patient_mobile": p2["mobile_number"],
    "lab_name": "AlignerTech 3D Ortho Lab",
    "work_description": "Clear Aligner Stage 2 (Trays #9 to #16)",
    "order_date": yesterday_str,
    "delivery_date": day_after_str,
    "total_cost": 12000.0,
    "amount_paid": 12000.0
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
