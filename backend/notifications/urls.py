from django.urls import path
from .views import trigger_reminders

app_name = 'notifications'

urlpatterns = [
    path('trigger/<str:slot>/', trigger_reminders, name='trigger-reminders'),
]
