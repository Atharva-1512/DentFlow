from django.urls import path
from .views import (
    WhatsAppConnectView,
    WhatsAppStatusView,
    WhatsAppDisconnectView,
    WhatsAppStatsView,
    CampaignPresetsView,
    CampaignBroadcastView,
    CampaignHistoryView,
    trigger_reminders,
)

app_name = 'notifications'

urlpatterns = [
    # WhatsApp session management & stats
    path('whatsapp/connect/', WhatsAppConnectView.as_view(), name='whatsapp-connect'),
    path('whatsapp/status/', WhatsAppStatusView.as_view(), name='whatsapp-status'),
    path('whatsapp/disconnect/', WhatsAppDisconnectView.as_view(), name='whatsapp-disconnect'),
    path('whatsapp/stats/', WhatsAppStatsView.as_view(), name='whatsapp-stats'),

    # Marketing, Greetings & Festival Campaigns (Diwali, New Year, Checkups)
    path('campaigns/presets/', CampaignPresetsView.as_view(), name='campaign-presets'),
    path('campaigns/broadcast/', CampaignBroadcastView.as_view(), name='campaign-broadcast'),
    path('campaigns/history/', CampaignHistoryView.as_view(), name='campaign-history'),

    # Automated Cron trigger (called by cron / scheduler, secured by secret)
    path('trigger/<str:slot>/', trigger_reminders, name='trigger-reminders'),
]

