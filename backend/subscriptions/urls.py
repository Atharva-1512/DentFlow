from django.urls import path
from .views import CurrentSubscriptionView, CreateSubscriptionView, CancelSubscriptionView

app_name = 'subscriptions'

urlpatterns = [
    path('current/', CurrentSubscriptionView.as_view(), name='current'),
    path('create/', CreateSubscriptionView.as_view(), name='create'),
    path('cancel/', CancelSubscriptionView.as_view(), name='cancel'),
]
