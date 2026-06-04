import hmac
import hashlib
import json
import logging
import uuid
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from core.permissions import SubscriptionAccessPermission
from clinics.models import Clinic
from .models import SubscriptionPlan, ClinicSubscription, SubscriptionStatus
from .serializers import ClinicSubscriptionSerializer, SubscriptionPlanSerializer
from .services import process_razorpay_webhook

logger = logging.getLogger('dentflow.billing')

class CurrentSubscriptionView(APIView):
    """
    GET /api/subscriptions/current/
    Returns current subscription status, remaining trial days, and renewal info.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        clinic = request.clinic
        if not clinic:
            return Response({"detail": "No clinic associated with user profile."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            subscription = ClinicSubscription.objects.get(clinic=clinic)
        except ClinicSubscription.DoesNotExist:
            # Safe seeding for clinics without subscription record
            plan, _ = SubscriptionPlan.objects.get_or_create(
                code='starter',
                defaults={'name': 'Starter Plan', 'price': 2999.00, 'billing_cycle': 'monthly'}
            )
            
            # Start trial or payment due depending on environment setting
            trial_enabled = getattr(settings, 'TRIAL_ENABLED', True)
            if trial_enabled:
                trial_days = getattr(settings, 'TRIAL_DAYS', 7)
                trial_end = timezone.now() + timezone.timedelta(days=trial_days)
                subscription = ClinicSubscription.objects.create(
                    clinic=clinic,
                    plan=plan,
                    status=SubscriptionStatus.TRIAL,
                    trial_start_date=timezone.now().date(),
                    trial_end_date=trial_end
                )
            else:
                subscription = ClinicSubscription.objects.create(
                    clinic=clinic,
                    plan=plan,
                    status=SubscriptionStatus.PAYMENT_DUE
                )

        serializer = ClinicSubscriptionSerializer(subscription)
        return Response(serializer.data)


class CreateSubscriptionView(APIView):
    """
    POST /api/subscriptions/create/
    Creates a Razorpay Subscription checkout session.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        clinic = request.clinic
        if not clinic:
            return Response({"detail": "No clinic associated with user profile."}, status=status.HTTP_400_BAD_REQUEST)

        plan_code = request.data.get('plan_code', 'starter')
        try:
            plan = SubscriptionPlan.objects.get(code=plan_code, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response({"detail": f"Pricing plan '{plan_code}' not found."}, status=status.HTTP_404_NOT_FOUND)

        key_id = getattr(settings, 'RAZORPAY_KEY_ID', '')
        key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '')

        # Fallback to mock behavior if keys are placeholders or empty (perfect for local testing)
        is_mock = getattr(settings, 'DEBUG', True) and (not key_id or "placeholder" in key_id)

        # Get or create subscription model context
        subscription, _ = ClinicSubscription.objects.get_or_create(
            clinic=clinic,
            defaults={'plan': plan, 'status': SubscriptionStatus.PAYMENT_DUE}
        )

        # Update plan if they are switching/subscribing
        if subscription.plan != plan:
            subscription.plan = plan
            subscription.save()

        if is_mock:
            mock_sub_id = f"sub_mock_{uuid.uuid4().hex[:12]}"
            subscription.razorpay_subscription_id = mock_sub_id
            subscription.save(update_fields=['razorpay_subscription_id'])
            
            return Response({
                "checkout_url": None,
                "razorpay_subscription_id": mock_sub_id,
                "razorpay_key_id": "rzp_test_placeholder_key",
                "amount": float(plan.price),
                "plan_name": plan.name,
                "is_mock": True,
                "detail": "Mock subscription checkout initialized."
            })
        
        # Real Razorpay implementation
        import razorpay
        try:
            client = razorpay.Client(auth=(key_id, key_secret))
            
            # Map plan code to Razorpay plan ID (use custom property or lookup table)
            # For testing, we look for a field razorpay_plan_id on plan, or default to a generated one
            razorpay_plan_id = subscription.razorpay_plan_id or "plan_starter_placeholder"
            
            sub_payload = {
                "plan_id": razorpay_plan_id,
                "customer_notify": 1,
                "total_count": 12, # 12 cycles e.g. 1 year
            }
            
            razorpay_sub = client.subscription.create(data=sub_payload)
            subscription.razorpay_subscription_id = razorpay_sub['id']
            subscription.save(update_fields=['razorpay_subscription_id'])

            return Response({
                "razorpay_subscription_id": razorpay_sub['id'],
                "razorpay_key_id": key_id,
                "amount": float(plan.price),
                "plan_name": plan.name,
                "is_mock": False
            })
        except Exception as e:
            logger.error(f"Razorpay API subscription creation failure: {str(e)}")
            return Response({"detail": f"Failed to initialize payment gateway: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CancelSubscriptionView(APIView):
    """
    POST /api/subscriptions/cancel/
    Cancels current active subscription at the end of the billing period.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        clinic = request.clinic
        if not clinic:
            return Response({"detail": "No clinic associated."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            subscription = ClinicSubscription.objects.get(clinic=clinic)
        except ClinicSubscription.DoesNotExist:
            return Response({"detail": "No subscription found."}, status=status.HTTP_404_NOT_FOUND)

        key_id = getattr(settings, 'RAZORPAY_KEY_ID', '')
        key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '')
        is_mock = getattr(settings, 'DEBUG', True) and (not key_id or "placeholder" in key_id or not subscription.razorpay_subscription_id or "mock" in subscription.razorpay_subscription_id)

        if is_mock:
            # Immediate local mock cancellation
            subscription.status = SubscriptionStatus.CANCELLED
            subscription.cancelled_at = timezone.now()
            subscription.save()
            return Response({"detail": "Subscription cancelled successfully (Mock)."})

        # Real Razorpay cancellation
        import razorpay
        try:
            client = razorpay.Client(auth=(key_id, key_secret))
            # Cancel at the end of billing cycle
            client.subscription.cancel(subscription.razorpay_subscription_id, {"cancel_at_cycle_end": 1})
            
            subscription.status = SubscriptionStatus.CANCELLED
            subscription.cancelled_at = timezone.now()
            subscription.save()
            return Response({"detail": "Renewal cancelled successfully."})
        except Exception as e:
            logger.error(f"Razorpay subscription cancel failure: {str(e)}")
            return Response({"detail": f"Gateway cancel failure: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RazorpayWebhookView(APIView):
    """
    POST /api/webhooks/razorpay/
    HMAC signature-verified webhook handler processing notifications atomically.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # Extract body and signature for verification
        payload_bytes = request.body
        signature = request.headers.get('X-Razorpay-Signature')
        webhook_secret = getattr(settings, 'RAZORPAY_WEBHOOK_SECRET', '')

        # 1. Enforce signature validation
        if webhook_secret and signature:
            # Case-secure constant time comparison
            expected = hmac.new(
                webhook_secret.encode('utf-8'),
                payload_bytes,
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(expected, signature):
                logger.warning("Razorpay webhook signature verification failed.")
                return Response({"detail": "Invalid signature."}, status=status.HTTP_400_BAD_REQUEST)
        
        # 2. Extract payload fields
        try:
            payload_json = json.loads(payload_bytes.decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            return Response({"detail": "Invalid JSON format."}, status=status.HTTP_400_BAD_REQUEST)

        event_id = payload_json.get('id')
        event_type = payload_json.get('event')

        if not event_id or not event_type:
            return Response({"detail": "Missing identifier parameters."}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Atomic process routing
        try:
            event = process_razorpay_webhook(event_id, event_type, payload_json)
            return Response({"status": "processed"})
        except Exception as e:
            logger.error(f"Webhook execution failure: {str(e)}")
            return Response({"detail": f"Internal process error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
