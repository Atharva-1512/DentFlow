from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from rest_framework import status
from django.utils import timezone
from django.conf import settings
from .serializers import UserSerializer, ClinicSerializer, ClinicRegistrationSerializer, ClinicUpdateSerializer

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
        if request.user.role == 'SUPER_ADMIN':
            from core.mongodb import get_all_clinics
            clinics = get_all_clinics()
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
        if request.user.role != 'CLINIC_OWNER':
            return Response({"detail": "Only clinic owners can update clinic settings."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ClinicUpdateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        from core.mongodb import update_clinic
        updated_clinic = update_clinic(request.user.id, serializer.validated_data)
        if not updated_clinic:
            return Response({"detail": "Failed to update clinic."}, status=status.HTTP_400_BAD_REQUEST)
            
        return Response(ClinicSerializer(updated_clinic).data)


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
            from core.mongodb import create_user
            user = create_user(
                email=validated_data['email'],
                username=validated_data['username'],
                password=validated_data['password'],
                role='CLINIC_OWNER',
                clinic_name=validated_data['clinic_name'],
                mobile_number=validated_data['mobile_number'],
                address=validated_data.get('clinic_address', ''),
                dci_number=validated_data.get('dci_number', ''),
                gst_number=validated_data.get('gst_number', ''),
                invoice_prefix=validated_data.get('invoice_prefix', 'DF-2026/'),
                tax_rate=validated_data.get('tax_rate', 0),
                slot_duration=validated_data.get('slot_duration', 30),
                opening_time=validated_data.get('opening_time', '09:00'),
                closing_time=validated_data.get('closing_time', '20:00')
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
        return request.user and request.user.is_authenticated and request.user.role == 'SUPER_ADMIN'


class AdminClinicListView(APIView):
    """
    GET, POST /api/accounts/admin/clinics/
    restricted to SUPER_ADMIN.
    - GET: lists all clinics.
    - POST: creates a new clinic + clinic owner.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        from core.mongodb import get_all_clinics
        clinics = get_all_clinics()
        serializer = ClinicSerializer(clinics, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ClinicRegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = serializer.validated_data
        
        try:
            from core.mongodb import create_user
            user = create_user(
                email=validated_data['email'],
                username=validated_data['username'],
                password=validated_data['password'],
                role='CLINIC_OWNER',
                clinic_name=validated_data['clinic_name'],
                mobile_number=validated_data['mobile_number'],
                address=validated_data.get('clinic_address', '')
            )
            return Response(ClinicSerializer(user.clinic).data, status=status.HTTP_201_CREATED)
                
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
        is_active = request.data.get('is_active', None)
        if is_active is not None:
            from core.mongodb import update_clinic_status
            clinic = update_clinic_status(str(pk), bool(is_active))
            if not clinic:
                return Response({"detail": "Clinic not found."}, status=status.HTTP_404_NOT_FOUND)
            return Response(ClinicSerializer(clinic).data)
            
        from core.mongodb import get_user_by_clinic_id
        user = get_user_by_clinic_id(str(pk))
        if not user or not user.clinic:
            return Response({"detail": "Clinic not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ClinicSerializer(user.clinic).data)

    def delete(self, request, pk):
        from core.mongodb import delete_clinic_user
        success = delete_clinic_user(str(pk))
        if not success:
            return Response({"detail": "Clinic not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"detail": "Clinic deleted successfully."}, status=status.HTTP_204_NO_CONTENT)
