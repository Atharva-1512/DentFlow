"""
Notification Views — DentFlow (WhatsApp Setup Disabled)
"""

from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

class WhatsAppConnectView(APIView):
    """
    Disabled WhatsApp Session Connect
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({'detail': 'WhatsApp reminders system is disabled.'}, status=status.HTTP_400_BAD_REQUEST)


class WhatsAppStatusView(APIView):
    """
    Disabled WhatsApp Session Status
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'status': 'DISCONNECTED',
            'connected_number': None,
            'connected_name': None,
            'last_activity': None,
            'qr_data_url': None,
            'warning': 'WhatsApp reminders system is disabled.'
        })


class WhatsAppDisconnectView(APIView):
    """
    Disabled WhatsApp Session Disconnect
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({'detail': 'WhatsApp reminders system is disabled.'})


class WhatsAppStatsView(APIView):
    """
    Disabled WhatsApp Stats
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'session': {
                'status': 'DISCONNECTED',
                'connected_number': None,
                'connected_name': None,
                'last_activity': None,
            },
            'reminders': {
                'total': 0,
                'sent': 0,
                'skipped': 0,
                'failed': 0,
                'pending': 0,
                'last_sent_at': None,
            },
        })


@csrf_exempt
def trigger_reminders(request, slot):
    """
    Disabled reminders cron trigger.
    """
    return JsonResponse({'detail': 'WhatsApp reminders system is disabled.'})
