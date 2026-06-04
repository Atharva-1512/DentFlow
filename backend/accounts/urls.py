from django.urls import path
from .views import MeView, RegisterView, ClinicProfileView

app_name = 'accounts'

urlpatterns = [
    path('me/', MeView.as_view(), name='me'),
    path('register/', RegisterView.as_view(), name='register'),
    path('clinic/', ClinicProfileView.as_view(), name='clinic-profile'),
]

