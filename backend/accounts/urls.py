from django.urls import path
from .views import (
    MeView, RegisterView, ClinicProfileView,
    AdminClinicListView, AdminClinicDetailView
)

app_name = 'accounts'

urlpatterns = [
    path('me/', MeView.as_view(), name='me'),
    path('register/', RegisterView.as_view(), name='register'),
    path('clinic/', ClinicProfileView.as_view(), name='clinic-profile'),
    path('admin/clinics/', AdminClinicListView.as_view(), name='admin-clinic-list'),
    path('admin/clinics/<uuid:pk>/', AdminClinicDetailView.as_view(), name='admin-clinic-detail'),
]

