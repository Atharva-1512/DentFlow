from rest_framework import serializers
from accounts.models import User
from clinics.models import Clinic

class ClinicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clinic
        fields = ['id', 'name', 'slug', 'is_active', 'notification_whatsapp_number', 'address', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    clinic = ClinicSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'clinic', 'created_at']
        read_only_fields = ['id', 'role', 'clinic', 'created_at']


class ClinicRegistrationSerializer(serializers.Serializer):
    clinic_name = serializers.CharField(max_length=255)
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    mobile_number = serializers.CharField(max_length=20, help_text="Clinic's WhatsApp number for receiving appointment summaries.")
    clinic_address = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value


class ClinicUpdateSerializer(serializers.ModelSerializer):
    """Allows clinic owners to update their clinic profile including WhatsApp number."""
    class Meta:
        model = Clinic
        fields = ['name', 'notification_whatsapp_number', 'address']
        extra_kwargs = {
            'name': {'required': False},
            'notification_whatsapp_number': {'required': False},
            'address': {'required': False},
        }

