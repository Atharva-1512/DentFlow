import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dentflow.settings')
django.setup()

from django.contrib.auth import get_user_model
from clinics.models import Clinic

User = get_user_model()

clinic, _ = Clinic.objects.get_or_create(name='Test Clinic', slug='test-clinic')

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

print('Accounts ready!')
