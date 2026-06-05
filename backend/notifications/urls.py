from django.urls import path
from .views import (
    WhatsAppConnectView,
    WhatsAppStatusView,
    WhatsAppDisconnectView,
    WhatsAppStatsView,
    trigger_reminders,
)

app_name = 'notifications'

urlpatterns = [
    # WhatsApp session management
    path('whatsapp/connect/', WhatsAppConnectView.as_view(), name='whatsapp-connect'),
    path('whatsapp/status/', WhatsAppStatusView.as_view(), name='whatsapp-status'),
    path('whatsapp/disconnect/', WhatsAppDisconnectView.as_view(), name='whatsapp-disconnect'),
    path('whatsapp/stats/', WhatsAppStatsView.as_view(), name='whatsapp-stats'),

    # Cron trigger (called by Cron-job.org, secured by X-Cron-Secret header)
    path('trigger/<str:slot>/', trigger_reminders, name='trigger-reminders'),
]
