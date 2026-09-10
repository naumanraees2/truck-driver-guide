from django.urls import path
from .views import PlanTripView, SampleTripsView, HealthCheckView

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("sample-trips/", SampleTripsView.as_view(), name="sample-trips"),
    path("plan-trip/", PlanTripView.as_view(), name="plan-trip"),
]
