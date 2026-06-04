from rest_framework import serializers
from accounts.models import User
from clinics.models import Clinic

class ClinicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clinic
        fields = ['id', 'name', 'slug', 'is_active', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    clinic = ClinicSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'clinic', 'created_at']
        read_only_fields = ['id', 'role', 'clinic', 'created_at']
