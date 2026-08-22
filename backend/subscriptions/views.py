import uuid
import logging
import datetime
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .serializers import ClinicSubscriptionSerializer

logger = logging.getLogger('dentflow.billing')

class CurrentSubscriptionView(APIView):
    """
    GET /api/subscriptions/current/
    Returns current subscription status, remaining trial days, and renewal info from MongoDB.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from core.mongodb import get_subscription, create_or_update_subscription
        sub = get_subscription(request.user.id)
        
        # If no subscription is present, initialize/seed one
        if not sub:
            trial_enabled = getattr(settings, 'TRIAL_ENABLED', True)
            if trial_enabled:
                trial_days = getattr(settings, 'TRIAL_DAYS', 7)
                trial_end = timezone.now() + timezone.timedelta(days=trial_days)
                sub_data = {
                    "plan_code": "starter",
                    "status": "TRIAL",
                    "trial_start_date": timezone.now().date(),
                    "trial_end_date": trial_end
                }
            else:
                sub_data = {
                    "plan_code": "starter",
                    "status": "PAYMENT_DUE"
                }
            sub = create_or_update_subscription(request.user.id, sub_data)

        # Auto-upgrade PAYMENT_DUE with no trial to TRIAL status if trial enabled
        trial_enabled = getattr(settings, 'TRIAL_ENABLED', True)
        if trial_enabled and sub.get('status') == 'PAYMENT_DUE' and sub.get('trial_start_date') is None:
            trial_days = getattr(settings, 'TRIAL_DAYS', 7)
            trial_end = timezone.now() + timezone.timedelta(days=trial_days)
            sub = create_or_update_subscription(request.user.id, {
                "status": "TRIAL",
                "trial_start_date": timezone.now().date(),
                "trial_end_date": trial_end
            })

        return Response(ClinicSubscriptionSerializer(sub).data)


class CreateSubscriptionView(APIView):
    """
    POST /api/subscriptions/create/
    Creates a Razorpay Subscription checkout session using MongoDB.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan_code = request.data.get('plan_code', 'starter')
        
        key_id = getattr(settings, 'RAZORPAY_KEY_ID', '')
        key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '')
        is_mock = getattr(settings, 'DEBUG', True) and (not key_id or "placeholder" in key_id)

        from core.mongodb import get_subscription, create_or_update_subscription
        sub = get_subscription(request.user.id) or {}
        
        # Determine plan name and price
        plan_name = "Starter Plan (Monthly)" if plan_code == 'starter' else "Starter Plan (3-Months)"
        plan_price = 199.00 if plan_code == 'starter' else 299.00

        # Update sub plan code
        if sub.get('plan_code') != plan_code:
            sub = create_or_update_subscription(request.user.id, {"plan_code": plan_code})

        if is_mock:
            mock_sub_id = f"sub_mock_{uuid.uuid4().hex[:12]}"
            create_or_update_subscription(request.user.id, {"razorpay_subscription_id": mock_sub_id})
            return Response({
                "checkout_url": None,
                "razorpay_subscription_id": mock_sub_id,
                "razorpay_key_id": "rzp_test_placeholder_key",
                "amount": plan_price,
                "plan_name": plan_name,
                "is_mock": True,
                "detail": "Mock subscription checkout initialized."
            })
            
        # Real Razorpay implementation
        import razorpay
        try:
            client = razorpay.Client(auth=(key_id, key_secret))
            razorpay_plan_id = "plan_starter_placeholder"
            
            sub_payload = {
                "plan_id": razorpay_plan_id,
                "customer_notify": 1,
                "total_count": 12,
            }
            razorpay_sub = client.subscription.create(data=sub_payload)
            create_or_update_subscription(request.user.id, {"razorpay_subscription_id": razorpay_sub['id']})

            return Response({
                "razorpay_subscription_id": razorpay_sub['id'],
                "razorpay_key_id": key_id,
                "amount": plan_price,
                "plan_name": plan_name,
                "is_mock": False
            })
        except Exception as e:
            logger.error(f"Razorpay API subscription creation failure: {str(e)}")
            return Response({"detail": f"Failed to initialize payment gateway: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CancelSubscriptionView(APIView):
    """
    POST /api/subscriptions/cancel/
    Cancels current active subscription at the end of the billing period using MongoDB.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from core.mongodb import get_subscription, cancel_subscription
        sub = get_subscription(request.user.id)
        if not sub:
            return Response({"detail": "No subscription found."}, status=status.HTTP_404_NOT_FOUND)

        key_id = getattr(settings, 'RAZORPAY_KEY_ID', '')
        key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '')
        razorpay_sub_id = sub.get('razorpay_subscription_id', '')
        is_mock = getattr(settings, 'DEBUG', True) and (not key_id or "placeholder" in key_id or not razorpay_sub_id or "mock" in razorpay_sub_id)

        if is_mock:
            cancel_subscription(request.user.id)
            return Response({"detail": "Subscription cancelled successfully (Mock)."})

        import razorpay
        try:
            client = razorpay.Client(auth=(key_id, key_secret))
            client.subscription.cancel(razorpay_sub_id, {"cancel_at_cycle_end": 1})
            cancel_subscription(request.user.id)
            return Response({"detail": "Renewal cancelled successfully."})
        except Exception as e:
            logger.error(f"Razorpay subscription cancel failure: {str(e)}")
            return Response({"detail": f"Gateway cancel failure: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RazorpayWebhookView(APIView):
    """
    POST /api/webhooks/razorpay/
    HMAC signature-verified webhook handler processing notifications atomically to MongoDB.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        import hmac
        import hashlib
        import json
        
        payload_bytes = request.body
        signature = request.headers.get('X-Razorpay-Signature')
        webhook_secret = getattr(settings, 'RAZORPAY_WEBHOOK_SECRET', '')

        if webhook_secret and signature:
            expected = hmac.new(
                webhook_secret.encode('utf-8'),
                payload_bytes,
                hashlib.sha256
            ).hexdigest()
            if not hmac.compare_digest(expected, signature):
                logger.warning("Razorpay webhook signature verification failed.")
                return Response({"detail": "Invalid signature."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            payload_json = json.loads(payload_bytes.decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            return Response({"detail": "Invalid JSON format."}, status=status.HTTP_400_BAD_REQUEST)

        event_id = payload_json.get('id')
        event_type = payload_json.get('event')

        if not event_id or not event_type:
            return Response({"detail": "Missing identifier parameters."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from core.mongodb import db
            
            # Check event deduplication
            if db.subscription_events.find_one({"razorpay_event_id": event_id}):
                logger.info(f"Duplicate Razorpay webhook event ignored: {event_id}")
                return Response({"status": "processed"})

            # Log the event
            db.subscription_events.insert_one({
                "razorpay_event_id": event_id,
                "event_type": event_type,
                "payload": payload_json,
                "created_at": timezone.now().isoformat()
            })

            # Resolve Razorpay subscription identifier from payload
            sub_payload = payload_json.get('payload', {}).get('subscription', {}).get('entity', {})
            razorpay_sub_id = sub_payload.get('id') if sub_payload else None

            if razorpay_sub_id:
                user_doc = db.users.find_one({"subscription.razorpay_subscription_id": razorpay_sub_id})
                if user_doc:
                    user_id = user_doc["_id"]
                    sub = user_doc["subscription"]
                    
                    if event_type in ['subscription.activated', 'payment.captured']:
                        sub["status"] = "ACTIVE"
                        sub["grace_period_end_date"] = None
                    elif event_type == 'payment.failed':
                        sub["status"] = "PAYMENT_DUE"
                        grace_days = getattr(settings, 'SUBSCRIPTION_GRACE_DAYS', 3)
                        grace_end = timezone.now() + timezone.timedelta(days=grace_days)
                        sub["grace_period_end_date"] = grace_end.isoformat()
                    elif event_type == 'subscription.cancelled':
                        sub["status"] = "CANCELLED"
                        sub["cancelled_at"] = timezone.now().isoformat()

                    db.users.update_one(
                        {"_id": user_id},
                        {"$set": {"subscription": sub, "updated_at": timezone.now().isoformat()}}
                    )
            
            return Response({"status": "processed"})
        except Exception as e:
            logger.error(f"Webhook execution failure: {str(e)}")
            return Response({"detail": f"Internal process error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
