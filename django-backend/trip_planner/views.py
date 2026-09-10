from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import traceback

from .services.geocoding import geocode_location
from .services.routing import get_route, generate_route_instructions
from .services.hos_simulator import simulate_hos_trip
from .services.log_generator import generate_daily_logs


class HealthCheckView(APIView):
    def get(self, request):
        return Response(
            {
                "status": "healthy",
                "service": "Truck Driver Guide & ELD Service",
                "version": "1.0.0",
            }
        )


class SampleTripsView(APIView):
    def get(self, request):
        samples = [
            {
                "id": "fmcsa-richmond-newark",
                "title": "Richmond, VA to Newark, NJ (FMCSA Guide Sample)",
                "current_location": "Richmond, VA",
                "pickup_location": "Richmond, VA",
                "dropoff_location": "Newark, NJ",
                "current_cycle_used": 15.0,
                "driver_name": "John E. Doe",
                "carrier_name": "John Doe's Transportation",
                "carrier_address": "Washington, D.C.",
                "truck_number": "123",
                "trailer_number": "20544",
                "shipping_doc": "101601",
                "description": "The exact official example from Page 18-19 of the FMCSA HOS Guide. Demonstrates pre-trip, fueling, lunch break, shipper delivery, sleeper berth, and final post-trip.",
            },
            {
                "id": "cross-country-la-dallas",
                "title": "Los Angeles, CA to Dallas, TX (Multi-Day Long-Haul)",
                "current_location": "Ontario, CA",
                "pickup_location": "Los Angeles, CA",
                "dropoff_location": "Dallas, TX",
                "current_cycle_used": 28.5,
                "driver_name": "Marcus Vance",
                "carrier_name": "Pacific Southwest Freight",
                "carrier_address": "Long Beach, CA",
                "truck_number": "Unit 504",
                "trailer_number": "Van 53018",
                "shipping_doc": "BOL-892100",
                "description": "1,400+ miles requiring mandatory fueling at mile 900, 30-min rest breaks, multiple 10-hour sleeper berth resets, and multi-day ELD log sheets.",
            },
            {
                "id": "midwest-chicago-miami",
                "title": "Chicago, IL to Miami, FL (Southeast Corridor)",
                "current_location": "Gary, IN",
                "pickup_location": "Chicago, IL",
                "dropoff_location": "Miami, FL",
                "current_cycle_used": 42.0,
                "driver_name": "Sarah Jenkins",
                "carrier_name": "Great Lakes Logistics",
                "carrier_address": "Chicago, IL",
                "truck_number": "Rig 882",
                "trailer_number": "Reefer 9912",
                "shipping_doc": "BOL-449102",
                "description": "1,380+ miles testing 70-hour cycle depletion, 10-hour rest breaks, and fueling stops.",
            },
            {
                "id": "regional-seattle-slc",
                "title": "Seattle, WA to Salt Lake City, UT (Mountain West)",
                "current_location": "Tacoma, WA",
                "pickup_location": "Seattle, WA",
                "dropoff_location": "Salt Lake City, UT",
                "current_cycle_used": 10.0,
                "driver_name": "David Miller",
                "carrier_name": "Cascade Intermodal",
                "carrier_address": "Seattle, WA",
                "truck_number": "Unit 310",
                "trailer_number": "DryVan 7041",
                "shipping_doc": "BOL-661298",
                "description": "840 miles spanning 2 calendar days with 10h rest in Boise, ID.",
            },
        ]
        return Response({"sample_trips": samples})


class PlanTripView(APIView):
    def post(self, request):
        try:
            data = request.data
            current_query = data.get("current_location", "").strip()
            pickup_query = data.get("pickup_location", "").strip()
            dropoff_query = data.get("dropoff_location", "").strip()

            if not current_query or not pickup_query or not dropoff_query:
                return Response(
                    {
                        "error": "current_location, pickup_location, and dropoff_location are required."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                current_cycle_used = float(data.get("current_cycle_used", 0.0))
            except (ValueError, TypeError):
                current_cycle_used = 0.0

            start_time_iso = data.get("start_time")
            driver_name = data.get("driver_name", "John E. Doe")
            carrier_name = data.get("carrier_name", "Interstate Freight Express")
            carrier_address = data.get("carrier_address", "Dallas, TX")
            truck_number = data.get("truck_number", "Unit 1084")
            trailer_number = data.get("trailer_number", "Van 53210")
            shipping_doc = data.get("shipping_doc", "BOL-774920")

            # 1. Geocode locations
            current_loc = geocode_location(current_query)
            pickup_loc = geocode_location(pickup_query)
            dropoff_loc = geocode_location(dropoff_query)

            waypoints = [
                {
                    **current_loc,
                    "role": "current",
                    "label": f"Current: {current_query}",
                },
                {**pickup_loc, "role": "pickup", "label": f"Pickup: {pickup_query}"},
                {
                    **dropoff_loc,
                    "role": "dropoff",
                    "label": f"Dropoff: {dropoff_query}",
                },
            ]

            # 2. Compute route & geometry
            route_data = get_route([current_loc, pickup_loc, dropoff_loc])

            # 3. Simulate FMCSA Part 395 HOS schedule
            hos_result = simulate_hos_trip(
                current_loc=current_loc,
                pickup_loc=pickup_loc,
                dropoff_loc=dropoff_loc,
                route_data=route_data,
                current_cycle_used=current_cycle_used,
                start_time_iso=start_time_iso,
            )

            # 4. Generate DOT ELD 24-hour daily log sheets
            daily_logs = generate_daily_logs(
                timeline_events=hos_result["timeline_events"],
                carrier_name=carrier_name,
                carrier_address=carrier_address,
                driver_name=driver_name,
                truck_number=truck_number,
                trailer_number=trailer_number,
                shipping_doc=shipping_doc,
            )

            # 5. Generate structured Route Instructions & Turn Guide
            route_instructions = generate_route_instructions(
                waypoints=waypoints,
                route_data=route_data,
                stops=hos_result["stops"],
            )

            # 6. Format serializable response
            # Format datetime objects in timeline events for JSON serialization
            serialized_timeline = []
            for ev in hos_result["timeline_events"]:
                serialized_timeline.append(
                    {
                        "status": ev["status"],
                        "start": ev["start"].isoformat(),
                        "end": ev["end"].isoformat(),
                        "duration": ev["duration"],
                        "location": ev["location"],
                        "lat": ev["lat"],
                        "lng": ev["lng"],
                        "description": ev["description"],
                        "cumulative_miles": ev["cumulative_miles"],
                    }
                )

            response_payload = {
                "inputs": {
                    "current_location": current_query,
                    "pickup_location": pickup_query,
                    "dropoff_location": dropoff_query,
                    "current_cycle_used": current_cycle_used,
                    "driver_name": driver_name,
                    "carrier_name": carrier_name,
                    "truck_number": truck_number,
                    "trailer_number": trailer_number,
                },
                "waypoints": waypoints,
                "route": {
                    "distance_miles": route_data["distance_miles"],
                    "driving_hours": route_data["driving_hours"],
                    "coordinates": route_data["coordinates"],
                    "legs": route_data["legs"],
                },
                "stops": hos_result["stops"],
                "stats": hos_result["stats"],
                "route_instructions": route_instructions,
                "timeline": serialized_timeline,
                "daily_logs": daily_logs,
            }

            return Response(response_payload)

        except Exception as e:
            traceback.print_exc()
            return Response(
                {"error": f"Trip planning failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
