from core.mongodb import db
from django.contrib.auth import get_user_model
from clinics.models import Clinic
from subscriptions.models import ClinicSubscription
from patients.models import Patient
from visits.models import Visit, Bill
from appointments.models import Appointment
from django.db.models.signals import post_save, post_delete

def sync_sql_to_mongodb():
    # Clear test database
    db.users.delete_many({})
    db.subscription_events.delete_many({})
    
    User = get_user_model()
    # Rebuild all users and their tenant hierarchies from SQLite state
    for user in User.objects.all():
        clinic_data = None
        subscription_data = None
        
        if user.clinic:
            clinic = user.clinic
            clinic_data = {
                "id": str(clinic.id),
                "name": clinic.name,
                "slug": clinic.slug,
                "is_active": clinic.is_active,
                "notification_whatsapp_number": clinic.notification_whatsapp_number,
                "address": clinic.address,
                "created_at": clinic.created_at.isoformat() if clinic.created_at else None
            }
            
            # Fetch subscription for clinic
            try:
                sub = ClinicSubscription.objects.get(clinic=clinic)
                subscription_data = {
                    "id": str(sub.id),
                    "plan_code": sub.plan.code if sub.plan and sub.plan.code else "starter",
                    "status": sub.status,
                    "trial_start_date": sub.trial_start_date.isoformat() if sub.trial_start_date else None,
                    "trial_end_date": sub.trial_end_date.isoformat() if sub.trial_end_date else None,
                    "start_date": sub.start_date.isoformat() if sub.start_date else None,
                    "next_billing_date": sub.next_billing_date.isoformat() if sub.next_billing_date else None,
                    "grace_period_end_date": sub.grace_period_end_date.isoformat() if sub.grace_period_end_date else None,
                    "cancelled_at": sub.cancelled_at.isoformat() if sub.cancelled_at else None,
                    "razorpay_subscription_id": sub.razorpay_subscription_id
                }
            except ClinicSubscription.DoesNotExist:
                pass
                
        # Fetch patients
        patients_list = []
        if user.clinic:
            for patient in Patient.objects.filter(clinic=user.clinic):
                # Fetch visits
                visits_list = []
                for visit in Visit.objects.filter(patient=patient):
                    visits_list.append({
                        "id": str(visit.id),
                        "visit_date": visit.visit_date.isoformat(),
                        "consulting_doctor": visit.consulting_doctor,
                        "diagnosis": visit.diagnosis,
                        "treatment_given": visit.treatment_given,
                        "prescription_notes": visit.prescription_notes,
                        "general_notes": visit.general_notes,
                        "status": visit.status,
                        "is_deleted": visit.is_deleted
                    })
                    
                # Fetch bills
                bills_list = []
                for bill in Bill.objects.filter(patient=patient):
                    treatments_list = []
                    for t in bill.treatments.all():
                        treatments_list.append({
                            "id": str(t.id),
                            "treatment_name": t.treatment_name,
                            "treatment_date": t.treatment_date.isoformat() if t.treatment_date else None,
                            "quantity": t.quantity,
                            "cost": float(t.cost)
                        })
                    payments_list = []
                    for p in bill.payments.all():
                        payments_list.append({
                            "id": str(p.id),
                            "payment_date": p.payment_date.isoformat() if p.payment_date else None,
                            "amount_paid": float(p.amount_paid),
                            "payment_mode": p.payment_mode
                        })
                    bills_list.append({
                        "id": str(bill.id),
                        "patient": str(patient.id),
                        "patient_id": patient.patient_id,
                        "patient_name": bill.patient_name,
                        "patient_mobile": bill.patient_mobile,
                        "patient_age": bill.patient_age,
                        "patient_gender": bill.patient_gender,
                        "bill_number": bill.bill_number,
                        "bill_date": bill.bill_date.isoformat() if bill.bill_date else None,
                        "doctor_name": bill.doctor_name,
                        "total_cost": float(bill.total_cost),
                        "grand_total": float(bill.grand_total),
                        "amount_paid": float(bill.amount_paid),
                        "outstanding_balance": float(bill.outstanding_balance),
                        "status": bill.status,
                        "clinic_address": bill.clinic_address,
                        "clinic_contact": bill.clinic_contact,
                        "treatments": treatments_list,
                        "payments": payments_list,
                        "is_deleted": bill.is_deleted
                    })
                    
                patients_list.append({
                    "id": str(patient.id),
                    "patient_id": patient.patient_id,
                    "full_name": patient.full_name,
                    "age": patient.age,
                    "gender": patient.gender,
                    "mobile_number": patient.mobile_number,
                    "address": patient.address,
                    "consulting_doctor_name": patient.consulting_doctor_name,
                    "chief_complaint": patient.chief_complaint,
                    "notes": patient.notes,
                    "created_date": patient.created_date.isoformat() if patient.created_date else None,
                    "created_at": patient.created_at.isoformat() if patient.created_at else None,
                    "updated_at": patient.updated_at.isoformat() if patient.updated_at else None,
                    "is_deleted": patient.is_deleted,
                    "visits": visits_list,
                    "bills": bills_list
                })
                
        # Fetch appointments
        appointments_list = []
        if user.clinic:
            for appt in Appointment.objects.filter(clinic=user.clinic):
                appointments_list.append({
                    "id": str(appt.id),
                    "patient_id": str(appt.patient.id),
                    "patient_name": appt.patient.full_name,
                    "patient_mobile": appt.patient.mobile_number,
                    "appointment_date": appt.appointment_date.isoformat(),
                    "appointment_time": appt.appointment_time.isoformat(),
                    "consulting_doctor": appt.consulting_doctor,
                    "appointment_type": appt.appointment_type,
                    "appointment_reason": appt.appointment_reason,
                    "status": appt.status,
                    "created_at": appt.created_at.isoformat() if appt.created_at else None
                })
                
        db.users.insert_one({
            "_id": str(user.id),
            "email": user.email,
            "username": user.username,
            "password": user.password,
            "role": user.role,
            "is_active": user.is_active,
            "clinic": clinic_data,
            "subscription": subscription_data,
            "patients": patients_list,
            "appointments": appointments_list,
            "created_at": user.created_at.isoformat() if hasattr(user, 'created_at') and user.created_at else None,
            "updated_at": user.updated_at.isoformat() if hasattr(user, 'updated_at') and user.updated_at else None
        })

