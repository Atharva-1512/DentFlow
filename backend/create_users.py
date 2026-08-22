import os
import django

# Setup Django (needed to load settings and make password hashing utilities work)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dentflow.settings')
django.setup()

from core.mongodb import db, create_user

print("Seeding MongoDB...")

# Clear existing users to start fresh
db.users.delete_many({})
db.subscription_events.delete_many({})

# 1. Create Super Admin
admin_user = create_user(
    email="admin@dentflow.com",
    username="admin",
    password="password123",
    role="SUPER_ADMIN",
    clinic_name="Admin",
    mobile_number="",
    address=""
)
print("Super Admin created successfully!")

# 2. Create Clinic Owner
owner_user = create_user(
    email="doctor@dentflow.com",
    username="doctor",
    password="password123",
    role="CLINIC_OWNER",
    clinic_name="Test Clinic",
    mobile_number="+919876543210",
    address="123 Clinic Street"
)
print("Clinic Owner created successfully!")

print("MongoDB Seeding complete!")
print("---")
print("Super Admin  => username: admin  | email: admin@dentflow.com  | password: password123")
print("Clinic Owner => username: doctor | email: doctor@dentflow.com | password: password123")
