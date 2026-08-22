from rest_framework import serializers

class VisitSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    patient = serializers.CharField(required=False)
    visit_date = serializers.CharField()
    consulting_doctor = serializers.CharField(max_length=255)
    diagnosis = serializers.CharField()
    treatment_given = serializers.CharField()
    prescription_notes = serializers.CharField(required=False, allow_blank=True, default='')
    general_notes = serializers.CharField(required=False, allow_blank=True, default='')
    status = serializers.CharField(required=False, default='COMPLETED')
    created_at = serializers.CharField(read_only=True)
    updated_at = serializers.CharField(read_only=True)


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
    appointment_type = serializers.CharField(default='CONSULTATION')
    appointment_reason = serializers.CharField(required=False, allow_blank=True, default='')


class BillTreatmentSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True, required=False)
    treatment_name = serializers.CharField(max_length=255)
    treatment_date = serializers.CharField(required=False)
    quantity = serializers.IntegerField(default=1)
    cost = serializers.FloatField()


class BillPaymentSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True, required=False)
    payment_date = serializers.CharField(required=False)
    amount_paid = serializers.FloatField()
    payment_mode = serializers.CharField(max_length=50, default='UPI')


class BillSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True, required=False)
    patient = serializers.CharField(required=False, allow_null=True)
    patient_id = serializers.CharField(read_only=True, required=False, allow_null=True)
    patient_name = serializers.CharField(max_length=255)
    patient_mobile = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    patient_age = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    patient_gender = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    
    bill_number = serializers.CharField(read_only=True, required=False)
    bill_date = serializers.CharField(required=False)
    doctor_name = serializers.CharField(max_length=255)
    total_cost = serializers.FloatField(required=False)
    grand_total = serializers.FloatField()
    amount_paid = serializers.FloatField(required=False, default=0.0)
    outstanding_balance = serializers.FloatField(read_only=True, required=False)
    status = serializers.CharField(required=False, default='UNPAID')
    clinic_address = serializers.CharField(required=False, allow_blank=True, default='')
    clinic_contact = serializers.CharField(required=False, allow_blank=True, default='')
    
    treatments = BillTreatmentSerializer(many=True, required=False)
    payments = BillPaymentSerializer(many=True, required=False)
    created_at = serializers.CharField(read_only=True, required=False)
    updated_at = serializers.CharField(read_only=True, required=False)