def sync_on_signal(sender, **kwargs):
    sync_sql_to_mongodb()

def register_test_signals():
    User = get_user_model()
    from visits.models import BillTreatment, BillPayment
    models = [
        User, Clinic, ClinicSubscription, Patient,
        Visit, Bill, BillTreatment, BillPayment, Appointment
    ]
    for model in models:
        post_save.connect(sync_on_signal, sender=model, dispatch_uid=f"sync_{model.__name__}")
        post_delete.connect(sync_on_signal, sender=model, dispatch_uid=f"sync_del_{model.__name__}")

def sync_mongodb_to_sql(filter, update):
    from django.db.models.signals import post_save
    from django.contrib.auth import get_user_model
    from subscriptions.models import ClinicSubscription
    
    User = get_user_model()
    post_save.disconnect(sync_on_signal, sender=ClinicSubscription, dispatch_uid="sync_ClinicSubscription")
    
    try:
        user_id = filter.get("_id")
        if user_id:
            user_doc = db._db.users.find_one({"_id": str(user_id)})
            if user_doc and user_doc.get("subscription"):
                sub_doc = user_doc["subscription"]
                try:
                    user_obj = User.objects.get(id=user_id)
                    if user_obj.clinic:
                        sub_obj, _ = ClinicSubscription.objects.get_or_create(clinic=user_obj.clinic)
                        sub_obj.status = sub_doc.get("status")
                        sub_obj.razorpay_subscription_id = sub_doc.get("razorpay_subscription_id")
                        sub_obj.save()
                except Exception:
                    pass
    finally:
        post_save.connect(sync_on_signal, sender=ClinicSubscription, dispatch_uid="sync_ClinicSubscription")

def sync_insert_to_sql(collection_name, document):
    if collection_name == "subscription_events":
        from subscriptions.models import SubscriptionEvent, ClinicSubscription
        
        clinic_sub = None
        payload = document.get("payload") or {}
        sub_payload = payload.get('payload', {}).get('subscription', {}).get('entity', {})
        razorpay_sub_id = sub_payload.get('id') if sub_payload else None
        
        if razorpay_sub_id:
            try:
                clinic_sub = ClinicSubscription.objects.get(razorpay_subscription_id=razorpay_sub_id)
            except ClinicSubscription.DoesNotExist:
                pass

        try:
            SubscriptionEvent.objects.create(
                razorpay_event_id=document.get("razorpay_event_id"),
                event_type=document.get("event_type"),
                payload_json=document.get("payload") or {},
                clinic_subscription=clinic_sub
            )
        except Exception:
            pass
