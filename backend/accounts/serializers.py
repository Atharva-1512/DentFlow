from rest_framework import serializers

class ClinicSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    slug = serializers.CharField()
    is_active = serializers.BooleanField()
    notification_whatsapp_number = serializers.CharField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, default='')
    dci_number = serializers.CharField(required=False, allow_blank=True, default='')
    gst_number = serializers.CharField(required=False, allow_blank=True, default='')
    invoice_prefix = serializers.CharField(required=False, allow_blank=True, default='DF-2026/')
    tax_rate = serializers.FloatField(required=False, default=0)
    terms_and_conditions = serializers.CharField(required=False, allow_blank=True, default='')
    slot_duration = serializers.IntegerField(required=False, default=30)
    opening_time = serializers.CharField(required=False, default='09:00')
    closing_time = serializers.CharField(required=False, default='20:00')
    break_start = serializers.CharField(required=False, default='13:00')
    break_end = serializers.CharField(required=False, default='14:00')
    working_days = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    doctors = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    treatments_catalog = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    holidays = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    created_at = serializers.CharField(required=False, allow_null=True)


class UserSerializer(serializers.Serializer):
    id = serializers.CharField()
    username = serializers.CharField()
    email = serializers.EmailField()
    role = serializers.CharField()
    clinic = ClinicSerializer(read_only=True)
    created_at = serializers.CharField(required=False, allow_null=True)


class ClinicRegistrationSerializer(serializers.Serializer):
    clinic_name = serializers.CharField(max_length=255)
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    mobile_number = serializers.CharField(max_length=20)
    clinic_address = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')
    dci_number = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    gst_number = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    invoice_prefix = serializers.CharField(max_length=50, required=False, allow_blank=True, default='DF-2026/')
    tax_rate = serializers.FloatField(required=False, default=0)
    slot_duration = serializers.IntegerField(required=False, default=30)
    opening_time = serializers.CharField(required=False, default='09:00')
    closing_time = serializers.CharField(required=False, default='20:00')

    def validate_username(self, value):
        from core.mongodb import db
        if db.users.find_one({"username": {"$regex": f"^{value}$", "$options": "i"}}):
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_email(self, value):
        from core.mongodb import db
        if db.users.find_one({"email": {"$regex": f"^{value}$", "$options": "i"}}):
            raise serializers.ValidationError("A user with this email already exists.")
        return value


class ClinicUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(required=False)
    notification_whatsapp_number = serializers.CharField(required=False)
    address = serializers.CharField(required=False, allow_blank=True)
    dci_number = serializers.CharField(required=False, allow_blank=True)
    gst_number = serializers.CharField(required=False, allow_blank=True)
    invoice_prefix = serializers.CharField(required=False, allow_blank=True)
    tax_rate = serializers.FloatField(required=False)
    terms_and_conditions = serializers.CharField(required=False, allow_blank=True)
    slot_duration = serializers.IntegerField(required=False)
    opening_time = serializers.CharField(required=False)
    closing_time = serializers.CharField(required=False)
    break_start = serializers.CharField(required=False)
    break_end = serializers.CharField(required=False)
    working_days = serializers.ListField(child=serializers.CharField(), required=False)
    doctors = serializers.ListField(child=serializers.DictField(), required=False)
    treatments_catalog = serializers.ListField(child=serializers.DictField(), required=False)
    holidays = serializers.ListField(child=serializers.DictField(), required=False)
