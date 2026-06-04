from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.views import TenantViewSetMixin
from .models import Appointment, AppointmentStatus
from .serializers import AppointmentSerializer

class AppointmentViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """
    Appointment ViewSet managing CRUD, list scoping, and status updates.
    Tenant isolation is automatically enforced by TenantViewSetMixin.
    """
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Support filtering by date range or status directly
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Support 'today' shortcut
        today_only = self.request.query_params.get('today', None)
        if today_only and today_only.lower() == 'true':
            queryset = queryset.filter(appointment_date=timezone.now().date())

        # Support 'upcoming' shortcut (future appointments)
        upcoming_only = self.request.query_params.get('upcoming', None)
        if upcoming_only and upcoming_only.lower() == 'true':
            queryset = queryset.filter(
                appointment_date__gt=timezone.now().date()
            ) | queryset.filter(
                appointment_date=timezone.now().date(),
                appointment_time__gte=timezone.now().time()
            )

        return queryset

    @action(detail=True, methods=['patch'])
    def change_status(self, request, pk=None):
        """
        PATCH /api/appointments/<id>/change_status/
        Updates appointment state values (SCHEDULED, COMPLETED, CANCELLED).
        """
        appointment = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in AppointmentStatus.values:
            return Response(
                {"detail": f"Invalid status. Must be one of: {', '.join(AppointmentStatus.values)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        appointment.status = new_status
        appointment.save(update_fields=['status'])
        
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)
