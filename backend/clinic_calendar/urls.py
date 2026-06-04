from django.urls import path
from .views import CalendarEventsView

app_name = 'clinic_calendar'

urlpatterns = [
    path('events/', CalendarEventsView.as_view(), name='events'),
]
