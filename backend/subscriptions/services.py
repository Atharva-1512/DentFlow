import logging
from django.db import transaction
from .models import ClinicSubscription, SubscriptionEvent, SubscriptionStatus

logger = logging.getLogger('dentflow.billing')

def process_razorpay_webhook(event_id, event_type, payload):
    """
    Hardened webhook handler for Razorpay subscription logs.
    1. Runs within transaction.atomic() to ensure consistency.
    2. Uses select_for_update() on ClinicSubscription to prevent state race conditions.
    3. Prevents duplicate logging using unique razorpay_event_id checks.
    """
    if not event_id:
        logger.error("Razorpay webhook received without event ID.")
        return None

    with transaction.atomic():
        # 1. Event Deduplication check
        if SubscriptionEvent.objects.filter(razorpay_event_id=event_id).exists():
            logger.info(f"Duplicate Razorpay webhook event ignored: {event_id}")
            return None

        # Resolve Razorpay subscription identifier from payload
        # Structure payload: { "payload": { "subscription": { "entity": { "id": "sub_XXX" } } } }
        sub_payload = payload.get('payload', {}).get('subscription', {}).get('entity', {})
        razorpay_sub_id = sub_payload.get('id') if sub_payload else None

        subscription = None
        if razorpay_sub_id:
            try:
                # 2. Prevent race conditions: lock the subscription row
                subscription = ClinicSubscription.objects.select_for_update().get(
                    razorpay_subscription_id=razorpay_sub_id
                )
            except ClinicSubscription.DoesNotExist:
                logger.warning(f"ClinicSubscription not found for razorpay_subscription_id: {razorpay_sub_id}")

        # 3. Log event payload
        event = SubscriptionEvent.objects.create(
            clinic_subscription=subscription,
            event_type=event_type,
            razorpay_event_id=event_id,
            payload_json=payload
        )

        # 4. State updates based on events
        if subscription:
            old_status = subscription.status
            
            # Map events to status
            if event_type == 'subscription.activated':
                subscription.status = SubscriptionStatus.ACTIVE
            elif event_type == 'payment.captured':
                subscription.status = SubscriptionStatus.ACTIVE
                subscription.grace_period_end_date = None  # Reset grace periods upon successful payment
            elif event_type == 'payment.failed':
                subscription.status = SubscriptionStatus.PAYMENT_DUE
                # Let grace period logic handle duration calculations (e.g. grace period end date update)
                from django.utils import timezone
                from django.conf import settings
                grace_days = getattr(settings, 'SUBSCRIPTION_GRACE_DAYS', 3)
                subscription.grace_period_end_date = timezone.now() + timezone.timedelta(days=grace_days)
            elif event_type == 'subscription.cancelled':
                subscription.status = SubscriptionStatus.CANCELLED
                subscription.cancelled_at = timezone.now()

            subscription.save()
            logger.info(f"Subscription status transitioned for clinic {subscription.clinic.id}: {old_status} -> {subscription.status}")

        return event
