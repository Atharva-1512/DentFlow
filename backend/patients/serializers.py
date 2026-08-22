from rest_framework import serializers

class PatientSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    patient_id = serializers.CharField(read_only=True)
    full_name = serializers.CharField(max_length=255)
    age = serializers.IntegerField()
    gender = serializers.CharField(max_length=5)
    mobile_number = serializers.CharField(max_length=20)
    address = serializers.CharField(required=False, allow_blank=True, default='')
    consulting_doctor_name = serializers.CharField(required=False, allow_blank=True, default='')
    chief_complaint = serializers.CharField(required=False, allow_blank=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    created_date = serializers.CharField(read_only=True)
    created_at = serializers.CharField(read_only=True)
    updated_at = serializers.CharField(read_only=True)
