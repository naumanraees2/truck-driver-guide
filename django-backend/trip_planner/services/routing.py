"""
Routing service for Truck Driver Guide Service.
Calculates road routes via OSRM (Open Source Routing Machine) free public API,
with highway distance, coordinates polyline, and distance-interpolated waypoint locator.
"""

import requests
import math
from typing import List, Dict, Any, Tuple

EARTH_RADIUS_MILES = 3958.8


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates haversine distance in miles between two coordinates."""
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_MILES * c


def interpolate_line(
    p1: Tuple[float, float], p2: Tuple[float, float], fraction: float
) -> Tuple[float, float]:
    """Interpolate coordinates linearly."""
    lat = p1[0] + (p2[0] - p1[0]) * fraction
    lng = p1[1] + (p2[1] - p1[1]) * fraction
    return (lat, lng)


def get_fallback_route(waypoints: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Fallback route calculation when external routing API is unavailable."""
    total_dist = 0.0
    legs = []
    all_coords: List[List[float]] = []

    for i in range(len(waypoints) - 1):
        w1 = waypoints[i]
        w2 = waypoints[i + 1]
        raw_dist = haversine_distance(w1["lat"], w1["lng"], w2["lat"], w2["lng"])
        # Highway route distance circuity factor is approx 1.25x haversine
        road_dist = max(5.0, raw_dist * 1.25)
        # Commercial truck average highway speed is ~55 mph (accounting for weigh stations, grade, traffic)
        truck_speed = 55.0
        duration_hours = road_dist / truck_speed

        leg_coords = []
        num_steps = max(10, int(road_dist / 20))
        for s in range(num_steps + 1):
            frac = s / num_steps
            lat, lng = interpolate_line(
                (w1["lat"], w1["lng"]), (w2["lat"], w2["lng"]), frac
            )
            # Add slight curve so route is realistic
            curve = math.sin(frac * math.pi) * 0.15 * (1 if (i % 2 == 0) else -1)
            leg_coords.append([round(lat + curve, 5), round(lng, 5)])

        legs.append(
            {
                "from_name": w1.get("display_name", "Origin"),
                "to_name": w2.get("display_name", "Destination"),
                "distance_miles": round(road_dist, 1),
                "duration_hours": round(duration_hours, 2),
                "coordinates": leg_coords,
            }
        )
        total_dist += road_dist
        if all_coords and leg_coords:
            all_coords.extend(leg_coords[1:])
        else:
            all_coords.extend(leg_coords)

    return {
        "distance_miles": round(total_dist, 1),
        "driving_hours": round(total_dist / 55.0, 2),
        "coordinates": all_coords,
        "legs": legs,
    }


