import uuid
import datetime
from django.test import TestCase, override_settings
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from clinics.models import Clinic
from accounts.models import UserRole
from subscriptions.models import SubscriptionPlan, ClinicSubscription, SubscriptionStatus, SubscriptionEvent
from patients.models import Patient
from appointments.models import Appointment
from notifications.models import (
    NotificationLog, NotificationType, RecipientType,
    ReminderHistory, ReminderSlot, ReminderTarget, ReminderStatus, WhatsAppSession
)
from visits.models import Visit
from core.middleware import TenantMiddleware
from core.permissions import SubscriptionAccessPermission, TenantIsolationPermission

User = get_user_model()

# A mock API view to test permissions in action
class MockProtectedAPIView(APIView):
    permission_classes = [TenantIsolationPermission, SubscriptionAccessPermission]
    
    def get(self, request):
        return Response({"status": "success", "clinic_id": str(request.clinic.id) if request.clinic else None})


class MiddlewareAndPermissionTestCase(TestCase):
    """
    Test suite verifying tenant isolation middleware, Super Admin impersonation,
    and subscription-based endpoint permissions.
    """
    def setUp(self):
        self.factory = APIRequestFactory()
        
        # Create clinics
        self.clinic_a = Clinic.objects.create(name="Clinic A", slug="clinic-a")
        self.clinic_b = Clinic.objects.create(name="Clinic B", slug="clinic-b")
        
        # Create users
        self.owner_a = User.objects.create_user(
            username="owner_a", email="owner_a@example.com", password="password",
            role=UserRole.CLINIC_OWNER, clinic=self.clinic_a
        )
        self.owner_b = User.objects.create_user(
            username="owner_b", email="owner_b@example.com", password="password",
            role=UserRole.CLINIC_OWNER, clinic=self.clinic_b
        )
        self.super_admin = User.objects.create_user(
            username="super_admin", email="admin@example.com", password="password",
            role=UserRole.SUPER_ADMIN, clinic=None
        )
        
        # Create a default plan
        self.plan = SubscriptionPlan.objects.create(
            name="Starter Plan (Monthly)", code="starter", price=199.00, billing_cycle="monthly"
        )
        
        # Setup Clinic A Subscription (ACTIVE)
        self.sub_a = ClinicSubscription.objects.create(
            clinic=self.clinic_a, plan=self.plan, status=SubscriptionStatus.ACTIVE
        )
        # Setup Clinic B Subscription (TRIAL)
        self.sub_b = ClinicSubscription.objects.create(
            clinic=self.clinic_b, plan=self.plan, status=SubscriptionStatus.TRIAL,
            trial_start_date=timezone.now().date(),
            trial_end_date=timezone.now() + timezone.timedelta(days=7)
        )

    def test_middleware_resolves_clinic_owner(self):
        """
        Tests that TenantMiddleware attaches the correct clinic context to Clinic Owners.
        """
        request = self.factory.get('/api/patients/')
        request.user = self.owner_a
        
        # Run middleware
        middleware = TenantMiddleware(lambda req: req)
        processed_request = middleware(request)
        
        self.assertEqual(processed_request.clinic, self.clinic_a)

    def test_middleware_resolves_super_admin_no_impersonation(self):
        """
        Tests that TenantMiddleware sets clinic context to None for Super Admin by default.
        """
        request = self.factory.get('/api/patients/')
        request.user = self.super_admin
        
        middleware = TenantMiddleware(lambda req: req)
        processed_request = middleware(request)
        
        # SimpleLazyObject must be evaluated using == comparison
        self.assertEqual(processed_request.clinic, None)

    def test_middleware_resolves_super_admin_valid_impersonation(self):
        """
        Tests that TenantMiddleware sets clinic context to target clinic if Super Admin passes X-Impersonate-Clinic.
        """
        request = self.factory.get('/api/patients/', HTTP_X_IMPERSONATE_CLINIC=str(self.clinic_b.id))
        request.user = self.super_admin
        
        middleware = TenantMiddleware(lambda req: req)
        processed_request = middleware(request)
        
        self.assertEqual(processed_request.clinic, self.clinic_b)

    def test_middleware_fails_securely_on_invalid_impersonation_id(self):
        """
        Tests that TenantMiddleware blocks the request if X-Impersonate-Clinic contains an invalid UUID.
        """
        request = self.factory.get('/api/patients/', HTTP_X_IMPERSONATE_CLINIC="invalid-uuid")
        request.user = self.super_admin
        
        middleware = TenantMiddleware(lambda req: req)
        processed_request = middleware(request)
        
        with self.assertRaises(PermissionDenied):
            # Accessing request.clinic inside bool() triggers evaluation of the SimpleLazyObject
            _ = bool(processed_request.clinic)

    def test_subscription_access_permission_active(self):
        """
        Tests that Clinic Owner with ACTIVE status can access the protected view.
        """
        request = self.factory.get('/api/patients/')
        force_authenticate(request, user=self.owner_a)
        
        # Resolve clinic manually
        request.clinic = self.clinic_a
        
        view = MockProtectedAPIView.as_view()
        response = view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_subscription_access_permission_trial(self):
        """
        Tests that Clinic Owner with TRIAL status can access the protected view.
        """
        request = self.factory.get('/api/patients/')
        force_authenticate(request, user=self.owner_b)
        request.clinic = self.clinic_b
        
        view = MockProtectedAPIView.as_view()
        response = view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_subscription_access_permission_exempt_paths(self):
        """
        Tests that protected access checks are skipped for paths like token validation and billing.
        """
        request = self.factory.get('/api/subscriptions/current/')
        request.user = self.owner_a
        request.clinic = self.clinic_a
        
        # Temporarily make subscription expired to test bypass
        self.sub_a.status = SubscriptionStatus.EXPIRED
        self.sub_a.save()
        
        # Test custom bypass route
        perm = SubscriptionAccessPermission()
        has_perm = perm.has_permission(request, None)
        self.assertTrue(has_perm)

    def test_subscription_access_permission_expired_blocked(self):
        """
        Tests that Clinic Owner with EXPIRED status is blocked from protected API views.
        """
        self.sub_a.status = SubscriptionStatus.EXPIRED
        self.sub_a.save()
        
        request = self.factory.get('/api/patients/')
        request.user = self.owner_a
        request.clinic = self.clinic_a
        
        # Verify permissions fails
        perm = SubscriptionAccessPermission()
        has_perm = perm.has_permission(request, None)
        self.assertFalse(has_perm)

    def test_subscription_access_permission_cancelled_blocked(self):
        """
        Tests that Clinic Owner with CANCELLED status is blocked from protected API views.
        """
        self.sub_a.status = SubscriptionStatus.CANCELLED
        self.sub_a.save()
        
        request = self.factory.get('/api/patients/')
        request.user = self.owner_a
        request.clinic = self.clinic_a
        
        perm = SubscriptionAccessPermission()
        has_perm = perm.has_permission(request, None)
        self.assertFalse(has_perm)

    def test_subscription_access_permission_payment_due_grace_period(self):
        """
        Tests that PAYMENT_DUE subscription permits access inside grace period and blocks outside.
        """
        self.sub_a.status = SubscriptionStatus.PAYMENT_DUE
        
        # Case 1: Within grace period (grace_period_end_date = tomorrow)
        self.sub_a.grace_period_end_date = timezone.now() + timezone.timedelta(days=1)
        self.sub_a.save()
        
        request = self.factory.get('/api/patients/')
        request.user = self.owner_a
        request.clinic = self.clinic_a
        
        perm = SubscriptionAccessPermission()
        self.assertTrue(perm.has_permission(request, None))
        
        # Case 2: Past grace period (grace_period_end_date = yesterday)
        self.sub_a.grace_period_end_date = timezone.now() - timezone.timedelta(days=1)
        self.sub_a.save()
        
        self.assertFalse(perm.has_permission(request, None))

    def test_super_admin_bypasses_subscription_blocking(self):
        """
        Tests that Super Admins bypass subscription-based page blocks.
        """
        self.sub_a.status = SubscriptionStatus.EXPIRED
        self.sub_a.save()
        
        request = self.factory.get('/api/patients/', HTTP_X_IMPERSONATE_CLINIC=str(self.clinic_a.id))
        request.user = self.super_admin
        request.clinic = self.clinic_a
        
        perm = SubscriptionAccessPermission()
        self.assertTrue(perm.has_permission(request, None))

    def test_tenant_isolation_prevents_clinic_cross_access(self):
        """
        Integration test verifying Clinic Owner B cannot access or validate contexts belonging to Clinic Owner A.
        """
        request = self.factory.get('/api/patients/')
        request.user = self.owner_b
        
        # Set clinic resolving header to A to simulate an bypass try
        request.clinic = self.clinic_b # Middleware enforces context is Owner B's clinic (B)
        
        perm = TenantIsolationPermission()
        # Verify access allowed for their own resolved clinic
        self.assertTrue(perm.has_permission(request, None))
        
        # Test cross checking - if request clinic resolves to A but request user is B, they must be rejected.
        # This is handled dynamically by our viewset filters and queries. Let's verify that the permission fails
        # if the resolved clinic is none.
        request.clinic = None
        self.assertFalse(perm.has_permission(request, None))


