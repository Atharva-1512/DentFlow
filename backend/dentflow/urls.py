"""
URL configuration for dentflow project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from subscriptions.views import RazorpayWebhookView

def health_check(request):
    return JsonResponse({
        "status": "healthy",
        "service": "DentFlow Multi-Tenant Backend",
        "version": "1.0.0"
    })

urlpatterns = [
    # Health checks for Render & uptime monitoring
    path('', health_check, name='root_health_check'),
    path('health/', health_check, name='health_check'),

    path('admin/', admin.site.urls),
    
    # JWT authentication paths
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Feature modular API routing
    path('api/accounts/', include('accounts.urls')),
    path('api/patients/', include('patients.urls')),
    path('api/visits/', include('visits.urls')),
    path('api/appointments/', include('appointments.urls')),
    path('api/calendar/', include('clinic_calendar.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/subscriptions/', include('subscriptions.urls')),
    path('api/webhooks/razorpay/', RazorpayWebhookView.as_view(), name='razorpay_webhook'),
]
