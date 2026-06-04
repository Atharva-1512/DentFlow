from rest_framework import serializers
from .models import Appointment

class AppointmentSerializer(serializers.ModelSerializer):
    appointment_type_display = serializers.CharField(source='get_appointment_type_display', read_only=True)
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    patient_mobile = serializers.CharField(source='patient.mobile_number', read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'patient_name', 'patient_mobile', 'appointment_date', 'appointment_time', 
            'consulting_doctor', 'appointment_type', 'appointment_type_display',
            'appointment_reason', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
