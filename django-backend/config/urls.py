"""
URL configuration for config project.
"""

# pyrefly: ignore [missing-import]
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include


def api_root(request):
    return JsonResponse(
        {
            "service": "Truck Driver Guide & ELD Service API",
            "status": "healthy",
            "available_endpoints": {
                "health": "/api/health/",
                "sample_trips": "/api/sample-trips/",
                "plan_trip": "/api/plan-trip/ (POST)",
                "admin": "/admin/",
            },
            "frontend_ui": "Run 'npm run dev' inside 'frontend-react' and visit http://localhost:5173",
        }
    )


urlpatterns = [
    path("", api_root, name="api-root"),
    path("admin/", admin.site.urls),
    path("api/", include("trip_planner.urls")),
]