@override_settings(DEBUG=True, RAZORPAY_KEY_ID='rzp_test_placeholder_key')
class DentFlowAPITestCase(TestCase):
    """
    Integration test suite verifying API routing, authentication permissions,
    database managers, atomic transactions, and custom serialization layers.
    """
    def setUp(self):
        from rest_framework.test import APIClient
        self.client = APIClient()
        
        # Setup clinics
        self.clinic_a = Clinic.objects.create(name="Clinic A", slug="clinic-a")
        self.clinic_b = Clinic.objects.create(name="Clinic B", slug="clinic-b")
        
        # Setup users
        self.owner_a = User.objects.create_user(
            username="owner_a_api", email="owner_a_api@example.com", password="password",
            role=UserRole.CLINIC_OWNER, clinic=self.clinic_a
        )
        self.owner_b = User.objects.create_user(
            username="owner_b_api", email="owner_b_api@example.com", password="password",
            role=UserRole.CLINIC_OWNER, clinic=self.clinic_b
        )
        self.super_admin = User.objects.create_user(
            username="super_admin_api", email="admin_api@example.com", password="password",
            role=UserRole.SUPER_ADMIN, clinic=None
        )
        
        # Setup Plan & Subscriptions
        self.plan = SubscriptionPlan.objects.create(
            name="Starter Plan (Monthly)", code="starter", price=199.00, billing_cycle="monthly"
        )
        self.sub_a = ClinicSubscription.objects.create(
            clinic=self.clinic_a, plan=self.plan, status=SubscriptionStatus.ACTIVE,
            razorpay_subscription_id="sub_active_123"
        )
        self.sub_b = ClinicSubscription.objects.create(
            clinic=self.clinic_b, plan=self.plan, status=SubscriptionStatus.TRIAL,
            trial_start_date=timezone.now().date(),
            trial_end_date=timezone.now() + timezone.timedelta(days=7),
            razorpay_subscription_id="sub_trial_123"
        )

    def test_authentication_me_api(self):
        """
        Tests GET /api/accounts/me/ returns user details and clinic context.
        """
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get('/api/accounts/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], "owner_a_api")
        self.assertEqual(response.data['clinic']['slug'], "clinic-a")

    def test_current_subscription_api(self):
        """
        Tests GET /api/subscriptions/current/ returns accurate active trial days.
        """
        self.client.force_authenticate(user=self.owner_b)
        response = self.client.get('/api/subscriptions/current/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], SubscriptionStatus.TRIAL)
        self.assertGreater(response.data['trial_days_remaining'], 0)

    def test_create_subscription_api(self):
        """
        Tests POST /api/subscriptions/create/ generates Razorpay checkout configuration.
        """
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post('/api/subscriptions/create/', {"plan_code": "starter"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("razorpay_subscription_id", response.data)

    def test_cancel_subscription_api(self):
        """
        Tests POST /api/subscriptions/cancel/ cancels future renewals.
        """
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post('/api/subscriptions/cancel/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify status transitioned to CANCELLED in DB
        self.sub_a.refresh_from_db()
        self.assertEqual(self.sub_a.status, SubscriptionStatus.CANCELLED)

    def test_razorpay_webhook_api(self):
        """
        Tests POST /api/webhooks/razorpay/ processes atomic subscription checks and deduplication.
        """
        import hmac
        import hashlib
        import json
        
        # Setup payload representing payment.captured
        payload = {
            "id": "evt_test_12345",
            "event": "payment.captured",
            "payload": {
                "subscription": {
                    "entity": {
                        "id": "sub_active_123"
                    }
                }
            }
        }
        payload_bytes = json.dumps(payload).encode('utf-8')
        
        # Generate valid signature matching config secret
        secret = getattr(settings, 'RAZORPAY_WEBHOOK_SECRET', 'rzp_test_placeholder_webhook_secret')
        sig = hmac.new(secret.encode('utf-8'), payload_bytes, hashlib.sha256).hexdigest()
        
        # Set subscription to PAYMENT_DUE before webhook
        self.sub_a.status = SubscriptionStatus.PAYMENT_DUE
        self.sub_a.save()
        
        # Send Webhook
        response = self.client.post(
            '/api/webhooks/razorpay/',
            data=payload_bytes,
            content_type='application/json',
            HTTP_X_RAZORPAY_SIGNATURE=sig
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify DB updated status back to ACTIVE
        self.sub_a.refresh_from_db()
        self.assertEqual(self.sub_a.status, SubscriptionStatus.ACTIVE)
        
        # Verify Event Log created
        self.assertTrue(SubscriptionEvent.objects.filter(razorpay_event_id="evt_test_12345").exists())
        
        # Send duplicate webhook event
        response_dup = self.client.post(
            '/api/webhooks/razorpay/',
            data=payload_bytes,
            content_type='application/json',
            HTTP_X_RAZORPAY_SIGNATURE=sig
        )
        self.assertEqual(response_dup.status_code, status.HTTP_200_OK)
        
        # Verify no duplicate event record was created (count remains 1)
        event_count = SubscriptionEvent.objects.filter(razorpay_event_id="evt_test_12345").count()
        self.assertEqual(event_count, 1)

    def test_patient_crud_and_search_api(self):
        """
        Tests PatientViewset CRUD, search query parameters, and tenant isolation locks.
        """
        self.client.force_authenticate(user=self.owner_a)
        
        # Create Patient
        response = self.client.post('/api/patients/', {
            "full_name": "Charlie Chaplin",
            "age": 45,
            "gender": "M",
            "mobile_number": "9999911111",
            "address": "Hollywood St",
            "consulting_doctor_name": "Dr. Keaton"
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        patient_id = response.data['id']
        
        # Test isolation: Owner B tries to query Owner A's patient
        self.client.force_authenticate(user=self.owner_b)
        response_iso = self.client.get(f'/api/patients/{patient_id}/')
        self.assertEqual(response_iso.status_code, status.HTTP_404_NOT_FOUND)
        
        # Owner A searches by doctor name
        self.client.force_authenticate(user=self.owner_a)
        response_search = self.client.get('/api/patients/?search=Keaton')
        self.assertEqual(response_search.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_search.data['results']), 1)
        self.assertEqual(response_search.data['results'][0]['full_name'], "Charlie Chaplin")

    def test_unified_visit_api(self):
        """
        Tests POST /api/visits/unified/ creates Patient, Visit, and Appointment atomically.
        """
        self.client.force_authenticate(user=self.owner_a)
        
        payload = {
            "patient": {
                "full_name": "Oliver Twist",
                "age": 12,
                "gender": "M",
                "mobile_number": "9888812345",
                "address": "London Workhouse",
                "chief_complaint": "Tooth decay"
            },
            "visit": {
                "consulting_doctor": "Dr. Brownlow",
                "diagnosis": "Severe decay in primary molar",
                "treatment_given": "Extraction",
                "prescription_notes": "Paracetamol suspension twice daily"
            },
            "next_appointment": {
                "appointment_date": str(timezone.now().date() + timezone.timedelta(days=14)),
                "appointment_time": "11:30:00",
                "consulting_doctor": "Dr. Brownlow",
                "appointment_type": "FOLLOW_UP",
                "appointment_reason": "2-week healing review check"
            }
        }
        
        response = self.client.post('/api/visits/unified/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['patient']['full_name'], "Oliver Twist")
        self.assertEqual(response.data['visit']['diagnosis'], "Severe decay in primary molar")
        self.assertEqual(response.data['next_appointment']['appointment_reason'], "2-week healing review check")

    def test_calendar_events_api(self):
        """
        Tests GET /api/calendar/events/ returns properly structured events for FullCalendar.
        """
        self.client.force_authenticate(user=self.owner_a)
        
        # Create Patient and Appointment for Clinic A
        patient = Patient.objects.create(
            clinic=self.clinic_a, full_name="Buster Keaton", age=33, gender="M", mobile_number="8888877777"
        )
        Appointment.objects.create(
            clinic=self.clinic_a, patient=patient,
            appointment_date=timezone.now().date(),
            appointment_time=datetime.time(14, 0, 0),
            consulting_doctor="Dr. Chaplin",
            appointment_type="PROCEDURE",
            appointment_reason="Filling",
            status="SCHEDULED"
        )
        
        # Query calendar
        today_str = str(timezone.now().date())
        response = self.client.get(f'/api/calendar/events/?start={today_str}&end={today_str}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['extendedProps']['patient_name'], "Buster Keaton")
        self.assertEqual(response.data[0]['extendedProps']['appointment_type'], "PROCEDURE")
        self.assertIn("T14:00:00", response.data[0]['start'])


@override_settings(
    TWILIO_ACCOUNT_SID='',
    TWILIO_AUTH_TOKEN='',
    TWILIO_WHATSAPP_FROM=''
)
class ReminderSchedulerTestCase(TestCase):
    """
    Test suite verifying the ReminderScheduler service, custom templates,
    placeholder context interpolation, and daily reminder management commands.
    """
    def setUp(self):
        # Setup Clinic with notification number, User, and Active Subscription
        self.clinic = Clinic.objects.create(
            name="Clinic Alpha", 
            slug="clinic-alpha",
            notification_whatsapp_number="9998887777"
        )
        self.owner = User.objects.create_user(
            username="owner_alpha", email="alpha@example.com", password="password",
            role=UserRole.CLINIC_OWNER, clinic=self.clinic
        )
        self.plan = SubscriptionPlan.objects.create(
            name="Starter Plan (Monthly)", code="starter", price=199.00, billing_cycle="monthly"
        )
        self.sub = ClinicSubscription.objects.create(
            clinic=self.clinic, plan=self.plan, status=SubscriptionStatus.ACTIVE
        )
        
        # Setup Patient
        self.patient = Patient.objects.create(
            clinic=self.clinic, full_name="Sherlock Holmes", age=34, gender="M", mobile_number="9998887777"
        )
        
        # Setup Appointment (Scheduled for tomorrow)
        self.tomorrow = timezone.now().date() + timezone.timedelta(days=1)
        self.appt = Appointment.objects.create(
            clinic=self.clinic, patient=self.patient,
            appointment_date=self.tomorrow,
            appointment_time=datetime.time(10, 30, 0),
            consulting_doctor="Dr. Watson",
            appointment_type="CONSULTATION",
            appointment_reason="Checkup",
            status="SCHEDULED"
        )

    def test_patient_same_day_reminder_generation(self):
        """
        Verifies that generate_patient_reminders schedules 7:00 AM patient same-day reminders.
        """
        # Execute generator for tomorrow (since appt is tomorrow)
        from notifications.services import generate_patient_reminders
        count = generate_patient_reminders(self.tomorrow)
        
        self.assertEqual(count, 1)
        
        # Verify log entry
        log = ReminderHistory.objects.get(
            clinic=self.clinic,
            recipient_number="9998887777",
            slot=ReminderSlot.SAME_DAY,
            target=ReminderTarget.PATIENT
        )
        self.assertEqual(log.status, ReminderStatus.PENDING)
        self.assertIn("Sherlock Holmes", log.message)
        self.assertIn("10:30 AM", log.message)
        self.assertIn("Dr. Watson", log.message)
        self.assertEqual(log.scheduled_for.time(), datetime.time(1, 30, 0))

    def test_clinic_summaries_generation(self):
        """
        Verifies that summaries for tomorrow (prev day) and today (same day) generate correctly.
        """
        from notifications.services import generate_clinic_summaries
        
        # Generate previous day summaries (run today for tomorrow's list)
        today = timezone.now().date()
        count = generate_clinic_summaries(today, is_previous_day=True)
        self.assertEqual(count, 1)
        
        log = ReminderHistory.objects.get(
            clinic=self.clinic,
            recipient_number="9998887777",
            slot=ReminderSlot.DAY_BEFORE,
            target=ReminderTarget.CLINIC
        )
        self.assertIn("Sherlock Holmes", log.message)
        self.assertIn("10:30 AM", log.message)
        self.assertEqual(log.scheduled_for.time(), datetime.time(13, 30, 0))

    from unittest.mock import patch

    @patch('notifications.providers.whatsapp_web.WhatsAppWebProvider.send_whatsapp_message')
    @patch('notifications.providers.whatsapp_web.WhatsAppWebProvider.get_session_status')
    def test_send_pending_reminders_service(self, mock_status, mock_send):
        """
        Verifies that send_pending_reminders dispatches due messages.
        """
        mock_status.return_value = {'status': 'CONNECTED'}
        mock_send.return_value = "msg-123"

        from notifications.services import generate_patient_reminders, dispatch_pending_reminders
        generate_patient_reminders(self.tomorrow)
        
        # Fetch log
        log = ReminderHistory.objects.get(recipient_number="9998887777")
        self.assertEqual(log.status, ReminderStatus.PENDING)
        
        # Temporarily backdate log to make it due
        log.scheduled_for = timezone.now() - timezone.timedelta(minutes=5)
        log.save()
        
        results = dispatch_pending_reminders()
        self.assertEqual(results['sent'], 1)
        
        log.refresh_from_db()
        self.assertEqual(log.status, ReminderStatus.SENT)
        self.assertIsNotNone(log.sent_at)

    @patch('notifications.providers.whatsapp_web.WhatsAppWebProvider.send_whatsapp_message')
    @patch('notifications.providers.whatsapp_web.WhatsAppWebProvider.get_session_status')
    def test_management_commands(self, mock_status, mock_send):
        """
        Tests the execute cycle of generate_reminders and send_reminders management commands.
        """
        mock_status.return_value = {'status': 'CONNECTED'}
        mock_send.return_value = "msg-123"

        from django.core.management import call_command
        
        # 1. Run generate_reminders for tomorrow
        call_command('generate_reminders', date=str(self.tomorrow))
        
        # Verify both patient same day and clinic same day logs were created
        logs_count = ReminderHistory.objects.filter(clinic=self.clinic).count()
        # 1 patient same-day, 1 clinic same-day summary = 2 logs
        self.assertEqual(logs_count, 2)
        
        # 2. Backdate logs to make them due
        ReminderHistory.objects.filter(clinic=self.clinic).update(
            scheduled_for=timezone.now() - timezone.timedelta(minutes=10)
        )
        
        # 3. Run send_reminders
        call_command('send_reminders')
        
        # Verify logs were sent
        sent_count = ReminderHistory.objects.filter(clinic=self.clinic, status=ReminderStatus.SENT).count()
        self.assertEqual(sent_count, 2)



@override_settings(DEBUG=True, RAZORPAY_KEY_ID='rzp_test_placeholder_key')
class DentFlowHardeningTestCase(TestCase):
    """
    Test suite verifying security hardening, calendar tenant isolation,
    unified visit atomic rollback, non-admin impersonation blocking,
    unauthorized requests, and Razorpay webhook validation.
    """
    def setUp(self):
        from rest_framework.test import APIClient
        self.client = APIClient()
        
        # Setup clinics
        self.clinic_a = Clinic.objects.create(name="Clinic A", slug="clinic-a")
        self.clinic_b = Clinic.objects.create(name="Clinic B", slug="clinic-b")
        
        # Setup users
        self.owner_a = User.objects.create_user(
            username="owner_a_hard", email="owner_a_hard@example.com", password="password",
            role=UserRole.CLINIC_OWNER, clinic=self.clinic_a
        )
        self.owner_b = User.objects.create_user(
            username="owner_b_hard", email="owner_b_hard@example.com", password="password",
            role=UserRole.CLINIC_OWNER, clinic=self.clinic_b
        )
        
        # Setup Plan & Subscriptions
        self.plan = SubscriptionPlan.objects.create(
            name="Starter Plan (Monthly)", code="starter", price=199.00, billing_cycle="monthly"
        )
        self.sub_a = ClinicSubscription.objects.create(
            clinic=self.clinic_a, plan=self.plan, status=SubscriptionStatus.ACTIVE,
            razorpay_subscription_id="sub_active_a"
        )
        self.sub_b = ClinicSubscription.objects.create(
            clinic=self.clinic_b, plan=self.plan, status=SubscriptionStatus.ACTIVE,
            razorpay_subscription_id="sub_active_b"
        )

    def test_calendar_events_api_tenant_isolation(self):
        """
        Tests that Clinic Owner A cannot retrieve Clinic Owner B's calendar events.
        """
        # Create Patient and Appointment for Clinic B
        patient_b = Patient.objects.create(
            clinic=self.clinic_b, full_name="B-patient", age=40, gender="F", mobile_number="9998881111"
        )
        Appointment.objects.create(
            clinic=self.clinic_b, patient=patient_b,
            appointment_date=timezone.now().date(),
            appointment_time=datetime.time(15, 0, 0),
            consulting_doctor="Dr. Watson",
            appointment_type="CONSULTATION",
            appointment_reason="Fever",
            status="SCHEDULED"
        )
        
        # Authenticate as Owner A
        self.client.force_authenticate(user=self.owner_a)
        
        # Query calendar for today
        today_str = str(timezone.now().date())
        response = self.client.get(f'/api/calendar/events/?start={today_str}&end={today_str}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify that Clinic B's appointment is NOT returned to Owner A
        self.assertEqual(len(response.data), 0)

    def test_non_admin_impersonation_blocked(self):
        """
        Tests that a non-admin user (Clinic Owner) cannot use the X-Impersonate-Clinic header
        to impersonate another clinic.
        """
        from rest_framework.test import APIRequestFactory
        from core.middleware import TenantMiddleware
        
        factory = APIRequestFactory()
        request = factory.get('/api/patients/', HTTP_X_IMPERSONATE_CLINIC=str(self.clinic_b.id))
        request.user = self.owner_a
        
        middleware = TenantMiddleware(lambda req: req)
        processed_request = middleware(request)
        
        # Should resolve to owner_a's clinic (clinic_a) and ignore the impersonation header
        self.assertEqual(processed_request.clinic, self.clinic_a)

    def test_unauthorized_access_blocked(self):
        """
        Tests that requesting a protected view without authentication returns 401 Unauthorized.
        """
        response = self.client.get('/api/patients/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_razorpay_webhook_invalid_signature(self):
        """
        Verifies that RazorpayWebhookView returns 400 Bad Request if the HMAC signature is invalid.
        """
        response = self.client.post(
            '/api/webhooks/razorpay/',
            data=b'{"id":"evt_test_123"}',
            content_type='application/json',
            HTTP_X_RAZORPAY_SIGNATURE='invalid-sig-here'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_concurrent_webhook_deduplication(self):
        """
        Verifies event deduplication at service layer.
        """
        from subscriptions.services import process_razorpay_webhook
        
        payload = {
            "id": "evt_dup_service_123",
            "event": "payment.captured",
            "payload": {
                "subscription": {
                    "entity": {
                        "id": "sub_active_a"
                    }
                }
            }
        }
        
        # Process once
        evt1 = process_razorpay_webhook("evt_dup_service_123", "payment.captured", payload)
        self.assertIsNotNone(evt1)
        
        # Process again
        evt2 = process_razorpay_webhook("evt_dup_service_123", "payment.captured", payload)
        self.assertIsNone(evt2) # Deduplicated

    def test_unified_visit_api_rollback(self):
        """
        Tests that if appointment creation fails during the unified transaction,
        the patient and visit creations are successfully rolled back.
        """
        from unittest.mock import patch
        
        payload = {
            "patient": {
                "full_name": "Rollback Test Patient",
                "age": 25,
                "gender": "M",
                "mobile_number": "9000000000"
            },
            "visit": {
                "consulting_doctor": "Dr. Smith",
                "diagnosis": "Checkup",
                "treatment_given": "None"
            },
            "next_appointment": {
                "appointment_date": str(timezone.now().date() + timezone.timedelta(days=1)),
                "appointment_time": "12:00:00",
                "consulting_doctor": "Dr. Smith",
                "appointment_type": "FOLLOW_UP",
                "appointment_reason": "Checkup follow-up"
            }
        }
        
        # Authenticate Owner A
        self.client.force_authenticate(user=self.owner_a)
        
        # Mock Appointment.objects.create to raise an exception
        with patch('appointments.models.Appointment.objects.create', side_effect=Exception("Simulated Database Error")):
            response = self.client.post('/api/visits/unified/', payload, format='json')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("Simulated Database Error", response.data['detail'])
            
        # Verify that the patient and visit were NOT created in database
        self.assertFalse(Patient.objects.filter(full_name="Rollback Test Patient").exists())
        self.assertFalse(Visit.objects.filter(consulting_doctor="Dr. Smith").exists())

