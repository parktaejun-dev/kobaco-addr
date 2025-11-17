from django.urls import path
from .views import RecommendSegmentsView, CalculateEstimateView

urlpatterns = [
    path('recommend/', RecommendSegmentsView.as_view(), name='recommend-segments'),
    path('estimate/', CalculateEstimateView.as_view(), name='calculate-estimate'),
]
