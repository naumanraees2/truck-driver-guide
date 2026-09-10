from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from datetime import datetime

from .services.geocoding import geocode_location
from .services.routing import get_route, haversine_distance
from .services.hos_simulator import (
    simulate_hos_trip,
    STATUS_OFF,
    STATUS_SB,
    STATUS_D,
    STATUS_ON,
)
from .services.log_generator import generate_daily_logs


class TripPlannerTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_geocoding(self):
        # Known hub
        res = geocode_location("Los Angeles, CA")
        self.assertAlmostEqual(res["lat"], 34.0522, places=2)
        self.assertAlmostEqual(res["lng"], -118.2437, places=2)

        # Coordinate fallback or fuzzy match
        res2 = geocode_location("Dallas, TX")
        self.assertEqual(res2["state"], "TX")

    def test_routing_and_haversine(self):
        d = haversine_distance(34.0522, -118.2437, 40.7128, -74.0060)
        self.assertTrue(2400 < d < 2500)

        w1 = {"lat": 37.5407, "lng": -77.4360, "display_name": "Richmond, VA"}
        w2 = {"lat": 40.7357, "lng": -74.1724, "display_name": "Newark, NJ"}
        route = get_route([w1, w2])
        self.assertTrue(route["distance_miles"] > 250)
        self.assertTrue(len(route["coordinates"]) > 5)

    def test_hos_simulation_fmcsa_limits(self):
        current_loc = {
            "lat": 34.0522,
            "lng": -118.2437,
            "display_name": "Los Angeles, CA",
        }
        pickup_loc = {
            "lat": 34.0522,
            "lng": -118.2437,
            "display_name": "Los Angeles, CA",
        }
        dropoff_loc = {"lat": 32.7767, "lng": -96.7970, "display_name": "Dallas, TX"}

        # Simulated ~1,430 mile route
        route_data = {
            "distance_miles": 1430.0,
            "driving_hours": 24.5,
            "coordinates": [[34.05, -118.24], [35.0, -110.0], [32.77, -96.79]],
            "legs": [{"distance_miles": 1430.0, "duration_hours": 24.5}],
        }

        hos = simulate_hos_trip(
            current_loc=current_loc,
            pickup_loc=pickup_loc,
            dropoff_loc=dropoff_loc,
            route_data=route_data,
            current_cycle_used=10.0,
        )

        stats = hos["stats"]
        stops = hos["stops"]
        self.assertTrue(stats["total_driving_hours"] > 20.0)
        self.assertTrue(
            stats["fuel_stops_count"] >= 1, "Must schedule fuel stop for 1430 mile trip"
        )
        self.assertTrue(stats["rest_breaks_count"] >= 1, "Must schedule 30-min break")
        self.assertTrue(
            stats["sleeper_stops_count"] >= 1, "Must schedule 10h rest for long trip"
        )

        # Verify logs generated
        logs = generate_daily_logs(hos["timeline_events"])
        self.assertTrue(
            len(logs) >= 2, "1430 mile trip must span at least 2-3 calendar days"
        )

        # Strict invariant: Every single day's total must equal exactly 24.0 hours!
        for log in logs:
            summary = log["hours_summary"]
            day_sum = round(
                summary["off_duty"]
                + summary["sleeper_berth"]
                + summary["driving"]
                + summary["on_duty_not_driving"],
                2,
            )
            self.assertEqual(
                day_sum,
                24.0,
                f"Day {log['day_number']} total must strictly equal 24.0 hours",
            )
            self.assertTrue(
                len(log["step_points"]) >= 4, "Graph grid step points must exist"
            )

    def test_plan_trip_api_endpoint(self):
        payload = {
            "current_location": "Richmond, VA",
            "pickup_location": "Richmond, VA",
            "dropoff_location": "Newark, NJ",
            "current_cycle_used": 15.0,
            "driver_name": "John E. Doe",
        }
        response = self.client.post("/api/plan-trip/", data=payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("waypoints", data)
        self.assertIn("route", data)
        self.assertIn("stops", data)
        self.assertIn("route_instructions", data)
        self.assertIn("daily_logs", data)
        self.assertTrue(len(data["daily_logs"]) >= 1)
        self.assertTrue(len(data["route_instructions"]) >= 4)

    def test_sample_trips_api_endpoint(self):
        response = self.client.get("/api/sample-trips/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("sample_trips", data)
        self.assertTrue(len(data["sample_trips"]) >= 3)

    def test_fmcsa_richmond_newark_stops(self):
        current_loc = {"lat": 37.5407, "lng": -77.4360, "display_name": "Richmond, VA"}
        pickup_loc = {"lat": 37.5407, "lng": -77.4360, "display_name": "Richmond, VA"}
        dropoff_loc = {"lat": 40.7357, "lng": -74.1724, "display_name": "Newark, NJ"}
        route_data = {
            "distance_miles": 325.0,
            "driving_hours": 6.0,
            "coordinates": [[37.54, -77.43], [38.30, -77.46], [39.93, -75.03], [40.73, -74.17]],
            "legs": [{"distance_miles": 0.0, "duration_hours": 0.0}, {"distance_miles": 325.0, "duration_hours": 6.0}],
        }
        hos = simulate_hos_trip(
            current_loc=current_loc,
            pickup_loc=pickup_loc,
            dropoff_loc=dropoff_loc,
            route_data=route_data,
            current_cycle_used=15.0,
        )
        stop_types = [s["type"] for s in hos["stops"]]
        self.assertIn("pickup", stop_types)
        self.assertIn("fuel_stop", stop_types)
        self.assertIn("break_30m", stop_types)
        self.assertIn("dropoff", stop_types)

    def test_short_route_no_infinite_loop(self):
        current_loc = {"lat": 37.54, "lng": -77.43, "display_name": "Richmond, VA"}
        pickup_loc = {"lat": 37.55, "lng": -77.44, "display_name": "Richmond, VA"}
        dropoff_loc = {"lat": 37.56, "lng": -77.45, "display_name": "Richmond, VA"}
        route_data = {
            "distance_miles": 2.0,
            "driving_hours": 0.05,
            "coordinates": [[37.54, -77.43], [37.56, -77.45]],
            "legs": [{"distance_miles": 1.0, "duration_hours": 0.02}, {"distance_miles": 1.0, "duration_hours": 0.02}],
        }
        hos = simulate_hos_trip(
            current_loc=current_loc,
            pickup_loc=pickup_loc,
            dropoff_loc=dropoff_loc,
            route_data=route_data,
            current_cycle_used=0.0,
        )
        self.assertTrue(len(hos["timeline_events"]) >= 5)

    def test_34_hour_cycle_restart(self):
        current_loc = {
            "lat": 34.0522,
            "lng": -118.2437,
            "display_name": "Los Angeles, CA",
        }
        pickup_loc = {
            "lat": 34.0522,
            "lng": -118.2437,
            "display_name": "Los Angeles, CA",
        }
        dropoff_loc = {"lat": 41.8781, "lng": -87.6298, "display_name": "Chicago, IL"}

        # Route ~2,000 miles, starting with 68 hours already used on the 70-hour cycle
        route_data = {
            "distance_miles": 2015.0,
            "driving_hours": 35.0,
            "coordinates": [[34.05, -118.24], [39.0, -100.0], [41.87, -87.62]],
            "legs": [{"distance_miles": 2015.0, "duration_hours": 35.0}],
        }

        hos = simulate_hos_trip(
            current_loc=current_loc,
            pickup_loc=pickup_loc,
            dropoff_loc=dropoff_loc,
            route_data=route_data,
            current_cycle_used=68.0,  # almost exhausted!
        )

        self.assertTrue(
            hos["stats"]["restarts_count"] >= 1,
            "Must trigger 34h restart when cycle reaches 70h",
        )
        logs = generate_daily_logs(hos["timeline_events"])
        self.assertTrue(len(logs) >= 3)
        for log in logs:
            day_sum = round(
                sum(
                    [
                        log["hours_summary"][k]
                        for k in [
                            "off_duty",
                            "sleeper_berth",
                            "driving",
                            "on_duty_not_driving",
                        ]
                    ]
                ),
                2,
            )
            self.assertEqual(day_sum, 24.0)
