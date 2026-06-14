import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dentflow.settings')
django.setup()

from django.utils import timezone
from django.contrib.auth import get_user_model
from clinics.models import Clinic
from subscriptions.models import SubscriptionPlan, ClinicSubscription, SubscriptionStatus

User = get_user_model()

clinic, _ = Clinic.objects.get_or_create(name='Test Clinic', slug='test-clinic')

# Ensure clinic has a WhatsApp number for receiving summaries
if not clinic.notification_whatsapp_number:
    clinic.notification_whatsapp_number = '+919876543210'
    clinic.save(update_fields=['notification_whatsapp_number'])

admin_user, admin_created = User.objects.get_or_create(email='admin@dentflow.com', username='admin')
if admin_created:
    admin_user.set_password('password123')
    admin_user.role = 'SUPER_ADMIN'
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.save()

owner_user, owner_created = User.objects.get_or_create(email='doctor@dentflow.com', username='doctor')
if owner_created:
    owner_user.set_password('password123')
    owner_user.role = 'CLINIC_OWNER'
    owner_user.clinic = clinic
    owner_user.save()

# Seed starter subscription plans
plan, _ = SubscriptionPlan.objects.get_or_create(
    code='starter',
    defaults={
        'name': 'Starter Plan (Monthly)',
        'price': 199.00,
        'billing_cycle': 'monthly',
        'is_active': True
    }
)

plan_quarterly, _ = SubscriptionPlan.objects.get_or_create(
    code='starter_quarterly',
    defaults={
        'name': 'Starter Plan (3-Months)',
        'price': 299.00,
        'billing_cycle': 'quarterly',
        'is_active': True
    }
)

# Assign an active subscription to the test clinic
subscription, sub_created = ClinicSubscription.objects.get_or_create(
    clinic=clinic,
    defaults={
        'plan': plan,
        'status': SubscriptionStatus.ACTIVE,
        'start_date': timezone.now().date(),
        'next_billing_date': timezone.now().date() + timezone.timedelta(days=30),
    }
)

if sub_created:
    print(f'Subscription created: {subscription}')
else:
    print(f'Subscription already exists: {subscription}')

print('Accounts ready!')
print('---')
print('Super Admin  => username: admin  | email: admin@dentflow.com  | password: password123')
print('Clinic Owner => username: doctor | email: doctor@dentflow.com | password: password123')
