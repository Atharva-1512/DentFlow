from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VisitViewSet, UnifiedVisitAPIView

router = DefaultRouter()
router.register(r'', VisitViewSet, basename='visit')

app_name = 'visits'

urlpatterns = [
    path('unified/', UnifiedVisitAPIView.as_view(), name='unified'),
    path('', include(router.urls)),
]
