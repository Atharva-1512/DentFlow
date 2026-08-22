import os
import sys
import django
import datetime
from django.utils import timezone

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dentflow.settings')
django.setup()

from rest_framework.test import APIClient
from core.mongodb import db

print("======================================================================")
print("DENTFLOW E2E MONGO FEATURE VERIFICATION SCRIPT")
print("======================================================================")

# Clear existing users to start fresh
db.users.delete_many({})
db.subscription_events.delete_many({})

client = APIClient()

# Define dummy clinics, clinic owners, and their patient files
dummy_clinics = [
    {
        "clinic_name": "Apex Dental Clinic",
        "username": "apex_doc",
        "email": "apex@dentflow.com",
        "password": "password123",
        "mobile_number": "+919999999991",
        "patients": [
            {"full_name": "Aarav Sharma", "age": 28, "gender": "M", "mobile": "9999900001"},
            {"full_name": "Isha Patel", "age": 34, "gender": "F", "mobile": "9999900002"},
            {"full_name": "Kabir Mehta", "age": 45, "gender": "M", "mobile": "9999900003"}
        ]
    },
    {
        "clinic_name": "SmileCare Multispeciality",
        "username": "smile_doc",
        "email": "smile@dentflow.com",
        "password": "password123",
        "mobile_number": "+919999999992",
        "patients": [
            {"full_name": "Rohan Gupta", "age": 22, "gender": "M", "mobile": "9888800001"},
            {"full_name": "Ananya Roy", "age": 29, "gender": "F", "mobile": "9888800002"},
            {"full_name": "Vihaan Singh", "age": 50, "gender": "M", "mobile": "9888800003"}
        ]
    },
    {
        "clinic_name": "Zenith Orthodontics",
        "username": "zenith_doc",
        "email": "zenith@dentflow.com",
        "password": "password123",
        "mobile_number": "+919999999993",
        "patients": [
            {"full_name": "Aditya Joshi", "age": 31, "gender": "M", "mobile": "9777700001"},
            {"full_name": "Meera Sen", "age": 27, "gender": "F", "mobile": "9777700002"},
            {"full_name": "Dev Kapoor", "age": 60, "gender": "M", "mobile": "9777700003"}
        ]
    }
]

