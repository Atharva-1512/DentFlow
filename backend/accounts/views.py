from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from rest_framework import status
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from .serializers import UserSerializer, ClinicSerializer, ClinicRegistrationSerializer, ClinicUpdateSerializer
from clinics.models import Clinic
from accounts.models import UserRole
from subscriptions.models import SubscriptionPlan, ClinicSubscription, SubscriptionStatus

class MeView(APIView):
    """
    API endpoint returning authenticated user metadata and profile context.
    For Super Admins, lists all available clinics in the SaaS platform.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        data = serializer.data
        
        # If user is Super Admin, supply listings of all clinics
        if request.user.role == UserRole.SUPER_ADMIN:
            clinics = Clinic.objects.all()
            data['all_clinics'] = ClinicSerializer(clinics, many=True).data
            
        return Response(data)


class ClinicProfileView(APIView):
    """
    GET /api/accounts/clinic/  — retrieve current clinic profile
    PUT /api/accounts/clinic/  — update clinic (name, WhatsApp number)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        clinic = getattr(request, 'clinic', None)
        if not clinic:
            return Response({"detail": "No clinic associated with your account."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = ClinicSerializer(clinic)
        return Response(serializer.data)

    def put(self, request):
        clinic = getattr(request, 'clinic', None)
        if not clinic:
            return Response({"detail": "No clinic associated with your account."}, status=status.HTTP_400_BAD_REQUEST)

        # Only CLINIC_OWNER can update their clinic
        if request.user.role != UserRole.CLINIC_OWNER:
            return Response({"detail": "Only clinic owners can update clinic settings."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ClinicUpdateSerializer(clinic, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(ClinicSerializer(clinic).data)


class RegisterView(APIView):
    """
    POST /api/accounts/register/
    Registers a new Clinic, Clinic Owner user, and provisions a default 30-day Trial subscription.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ClinicRegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = serializer.validated_data
        
        try:
            with transaction.atomic():
                # 1. Create the Clinic
                clinic = Clinic.objects.create(
                    name=validated_data['clinic_name'],
                    notification_whatsapp_number=validated_data['mobile_number'],
                    address=validated_data.get('clinic_address', ''),
                    is_active=True
                )
                
                # 2. Create the Clinic Owner user
                from accounts.models import User
                user = User.objects.create_user(
                    username=validated_data['username'],
                    email=validated_data['email'],
                    password=validated_data['password'],
                    role=UserRole.CLINIC_OWNER,
                    clinic=clinic
                )
                
                # 3. Seed starter plan if it doesn't exist, and assign subscription
                plan, _ = SubscriptionPlan.objects.get_or_create(
                    code='starter',
                    defaults={
                        'name': 'Starter Plan (Monthly)',
                        'price': 199.00,
                        'billing_cycle': 'monthly',
                        'is_active': True
                    }
                )
                
                # Create subscription with status according to settings.TRIAL_ENABLED
                if getattr(settings, 'TRIAL_ENABLED', True):
                    status_val = SubscriptionStatus.TRIAL
                    trial_start = timezone.now().date()
                    trial_end = timezone.now() + timezone.timedelta(days=getattr(settings, 'TRIAL_DAYS', 30))
                else:
                    status_val = SubscriptionStatus.PAYMENT_DUE
                    trial_start = None
                    trial_end = None

                ClinicSubscription.objects.create(
                    clinic=clinic,
                    plan=plan,
                    status=status_val,
                    trial_start_date=trial_start,
                    trial_end_date=trial_end
                )
                
                user_serializer = UserSerializer(user)
                return Response({
                    "user": user_serializer.data,
                    "detail": "Clinic and Owner registered successfully."
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response(
                {"detail": f"Registration failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class IsSuperAdmin(BasePermission):
    """
    Permission class that only allows SUPER_ADMIN users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == UserRole.SUPER_ADMIN


class AdminClinicListView(APIView):
    """
    GET, POST /api/accounts/admin/clinics/
    restricted to SUPER_ADMIN.
    - GET: lists all clinics.
    - POST: creates a new clinic + clinic owner.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        clinics = Clinic.objects.all()
        serializer = ClinicSerializer(clinics, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ClinicRegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = serializer.validated_data
        
        try:
            with transaction.atomic():
                # 1. Create the Clinic
                clinic = Clinic.objects.create(
                    name=validated_data['clinic_name'],
                    notification_whatsapp_number=validated_data['mobile_number'],
                    address=validated_data.get('clinic_address', ''),
                    is_active=True
                )
                
                # 2. Create the Clinic Owner user
                from accounts.models import User
                user = User.objects.create_user(
                    username=validated_data['username'],
                    email=validated_data['email'],
                    password=validated_data['password'],
                    role=UserRole.CLINIC_OWNER,
                    clinic=clinic
                )
                
                # 3. Seed starter plan if it doesn't exist, and assign subscription
                plan, _ = SubscriptionPlan.objects.get_or_create(
                    code='starter',
                    defaults={
                        'name': 'Starter Plan (Monthly)',
                        'price': 199.00,
                        'billing_cycle': 'monthly',
                        'is_active': True
                    }
                )
                
                # Create subscription with status according to settings.TRIAL_ENABLED
                if getattr(settings, 'TRIAL_ENABLED', True):
                    status_val = SubscriptionStatus.TRIAL
                    trial_start = timezone.now().date()
                    trial_end = timezone.now() + timezone.timedelta(days=getattr(settings, 'TRIAL_DAYS', 30))
                else:
                    status_val = SubscriptionStatus.PAYMENT_DUE
                    trial_start = None
                    trial_end = None

                ClinicSubscription.objects.create(
                    clinic=clinic,
                    plan=plan,
                    status=status_val,
                    trial_start_date=trial_start,
                    trial_end_date=trial_end
                )
                
                return Response(ClinicSerializer(clinic).data, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response(
                {"detail": f"Clinic creation failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AdminClinicDetailView(APIView):
    """
    PATCH, DELETE /api/accounts/admin/clinics/<pk>/
    restricted to SUPER_ADMIN.
    - PATCH: allows toggling active state or updating info.
    - DELETE: deletes clinic and all cascading data.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def patch(self, request, pk):
        try:
            clinic = Clinic.objects.get(pk=pk)
        except Clinic.DoesNotExist:
            return Response({"detail": "Clinic not found."}, status=status.HTTP_404_NOT_FOUND)
        
        is_active = request.data.get('is_active', None)
        if is_active is not None:
            clinic.is_active = bool(is_active)
            clinic.save(update_fields=['is_active'])
            
        serializer = ClinicSerializer(clinic)
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            clinic = Clinic.objects.get(pk=pk)
        except Clinic.DoesNotExist:
            return Response({"detail": "Clinic not found."}, status=status.HTTP_404_NOT_FOUND)
        
        clinic.delete()
        return Response({"detail": "Clinic deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

