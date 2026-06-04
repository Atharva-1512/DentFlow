import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils.dateparse import parse_date

from core.permissions import TenantIsolationPermission, SubscriptionAccessPermission
from appointments.models import Appointment

class CalendarEventsView(APIView):
    """
    GET /api/calendar/events/
    Fetches scheduled appointments within a target date range ('start' and 'end' query parameters),
    returning a payload schema configured for FullCalendar component integration.
    """
    permission_classes = [TenantIsolationPermission, SubscriptionAccessPermission]

    def get(self, request):
        start_param = request.query_params.get('start', None)
        end_param = request.query_params.get('end', None)

        if not start_param or not end_param:
            return Response(
                {"detail": "Both 'start' and 'end' parameters are required (YYYY-MM-DD format)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        start_date = parse_date(start_param)
        end_date = parse_date(end_param)

        if not start_date or not end_date:
            return Response(
                {"detail": "Invalid date formats. Must match YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST
            )

        clinic = request.clinic
        if not clinic:
            return Response([])

        # Query appointments scoped to request.clinic
        appointments = Appointment.objects.filter(
            clinic=clinic,
            appointment_date__range=[start_date, end_date]
        ).select_related('patient')

        events = []

        # Color mapping based on status / type
        class_map = {
            'SCHEDULED': 'appt-scheduled',
            'COMPLETED': 'appt-completed',
            'CANCELLED': 'appt-cancelled',
        }

        for appt in appointments:
            start_dt = datetime.datetime.combine(appt.appointment_date, appt.appointment_time)
            # Default duration of 30 minutes per appointment
            end_dt = start_dt + datetime.timedelta(minutes=30)
            
            title = f"{appt.patient.full_name} - {appt.get_appointment_type_display()}"

            events.append({
                "id": str(appt.id),
                "title": title,
                "start": start_dt.isoformat(),
                "end": end_dt.isoformat(),
                "className": class_map.get(appt.status, 'appt-scheduled'),
                "extendedProps": {
                    "patient_name": appt.patient.full_name,
                    "mobile_number": appt.patient.mobile_number,
                    "consulting_doctor": appt.consulting_doctor,
                    "appointment_reason": appt.appointment_reason,
                    "appointment_type": appt.appointment_type,
                    "status": appt.status
                }
            })

        return Response(events)