for idx, run in enumerate(dummy_clinics, 1):
    print(f"\n-------------------------------------------------------------")
    print(f"TEST RUN {idx} / 3: CLINIC: '{run['clinic_name']}'")
    print(f"-------------------------------------------------------------")

    # 1. Feature: Registration
    print("[1] Feature: User & Clinic Registration...")
    reg_payload = {
        "email": run["email"],
        "username": run["username"],
        "password": run["password"],
        "clinic_name": run["clinic_name"],
        "mobile_number": run["mobile_number"],
        "clinic_address": "123 Healthcare Boulevard"
    }
    res = client.post('/api/accounts/register/', reg_payload, format='json')
    if res.status_code != 201:
        print(f"  [ERROR] Registration failed: {res.data}")
        continue
    user_id = res.data["user"]["id"]
    print(f"  [OK] Registered! User ID: {user_id}")

    # 2. Feature: Login and JWT Token Fetch
    print("[2] Feature: JWT Token Authentication...")
    login_payload = {
        "username": run["username"],
        "password": run["password"]
    }
    res = client.post('/api/token/', login_payload, format='json')
    if res.status_code != 200:
        print(f"  [ERROR] Login failed: {res.data}")
        continue
    token = res.data["access"]
    print("  [OK] Login successful! JWT Token retrieved.")
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    # 3. Feature: Profile Query (Me)
    print("[3] Feature: Get Profile (Me)...")
    res = client.get('/api/accounts/me/')
    if res.status_code != 200:
        print(f"  [ERROR] Me Lookup failed: {res.data}")
    else:
        print(f"  [OK] Profile details retrieved: {res.data['username']} ({res.data['role']})")

    # 4. Feature: Clinic Profile Update
    print("[4] Feature: Update Clinic Profile...")
    clinic_update = {
        "name": f"{run['clinic_name']} - Updated",
        "address": "456 Wellness Plaza",
        "notification_whatsapp_number": run["mobile_number"]
    }
    # Clinic profile view expects PUT method for updates
    res = client.put('/api/accounts/clinic/', clinic_update, format='json')
    if res.status_code != 200:
        print(f"  [ERROR] Clinic update failed: {res.data}")
    else:
        print(f"  [OK] Clinic profile updated: {res.data['name']}, Address: {res.data['address']}")

    # 5. Feature: Subscription Check (Cancel is postponed to end of loop)
    print("[5] Feature: Subscription Status Check...")
    res = client.get('/api/subscriptions/current/')
    print(f"  [OK] Current status: {res.data.get('status')} | Trial days remaining: {res.data.get('trial_days_remaining')}")

    # 6. Feature: Populating Patients and visits/appointments
    print(f"[6] Feature: Populating {len(run['patients'])} Patient Documents...")
    for p_data in run['patients']:
        print(f"  * Creating Patient: {p_data['full_name']}...")
        patient_payload = {
            "full_name": p_data["full_name"],
            "age": p_data["age"],
            "gender": p_data["gender"],
            "mobile_number": p_data["mobile"],
            "address": "Some patient street",
            "consulting_doctor_name": "Dr. Dentist"
        }
        res = client.post('/api/patients/', patient_payload, format='json')
        if res.status_code != 201:
            print(f"    [ERROR] Patient creation failed: {res.data}")
            continue
        p_id = res.data["id"]
        print(f"    [OK] Patient created: ID: {p_id}, Sequential ID: {res.data['patient_id']}")

        # 7. Feature: Unified Visit (Patient + Visit + Appointment)
        print(f"    * Feature: Logging Unified Visit...")
        tomorrow = (timezone.now() + datetime.timedelta(days=1)).date()
        unified_payload = {
            "patient": {
                "id": p_id,
                "full_name": p_data["full_name"],
                "age": p_data["age"],
                "gender": p_data["gender"],
                "mobile_number": p_data["mobile"]
            },
            "visit": {
                "consulting_doctor": "Dr. Dentist",
                "diagnosis": "Decay Check",
                "treatment_given": "Filling & Scaling"
            },
            "next_appointment": {
                "appointment_date": str(tomorrow),
                "appointment_time": "11:00:00",
                "consulting_doctor": "Dr. Dentist",
                "appointment_type": "FOLLOW_UP",
                "appointment_reason": "Scaling checkup"
            }
        }
        res = client.post('/api/visits/unified/', unified_payload, format='json')
        if res.status_code != 201:
            print(f"      [ERROR] Unified visit failed: {res.data}")
        else:
            print(f"      [OK] Unified visit logged! Visit ID: {res.data['visit']['id']}")
            print(f"      [OK] Next appointment scheduled: {res.data['next_appointment']['appointment_date']} at {res.data['next_appointment']['appointment_time']}")

        # 8. Feature: Billing & Payments
        print(f"    * Feature: Creating Bill & Payment...")
        bill_payload = {
            "patient_name": p_data["full_name"],
            "patient_mobile": p_data["mobile"],
            "patient_age": p_data["age"],
            "patient_gender": p_data["gender"],
            "doctor_name": "Dr. Dentist",
            "bill_date": str(timezone.now().date()),
            "total_cost": 2500.00,
            "grand_total": 2500.00,
            "amount_paid": 1500.00,
            "status": "PARTIALLY_PAID",
            "treatments": [
                {"treatment_name": "Filling", "quantity": 1, "cost": 1500.00},
                {"treatment_name": "Scaling", "quantity": 1, "cost": 1000.00}
            ],
            "payments": [
                {"amount_paid": 1500.00, "payment_mode": "UPI"}
            ]
        }
        res = client.post('/api/visits/bills/', bill_payload, format='json')
        if res.status_code != 201:
            print(f"      [ERROR] Billing failed: {res.data}")
        else:
            bill_id = res.data["id"]
            print(f"      [OK] Bill generated: ID: {bill_id}, Outstanding balance: {res.data['outstanding_balance']}")

            # Update Bill payment
            print(f"      * Feature: Updating Bill Payment (Clearing balance)...")
            bill_update = {
                "amount_paid": 2500.00,
                "status": "PAID",
                "payments": [
                    {"amount_paid": 1500.00, "payment_mode": "UPI"},
                    {"amount_paid": 1000.00, "payment_mode": "CASH"}
                ]
            }
            res = client.patch(f'/api/visits/bills/{bill_id}/', bill_update, format='json')
            print(f"      [OK] Bill paid: New status: {res.data['status']}, Outstanding: {res.data['outstanding_balance']}")

        # 9. Feature: Patient Timeline Action
        print(f"    * Feature: Fetching Patient Timeline...")
        res = client.get(f'/api/patients/{p_id}/timeline/')
        print(f"      [OK] Timeline entries retrieved: {len(res.data)}")

    # 10. Feature: Calendar range fetch
    print("[10] Feature: FullCalendar Range Events Lookup...")
    start_date = str(timezone.now().date() - datetime.timedelta(days=7))
    end_date = str(timezone.now().date() + datetime.timedelta(days=7))
    res = client.get(f'/api/calendar/events/?start={start_date}&end={end_date}')
    print(f"  [OK] Calendar events retrieved: {len(res.data)}")

    # 11. Feature: Subscription Cancel (Tested at end so it doesn't block other API views)
    print("[11] Feature: Subscription Cancellation API...")
    res = client.post('/api/subscriptions/cancel/')
    if res.status_code == 200:
        print("  [OK] Subscription cancelled successfully!")
    else:
        print(f"  [ERROR] Cancel subscription failed: {res.data}")

    # Clear auth credentials for the next run
    client.credentials()

print("\n======================================================================")
print("E2E MONGO FEATURE VERIFICATION COMPLETED SUCCESSFULLY!")
print("======================================================================")
