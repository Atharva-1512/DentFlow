from rest_framework import serializers
from .models import Patient

class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = [
            'id', 'full_name', 'age', 'gender', 
            'mobile_number', 'address', 'consulting_doctor_name', 
            'chief_complaint', 'notes', 'created_date', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
