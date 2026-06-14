from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VisitViewSet, UnifiedVisitAPIView, BillViewSet

router = DefaultRouter()
router.register(r'bills', BillViewSet, basename='bill')
router.register(r'', VisitViewSet, basename='visit')

app_name = 'visits'

urlpatterns = [
    path('unified/', UnifiedVisitAPIView.as_view(), name='unified'),
    path('', include(router.urls)),
]
