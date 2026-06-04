from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from django.db import transaction
from django.utils import timezone
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
                
                # 3. Seed starter plan if it doesn't exist, and assign trial subscription
                plan, _ = SubscriptionPlan.objects.get_or_create(
                    code='starter',
                    defaults={
                        'name': 'Starter Plan',
                        'price': 49.99,
                        'billing_cycle': 'monthly',
                        'is_active': True
                    }
                )
                
                # Create trial subscription
                ClinicSubscription.objects.create(
                    clinic=clinic,
                    plan=plan,
                    status=SubscriptionStatus.TRIAL,
                    trial_start_date=timezone.now().date(),
                    trial_end_date=timezone.now() + timezone.timedelta(days=30)
                )
                
                user_serializer = UserSerializer(user)
                return Response({
                    "user": user_serializer.data,
                    "detail": "Clinic and Owner registered successfully with a 30-day trial plan."
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response(
                {"detail": f"Registration failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

