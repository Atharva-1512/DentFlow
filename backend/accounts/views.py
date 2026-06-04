from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import UserSerializer, ClinicSerializer
from clinics.models import Clinic
from accounts.models import UserRole

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
