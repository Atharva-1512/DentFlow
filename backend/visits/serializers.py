from rest_framework import serializers
from appointments.models import AppointmentType
from .models import Visit

class VisitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Visit
        fields = [
            'id', 'patient', 'visit_date', 'consulting_doctor', 
            'diagnosis', 'treatment_given', 'prescription_notes', 
            'general_notes', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# Scaffolding input validators for Unified Patient + Visit + Appointment
class UnifiedPatientInputSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False, allow_null=True)
    full_name = serializers.CharField(max_length=255, required=False)
    age = serializers.IntegerField(required=False)
    gender = serializers.CharField(max_length=5, required=False)
    mobile_number = serializers.CharField(max_length=20, required=False)
    address = serializers.CharField(required=False, allow_blank=True, default='')
    consulting_doctor_name = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    chief_complaint = serializers.CharField(required=False, allow_blank=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        # If ID is not provided, other fields must be present to create a new patient
        if not attrs.get('id'):
            required_fields = ['full_name', 'age', 'gender', 'mobile_number']
            missing = [f for f in required_fields if not attrs.get(f)]
            if missing:
                raise serializers.ValidationError(
                    f"Creating a new patient requires missing fields: {', '.join(missing)}"
                )
        return attrs


class UnifiedVisitInputSerializer(serializers.Serializer):
    visit_date = serializers.DateTimeField(required=False)
    consulting_doctor = serializers.CharField(max_length=255)
    diagnosis = serializers.CharField()
    treatment_given = serializers.CharField()
    prescription_notes = serializers.CharField(required=False, allow_blank=True, default='')
    general_notes = serializers.CharField(required=False, allow_blank=True, default='')


class UnifiedAppointmentInputSerializer(serializers.Serializer):
    appointment_date = serializers.DateField()
    appointment_time = serializers.TimeField()
    consulting_doctor = serializers.CharField(max_length=255)
    appointment_type = serializers.ChoiceField(choices=AppointmentType.choices, default=AppointmentType.CONSULTATION)
    appointment_reason = serializers.CharField(required=False, allow_blank=True, default='')


from .models import Bill, BillTreatment, BillPayment

class BillTreatmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillTreatment
        fields = ['id', 'treatment_name', 'treatment_date', 'quantity', 'cost']
        read_only_fields = ['id']

class BillPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillPayment
        fields = ['id', 'payment_date', 'amount_paid', 'payment_mode']
        read_only_fields = ['id']

class BillSerializer(serializers.ModelSerializer):
    from patients.models import Patient
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), required=False, allow_null=True)
    treatments = BillTreatmentSerializer(many=True, required=False)
    payments = BillPaymentSerializer(many=True, required=False)
    patient_name = serializers.CharField(max_length=255)
    patient_mobile = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    patient_age = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    patient_gender = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')

    class Meta:
        model = Bill
        fields = [
            'id', 'patient', 'patient_name', 'patient_mobile', 'patient_age', 'patient_gender',
            'bill_number', 'bill_date', 'doctor_name',
            'total_cost', 'grand_total', 'amount_paid', 'outstanding_balance',
            'status', 'clinic_address', 'clinic_contact',
            'treatments', 'payments', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'bill_number', 'outstanding_balance',
            'created_at', 'updated_at'
        ]

    def create(self, validated_data):
        from patients.models import Patient
        treatments_data = validated_data.pop('treatments', [])
        payments_data = validated_data.pop('payments', [])
        
        patient_name = validated_data.get('patient_name', '')
        patient_mobile = validated_data.get('patient_mobile', '')
        patient_age_str = validated_data.get('patient_age', '')
        patient_gender = validated_data.get('patient_gender', '')
        clinic = validated_data.get('clinic')

        patient = validated_data.get('patient')
        if not patient and patient_name and clinic:
            if patient_mobile:
                patient = Patient.objects.filter(clinic=clinic, mobile_number=patient_mobile).first()
            if not patient:
                patient = Patient.objects.filter(clinic=clinic, full_name__iexact=patient_name).first()
            if not patient:
                try:
                    patient_age = int(patient_age_str)
                except ValueError:
                    patient_age = 0
                patient = Patient.objects.create(
                    clinic=clinic,
                    full_name=patient_name,
                    age=patient_age,
                    gender=patient_gender if patient_gender in ['M', 'F', 'O'] else 'M',
                    mobile_number=patient_mobile
                )
            validated_data['patient'] = patient

        bill = Bill.objects.create(**validated_data)
        
        for t_data in treatments_data:
            BillTreatment.objects.create(bill=bill, **t_data)
            
        for p_data in payments_data:
            BillPayment.objects.create(bill=bill, **p_data)
            
        bill.save()
        return bill

    def update(self, instance, validated_data):
        treatments_data = validated_data.pop('treatments', None)
        payments_data = validated_data.pop('payments', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if treatments_data is not None:
            instance.treatments.all().delete()
            for t_data in treatments_data:
                BillTreatment.objects.create(bill=instance, **t_data)
                
        if payments_data is not None:
            instance.payments.all().delete()
            for p_data in payments_data:
                BillPayment.objects.create(bill=instance, **p_data)
                
        instance.save()
        return instance
