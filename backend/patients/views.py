import datetime
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.views import TenantViewSetMixin
from visits.models import Visit
from appointments.models import Appointment
from .models import Patient
from .serializers import PatientSerializer

class PatientViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """
    Patient ViewSet supporting CRUD, global queries, and timeline actions.
    Is isolated at the database level by TenantViewSetMixin.
    """
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer

    def get_queryset(self):
        # Standard tenant scoping query
        queryset = super().get_queryset()
        
        # Add global lookup constraints if query parameters is active
        search_query = self.request.query_params.get('search', None)
        if search_query:
            queryset = queryset.filter(
                Q(full_name__icontains=search_query) |
                Q(mobile_number__icontains=search_query) |
                Q(consulting_doctor_name__icontains=search_query)
            )
        return queryset

    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        """
        GET /api/patients/<id>/timeline/
        Returns chronological listings of both completed visits and scheduled appointments.
        """
        patient = self.get_object()
        
        # Query historical collections
        # Tenant filters automatically checked since core models objects uses TenantManager
        visits = Visit.objects.filter(patient=patient)
        appointments = Appointment.objects.filter(patient=patient)

        timeline_data = []

        # Serialize visits
        for visit in visits:
            timeline_data.append({
                "id": str(visit.id),
                "type": "VISIT",
                "date": visit.visit_date.isoformat(),
                "doctor": visit.consulting_doctor,
                "title": f"Visit Consultation - {visit.consulting_doctor}",
                "description": f"Diagnosis: {visit.diagnosis}. Treatment: {visit.treatment_given}",
                "prescription": visit.prescription_notes,
                "notes": visit.general_notes,
                "status": "COMPLETED"
            })

        # Serialize appointments
        for appt in appointments:
            # Combine Date and Time
            appt_dt = datetime.datetime.combine(appt.appointment_date, appt.appointment_time)
            timeline_data.append({
                "id": str(appt.id),
                "type": "APPOINTMENT",
                "date": appt_dt.isoformat(),
                "doctor": appt.consulting_doctor,
                "title": f"Appointment ({appt.get_appointment_type_display()})",
                "description": f"Reason: {appt.appointment_reason}",
                "prescription": "",
                "notes": "",
                "status": appt.status
            })

        # Sort chronologically by date descending (latest first)
        timeline_data.sort(key=lambda x: x['date'], reverse=True)
        return Response(timeline_data)
