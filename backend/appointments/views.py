from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import TenantIsolationPermission, SubscriptionAccessPermission
from .serializers import AppointmentSerializer

class AppointmentViewSet(viewsets.ViewSet):
    """
    Appointment ViewSet managing CRUD, list scoping, and status updates via MongoDB.
    """
    permission_classes = [TenantIsolationPermission, SubscriptionAccessPermission]

    def list(self, request):
        status_filter = request.query_params.get('status', None)
        today_only = request.query_params.get('today', 'false').lower() == 'true'
        upcoming_only = request.query_params.get('upcoming', 'false').lower() == 'true'
        page = int(request.query_params.get('page', 1))

        from core.mongodb import get_appointments
        data = get_appointments(
            request.user.id,
            today_only=today_only,
            upcoming_only=upcoming_only,
            status_filter=status_filter,
            page=page
        )
        return Response(data)

    def create(self, request):
        serializer = AppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        from core.mongodb import create_appointment
        appt = create_appointment(request.user.id, serializer.validated_data)
        if not appt:
            return Response({"detail": "Failed to create appointment: patient not found."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(AppointmentSerializer(appt).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        serializer = AppointmentSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        from core.mongodb import update_appointment
        appt = update_appointment(request.user.id, str(pk), serializer.validated_data)
        if not appt:
            return Response({"detail": "Appointment not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(AppointmentSerializer(appt).data)

    @action(detail=True, methods=['patch'])
    def change_status(self, request, pk=None):
        """
        PATCH /api/appointments/<id>/change_status/
        Updates appointment status values in MongoDB.
        """
        new_status = request.data.get('status')
        if not new_status:
            return Response({"detail": "Status field is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        from core.mongodb import change_appointment_status
        appt = change_appointment_status(request.user.id, str(pk), new_status)
        if not appt:
            return Response({"detail": "Appointment not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(AppointmentSerializer(appt).data)