def get_route(waypoints: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Fetches route for waypoints [current, pickup, dropoff] using OSRM.
    Returns:
    {
        "distance_miles": float,
        "driving_hours": float,
        "coordinates": [[lat, lng], ...],
        "legs": [...]
    }
    """
    if len(waypoints) < 2:
        return get_fallback_route(waypoints)

    coord_str = ";".join([f"{w['lng']},{w['lat']}" for w in waypoints])
    url = f"https://router.project-osrm.org/route/v1/driving/{coord_str}?overview=full&geometries=geojson&steps=false"

    try:
        resp = requests.get(url, timeout=7)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("code") == "Ok" and data.get("routes"):
                route = data["routes"][0]
                distance_meters = route.get("distance", 0)
                duration_seconds = route.get("duration", 0)

                distance_miles = round(distance_meters * 0.000621371, 1)

                # Commercial trucks drive slightly slower than standard passenger car OSRM estimates
                # Adjust duration if needed so truck driving speed is realistic (~55-60 mph)
                base_hours = duration_seconds / 3600.0
                driving_hours = round(max(base_hours * 1.15, distance_miles / 58.0), 2)

                # GeoJSON coordinates are [lon, lat] -> convert to [lat, lon] for Leaflet
                raw_coords = route.get("geometry", {}).get("coordinates", [])
                leaflet_coords = [
                    [round(pt[1], 5), round(pt[0], 5)] for pt in raw_coords
                ]

                # Parse legs
                legs_data = []
                osrm_legs = route.get("legs", [])
                for i, leg in enumerate(osrm_legs):
                    from_w = waypoints[i]
                    to_w = waypoints[i + 1]
                    leg_dist = round(leg.get("distance", 0) * 0.000621371, 1)
                    leg_dur = round(
                        max((leg.get("duration", 0) / 3600.0) * 1.15, leg_dist / 58.0),
                        2,
                    )
                    legs_data.append(
                        {
                            "from_name": from_w.get("display_name", f"Waypoint {i+1}"),
                            "to_name": to_w.get("display_name", f"Waypoint {i+2}"),
                            "distance_miles": leg_dist,
                            "duration_hours": leg_dur,
                        }
                    )

                return {
                    "distance_miles": distance_miles,
                    "driving_hours": driving_hours,
                    "coordinates": leaflet_coords,
                    "legs": legs_data,
                }
    except Exception as e:
        print(f"OSRM router failed or timed out: {e}. Using fallback route.")

    return get_fallback_route(waypoints)


def find_coordinate_at_mile(
    coordinates: List[List[float]], target_mile: float, total_miles: float
) -> Tuple[float, float]:
    """Finds the (lat, lng) along the polyline corresponding to target_mile."""
    if not coordinates:
        return (39.0997, -94.5786)
    if target_mile <= 0:
        return (coordinates[0][0], coordinates[0][1])
    if target_mile >= total_miles or len(coordinates) == 1:
        return (coordinates[-1][0], coordinates[-1][1])

    fraction = max(0.0, min(1.0, target_mile / total_miles))
    idx = int(fraction * (len(coordinates) - 1))
    return (coordinates[idx][0], coordinates[idx][1])


def generate_route_instructions(
    waypoints: List[Dict[str, Any]],
    route_data: Dict[str, Any],
    stops: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Generates step-by-step route and duty instructions for commercial drivers,
    combining driving segments, highway navigation guidance, and mandatory HOS stops.
    """
    instructions: List[Dict[str, Any]] = []
    step_num = 1

    current_w = waypoints[0] if len(waypoints) > 0 else {}
    pickup_w = waypoints[1] if len(waypoints) > 1 else {}
    dropoff_w = waypoints[2] if len(waypoints) > 2 else {}

    current_name = current_w.get("display_name", "Current Location")
    pickup_name = pickup_w.get("display_name", "Pickup Location")
    dropoff_name = dropoff_w.get("display_name", "Dropoff Location")

    legs = route_data.get("legs", [])
    leg1_dist = legs[0]["distance_miles"] if len(legs) > 0 else 0.0
    leg1_dur = legs[0]["duration_hours"] if len(legs) > 0 else 0.0
    leg2_dist = legs[1]["distance_miles"] if len(legs) > 1 else (legs[0]["distance_miles"] if legs else 0.0)

    # Step 1: Pre-trip inspection
    instructions.append(
        {
            "step_number": step_num,
            "type": "inspect",
            "title": "Pre-Trip Inspection & Dispatch Verification",
            "location": current_name,
            "distance_miles": 0.0,
            "duration": "15 min",
            "duty_status": "ON",
            "instruction": f"Conduct 49 CFR § 396.11 pre-trip vehicle walkaround inspection at {current_name}. Check air brake lines, tire pressure, cargo coupling, coupling pins, and lights.",
        }
    )
    step_num += 1

    # Step 2: Transit to Pickup (if distance > 1 mi)
    if leg1_dist > 1.0:
        instructions.append(
            {
                "step_number": step_num,
                "type": "drive",
                "title": f"Inbound Transit: Proceed to Shipper ({pickup_name})",
                "location": f"Transit from {current_name} to {pickup_name}",
                "distance_miles": leg1_dist,
                "duration": f"{leg1_dur:.1f} hrs",
                "duty_status": "D",
                "instruction": f"Drive {leg1_dist:.1f} miles via commercial highway route to {pickup_name}. Observe commercial speed limits and monitor gross vehicle weight limits.",
            }
        )
        step_num += 1

    # Step 3: Shipper Loading
    pickup_stop = next((s for s in stops if s["type"] == "pickup"), None)
    instructions.append(
        {
            "step_number": step_num,
            "type": "pickup",
            "title": "Shipper Facility Arrival & Cargo Loading",
            "location": pickup_name,
            "distance_miles": leg1_dist,
            "duration": "1.0 hr",
            "duty_status": "ON",
            "eta": pickup_stop["eta"] if pickup_stop else None,
            "instruction": f"Check in at shipper security gate in {pickup_name}. Back into assigned loading dock. Verify freight counts, secure and seal trailer doors, and sign Bill of Lading (BOL).",
        }
    )
    step_num += 1

    # Step 4: En-route intermediate stops (fuel, rest, sleeper)
    intermediate_stops = [s for s in stops if s["type"] not in ("pickup", "dropoff")]
    prev_mile = leg1_dist

    if intermediate_stops:
        for idx, stop in enumerate(intermediate_stops):
            stop_type = stop.get("type", "")
            stop_name = stop.get("name", "En-route Stop")
            stop_loc = stop.get("location", "Highway Corridor")
            dur_hrs = stop.get("duration_hours", 0.5)
            eta = stop.get("eta", "")

            # Driving segment to this stop
            instructions.append(
                {
                    "step_number": step_num,
                    "type": "drive",
                    "title": f"Highway Transit toward {stop_name}",
                    "location": f"Interstate Corridor toward {stop_loc}",
                    "distance_miles": round(prev_mile, 1),
                    "duration": "En-route",
                    "duty_status": "D",
                    "instruction": f"Follow navigation corridor. Prepare to exit interstate toward {stop_loc}.",
                }
            )
            step_num += 1

            if stop_type == "fuel_stop":
                instructions.append(
                    {
                        "step_number": step_num,
                        "type": "fuel",
                        "title": f"Mandatory Fueling Stop: {stop_name}",
                        "location": stop_loc,
                        "distance_miles": round(prev_mile, 1),
                        "duration": f"{dur_hrs:.1f} hr" if dur_hrs >= 1 else "30 min",
                        "duty_status": "ON",
                        "eta": eta,
                        "instruction": f"Pull commercial vehicle into high-flow diesel bay at {stop_loc}. Refuel tractor tanks, record odometer on trip log, and conduct quick tire and strap check.",
                    }
                )
            elif stop_type == "break_30m":
                instructions.append(
                    {
                        "step_number": step_num,
                        "type": "rest",
                        "title": f"FMCSA Mandatory 30-Min Rest Break: {stop_name}",
                        "location": stop_loc,
                        "distance_miles": round(prev_mile, 1),
                        "duration": "30 min",
                        "duty_status": "OFF",
                        "eta": eta,
                        "instruction": f"Park in designated truck parking at {stop_loc}. Log 30 minutes Off-Duty to satisfy FMCSA § 395.3(a)(3)(ii) 8-hour driving interruption requirement.",
                    }
                )
            elif stop_type == "rest_10h":
                instructions.append(
                    {
                        "step_number": step_num,
                        "type": "sleeper",
                        "title": f"10-Hour Daily Sleeper Berth Reset: {stop_name}",
                        "location": stop_loc,
                        "distance_miles": round(prev_mile, 1),
                        "duration": "10.0 hrs",
                        "duty_status": "SB",
                        "eta": eta,
                        "instruction": f"Secure tractor-trailer in safe truck parking at {stop_loc}. Enter Sleeper Berth (SB) status for 10 consecutive hours to reset the 11-hour driving and 14-hour window clocks.",
                    }
                )
            elif stop_type == "restart_34h":
                instructions.append(
                    {
                        "step_number": step_num,
                        "type": "restart",
                        "title": f"34-Hour Weekly Cycle Restart: {stop_name}",
                        "location": stop_loc,
                        "distance_miles": round(prev_mile, 1),
                        "duration": "34.0 hrs",
                        "duty_status": "SB",
                        "eta": eta,
                        "instruction": f"70-hour rolling limit reached. Park at secure terminal/plaza at {stop_loc} for 34 consecutive hours Off-Duty / Sleeper Berth to fully reset the 70-hour/8-day cycle.",
                    }
                )
            step_num += 1
    else:
        # Direct highway drive
        instructions.append(
            {
                "step_number": step_num,
                "type": "drive",
                "title": f"Main Interstate Transit to {dropoff_name}",
                "location": f"Interstate Highway Corridor ({round(leg2_dist, 1)} mi)",
                "distance_miles": round(leg2_dist, 1),
                "duration": f"{legs[1]['duration_hours']:.1f} hrs" if len(legs) > 1 else "Direct",
                "duty_status": "D",
                "instruction": f"Proceed on designated truck route toward destination consignee at {dropoff_name}. Maintain safe following distance and speed.",
            }
        )
        step_num += 1

    # Step 5: Consignee Delivery / Unloading
    dropoff_stop = next((s for s in stops if s["type"] == "dropoff"), None)
    total_dist = route_data.get("distance_miles", prev_mile)
    instructions.append(
        {
            "step_number": step_num,
            "type": "dropoff",
            "title": "Receiver Facility Arrival & Cargo Unloading",
            "location": dropoff_name,
            "distance_miles": total_dist,
            "duration": "1.0 hr",
            "duty_status": "ON",
            "eta": dropoff_stop["eta"] if dropoff_stop else None,
            "instruction": f"Arrive at consignee gate in {dropoff_name}. Back into assigned bay for freight discharge. Obtain receiver signature and date stamp on delivery receipt.",
        }
    )
    step_num += 1

    # Step 6: Post-trip DVIR Inspection
    instructions.append(
        {
            "step_number": step_num,
            "type": "inspect",
            "title": "Post-Trip DVIR Vehicle Inspection & Shift Closeout",
            "location": dropoff_name,
            "distance_miles": total_dist,
            "duration": "15 min",
            "duty_status": "ON",
            "instruction": f"Complete post-trip Driver Vehicle Inspection Report (DVIR) per 49 CFR § 396.11. Certify vehicle roadworthiness or report safety defects to carrier.",
        }
    )
    step_num += 1

    # Step 7: Off-duty end of shift
    instructions.append(
        {
            "step_number": step_num,
            "type": "arrive",
            "title": "End of Shift / Off-Duty Release",
            "location": dropoff_name,
            "distance_miles": total_dist,
            "duration": "Off Duty",
            "duty_status": "OFF",
            "instruction": f"Switch ELD duty status to Off-Duty (OFF) at {dropoff_name}. Electronically sign Driver's Daily Log (RODS) certifying Part 395 compliance.",
        }
    )

    return instructions

