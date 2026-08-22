import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dentflow.settings')
django.setup()

from django.contrib.auth.hashers import make_password
from django.contrib.auth import get_user_model
from django.utils import timezone
from core.mongodb import db, gen_uuid, to_iso

User = get_user_model()

def setup_super_admin():
    print("=" * 60)
    print("CREATING / UPDATING SUPER ADMIN ACCOUNTS")
    print("=" * 60)

    admin_accounts = [
        {"username": "admin", "email": "admin@dentflow.com"},
        {"username": "atharva", "email": "atharva@dentflow.com"}
    ]
    password = "Atharva@2026"
    hashed_pwd = make_password(password)

    # 1. MongoDB Setup
    for acc in admin_accounts:
        u_name = acc["username"]
        u_email = acc["email"]

        existing_mongo = db.users.find_one({
            "$or": [
                {"username": u_name},
                {"email": u_email}
            ]
        })

        if existing_mongo:
            db.users.update_one(
                {"_id": existing_mongo["_id"]},
                {
                    "$set": {
                        "username": u_name,
                        "email": u_email,
                        "password": hashed_pwd,
                        "role": "SUPER_ADMIN",
                        "is_active": True,
                        "updated_at": to_iso(timezone.now())
                    }
                }
            )
            print(f"[MongoDB] Updated Super Admin: username='{u_name}' | email='{u_email}'")
        else:
            user_doc = {
                "_id": gen_uuid(),
                "email": u_email,
                "username": u_name,
                "password": hashed_pwd,
                "role": "SUPER_ADMIN",
                "is_active": True,
                "clinic": None,
                "subscription": None,
                "patients": [],
                "appointments": [],
                "created_at": to_iso(timezone.now()),
                "updated_at": to_iso(timezone.now())
            }
            db.users.insert_one(user_doc)
            print(f"[MongoDB] Created Super Admin: username='{u_name}' | email='{u_email}'")

        # 2. Django SQL Auth Sync
        sql_user, created = User.objects.get_or_create(
            username=u_name,
            defaults={
                "email": u_email,
                "role": "SUPER_ADMIN",
                "is_staff": True,
                "is_superuser": True,
                "is_active": True
            }
        )
        sql_user.email = u_email
        sql_user.role = "SUPER_ADMIN"
        sql_user.is_staff = True
        sql_user.is_superuser = True
        sql_user.is_active = True
        sql_user.set_password(password)
        sql_user.save()
        status_text = "Created" if created else "Updated"
        print(f"[Django Auth] {status_text} Super Admin: username='{u_name}'")

    print("\n" + "=" * 60)
    print("SUCCESS: Super Admin Account Configured!")
    print("=" * 60)
    print("You can log in with either of the following credentials:")
    print("  1. Username: admin   | Password: Atharva@2026")
    print("  2. Username: atharva | Password: Atharva@2026")
    print("=" * 60)

if __name__ == "__main__":
    setup_super_admin()
