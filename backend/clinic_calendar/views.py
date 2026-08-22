from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from core.permissions import TenantIsolationPermission, SubscriptionAccessPermission

class CalendarEventsView(APIView):
    """
    GET /api/calendar/events/
    Fetches scheduled appointments and visits within a target date range ('start' and 'end' query parameters),
    returning a payload schema configured for FullCalendar component integration from MongoDB.
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

        from core.mongodb import get_calendar_events
        events = get_calendar_events(request.user.id, start_param, end_param)
        return Response(events)
