from rest_framework import serializers

class AppointmentSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    patient = serializers.CharField(required=False, allow_null=True)
    patient_id = serializers.CharField(required=False, allow_null=True)
    patient_name = serializers.CharField(read_only=True, required=False)
    patient_mobile = serializers.CharField(read_only=True, required=False)
    appointment_date = serializers.CharField()
    appointment_time = serializers.CharField()
    consulting_doctor = serializers.CharField(max_length=255)
    appointment_type = serializers.CharField(required=False, default='CONSULTATION')
    appointment_type_display = serializers.CharField(read_only=True, required=False)
    appointment_reason = serializers.CharField(required=False, allow_blank=True, default='')
    status = serializers.CharField(required=False, default='SCHEDULED')
    created_at = serializers.CharField(read_only=True, required=False)
    updated_at = serializers.CharField(read_only=True, required=False)
