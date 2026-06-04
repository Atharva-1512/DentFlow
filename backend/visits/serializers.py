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
