from django.db import models


class SavedTrip(models.Model):
    current_location = models.CharField(max_length=255)
    pickup_location = models.CharField(max_length=255)
    dropoff_location = models.CharField(max_length=255)
    current_cycle_used = models.FloatField(default=0.0)
    total_distance_miles = models.FloatField(null=True, blank=True)
    total_duration_hours = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    trip_data = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"{self.pickup_location} to {self.dropoff_location} ({self.created_at.strftime('%Y-%m-%d')})"
