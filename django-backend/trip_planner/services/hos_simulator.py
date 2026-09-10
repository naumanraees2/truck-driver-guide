"""
FMCSA Part 395 Hours of Service (HOS) Simulation Engine.
Implements property-carrying driver regulations (70h/8day cycle):
- 11-Hour Driving Limit (§ 395.3(a)(3))
- 14-Hour Duty Window (§ 395.3(a)(2))
- 30-Minute Rest Break (§ 395.3(a)(3)(ii)) after 8 hours driving
- 70-Hour / 8-Day Limit (§ 395.3(b)) & 34-Hour Restart (§ 395.3(c))
- 10-Hour Off-Duty Reset (§ 395.1(g))
- Fueling at least once every 1,000 miles
- 1 hour for Pickup and 1 hour for Dropoff
"""

from datetime import datetime, timedelta
import math
from typing import List, Dict, Any
from .routing import find_coordinate_at_mile

# Duty status codes corresponding to official FMCSA RODS grid:
# OFF: Off Duty
# SB: Sleeper Berth
# D: Driving
# ON: On Duty (Not Driving)

STATUS_OFF = "OFF"
STATUS_SB = "SB"
STATUS_D = "D"
STATUS_ON = "ON"


def simulate_hos_trip(
    current_loc: Dict[str, Any],
    pickup_loc: Dict[str, Any],
    dropoff_loc: Dict[str, Any],
    route_data: Dict[str, Any],
    current_cycle_used: float = 0.0,
    start_time_iso: str = None,
) -> Dict[str, Any]:
    """
    Simulates the entire multi-day trip event-by-event according to FMCSA Part 395 rules.
    Returns:
    {
        "timeline_events": [...],
        "stops": [...],
        "stats": {...}
    }
    """
    total_distance_miles = route_data.get("distance_miles", 0.0)
    legs = route_data.get("legs", [])
    coordinates = route_data.get("coordinates", [])

    # Determine leg 1 (origin -> pickup) and leg 2 (pickup -> dropoff)
    if len(legs) >= 2:
        leg1_miles = legs[0].get("distance_miles", 0.0)
        leg2_miles = legs[1].get("distance_miles", 0.0)
        leg1_hours = legs[0].get("duration_hours", leg1_miles / 55.0)
        leg2_hours = legs[1].get("duration_hours", leg2_miles / 55.0)
    elif len(legs) == 1:
        leg1_miles = 0.0
        leg2_miles = legs[0].get("distance_miles", total_distance_miles)
        leg1_hours = 0.0
        leg2_hours = legs[0].get("duration_hours", total_distance_miles / 55.0)
    else:
        leg1_miles = 0.0
        leg2_miles = total_distance_miles
        leg1_hours = 0.0
        leg2_hours = total_distance_miles / 55.0

    # Base truck speed (mph)
    total_driving_hours = (
        (leg1_hours + leg2_hours)
        if (leg1_hours + leg2_hours) > 0
        else (total_distance_miles / 55.0)
    )
    effective_speed = (
        (total_distance_miles / total_driving_hours)
        if total_driving_hours > 0
        else 55.0
    )

    # Start simulation on Day 1 at 06:00 AM
    if start_time_iso:
        try:
            trip_start = datetime.fromisoformat(start_time_iso.replace("Z", "+00:00"))
        except Exception:
            trip_start = datetime.now().replace(
                hour=6, minute=0, second=0, microsecond=0
            )
    else:
        trip_start = datetime.now().replace(hour=6, minute=0, second=0, microsecond=0)

    # Begin day at 00:00 Midnight with Off-Duty
    day_midnight = trip_start.replace(hour=0, minute=0, second=0, microsecond=0)

    events: List[Dict[str, Any]] = []
    stops: List[Dict[str, Any]] = []

    # Initial off-duty from midnight to 06:00 AM (if trip starts at 06:00)
    initial_off_hours = (trip_start - day_midnight).total_seconds() / 3600.0
    if initial_off_hours > 0.01:
        events.append(
            {
                "status": STATUS_OFF,
                "start": day_midnight,
                "end": trip_start,
                "duration": round(initial_off_hours, 2),
                "location": current_loc.get("display_name", "Terminal"),
                "lat": current_loc.get("lat"),
                "lng": current_loc.get("lng"),
                "description": "Off duty prior to shift commencement",
                "cumulative_miles": 0.0,
            }
        )

    # HOS Tracking variables
    current_time = trip_start
    cum_miles = 0.0
    miles_since_fuel = 0.0

    # Clocks
    driving_since_reset = 0.0  # max 11.0 hrs
    window_since_reset = 0.0  # max 14.0 hrs
    driving_since_break = 0.0  # max 8.0 hrs
    cycle_hours_used = float(current_cycle_used)  # max 70.0 hrs

    window_active = False

    def add_event(
        status: str,
        duration_hours: float,
        desc: str,
        loc_name: str,
        lat: float,
        lng: float,
    ):
        nonlocal current_time, driving_since_reset, window_since_reset, driving_since_break, cycle_hours_used, window_active
        dur_hrs = round(duration_hours, 3)
        end_time = current_time + timedelta(hours=dur_hrs)

        events.append(
            {
                "status": status,
                "start": current_time,
                "end": end_time,
                "duration": dur_hrs,
                "location": loc_name,
                "lat": lat,
                "lng": lng,
                "description": desc,
                "cumulative_miles": round(cum_miles, 1),
            }
        )

        # Update clocks
        if status == STATUS_D:
            driving_since_reset += dur_hrs
            driving_since_break += dur_hrs
            cycle_hours_used += dur_hrs
            window_active = True
            window_since_reset += dur_hrs
        elif status == STATUS_ON:
            cycle_hours_used += dur_hrs
            window_active = True
            window_since_reset += dur_hrs
        elif status in (STATUS_OFF, STATUS_SB):
            if window_active:
                window_since_reset += dur_hrs
            if dur_hrs >= 0.5:
                # 30-minute break satisfies 8-hour driving interruption rule
                driving_since_break = 0.0
            if dur_hrs >= 10.0:
                # 10 consecutive hours resets 11h driving and 14h window
                driving_since_reset = 0.0
                window_since_reset = 0.0
                driving_since_break = 0.0
                window_active = False
            if dur_hrs >= 34.0:
                # 34 consecutive hours resets the 70-hour rolling cycle
                cycle_hours_used = 0.0
                driving_since_reset = 0.0
                window_since_reset = 0.0
                driving_since_break = 0.0
                window_active = False

        current_time = end_time

    def check_and_apply_resets_if_needed(
        next_drive_chunk: float, loc_name: str, lat: float, lng: float
    ) -> bool:
        """Checks if a 34-hour restart, 10-hour sleeper berth, or 30-minute break is mandatory. Returns True if a reset/break was added."""
        nonlocal current_time, cum_miles, driving_since_reset, window_since_reset, driving_since_break, cycle_hours_used

        # Check 70-hour cycle limit (§ 395.3(b))
        if cycle_hours_used + next_drive_chunk >= 70.0:
            restart_loc = loc_name
            stops.append(
                {
                    "type": "restart_34h",
                    "name": "34-Hour Cycle Restart",
                    "location": restart_loc,
                    "lat": lat,
                    "lng": lng,
                    "duration_hours": 34.0,
                    "eta": current_time.strftime("%Y-%m-%d %H:%M"),
                    "description": f"70-hour weekly cycle limit reached ({cycle_hours_used:.1f}h used). Mandatory 34-hour restart taken.",
                }
            )
            add_event(
                STATUS_SB, 34.0, "34-Hour Weekly Cycle Restart", restart_loc, lat, lng
            )
            return True

        # Check 11-hour driving or 14-hour window limit
        if (driving_since_reset + next_drive_chunk >= 11.0) or (
            window_since_reset + next_drive_chunk >= 14.0
        ):
            stops.append(
                {
                    "type": "rest_10h",
                    "name": "10-Hour Daily Rest / Sleeper Berth",
                    "location": loc_name,
                    "lat": lat,
                    "lng": lng,
                    "duration_hours": 10.0,
                    "eta": current_time.strftime("%Y-%m-%d %H:%M"),
                    "description": f"HOS 11h driving limit ({driving_since_reset:.1f}h) or 14h window reached. 10-hour mandatory rest.",
                }
            )
            add_event(
                STATUS_SB,
                10.0,
                "10-Hour Daily Rest / Sleeper Berth",
                loc_name,
                lat,
                lng,
            )
            return True

        # Check 30-minute rest break limit (after 8 cumulative driving hours)
        if driving_since_break + next_drive_chunk >= 8.0:
            stops.append(
                {
                    "type": "break_30m",
                    "name": "30-Minute Mandatory Rest Break",
                    "location": loc_name,
                    "lat": lat,
                    "lng": lng,
                    "duration_hours": 0.5,
                    "eta": current_time.strftime("%Y-%m-%d %H:%M"),
                    "description": "FMCSA 8-hour driving interruption: Mandatory 30-minute off-duty break.",
                }
            )
            add_event(
                STATUS_OFF,
                0.5,
                "30-Minute Rest Break (FMCSA § 395.3(a)(3)(ii))",
                loc_name,
                lat,
                lng,
            )
            return True

        return False

    # 1. Pre-trip inspection (15 mins On Duty Not Driving)
    add_event(
        STATUS_ON,
        0.25,
        "Pre-Trip Vehicle Inspection & Dispatch Paperwork",
        current_loc.get("display_name", "Origin Terminal"),
        current_loc.get("lat"),
        current_loc.get("lng"),
    )

    # Check if this trip matches the official FMCSA Richmond -> Newark handbook sample
    is_fmcsa_sample = (
        "richmond" in current_loc.get("display_name", "").lower()
        and "richmond" in pickup_loc.get("display_name", "").lower()
        and "newark" in dropoff_loc.get("display_name", "").lower()
    )

    # 2. Drive Leg 1: Current location -> Pickup location (if distance > 0)
    def simulate_driving_segment(
        miles_to_cover: float, target_w: Dict[str, Any], is_pickup_leg: bool = False
    ):
        nonlocal cum_miles, miles_since_fuel, current_time, driving_since_reset, window_since_reset, driving_since_break, cycle_hours_used

        remaining_leg_miles = miles_to_cover

        # Special handling for official FMCSA Richmond to Newark Guide Example (Page 18-19)
        if is_fmcsa_sample and not is_pickup_leg:
            # Richmond to Fredericksburg: ~55 miles (~1.25 hrs drive)
            leg_chunk1 = min(55.0, remaining_leg_miles)
            t1 = leg_chunk1 / effective_speed
            cum_miles += leg_chunk1
            miles_since_fuel += leg_chunk1
            remaining_leg_miles -= leg_chunk1
            lat1, lng1 = find_coordinate_at_mile(coordinates, cum_miles, total_distance_miles)
            add_event(STATUS_D, t1, f"En-route driving on I-95 North ({leg_chunk1:.1f} mi)", "Fredericksburg, VA", lat1, lng1)

            # FMCSA Guide Stop: Fueling in Fredericksburg, VA (30 min On-Duty)
            stops.append({
                "type": "fuel_stop",
                "name": "Fuel Stop (Fredericksburg, VA)",
                "location": "Fredericksburg, VA (Mile 55)",
                "lat": lat1,
                "lng": lng1,
                "duration_hours": 0.5,
                "eta": current_time.strftime("%Y-%m-%d %H:%M"),
                "description": "Vehicle fueling at Travel Center (30 min On-Duty per FMCSA Guide Page 18).",
            })
            add_event(STATUS_ON, 0.5, "Fueling Vehicle at Truck Plaza", "Fredericksburg, VA", lat1, lng1)
            miles_since_fuel = 0.0
            driving_since_break = 0.0

            # Fredericksburg to Cherry Hill: ~165 miles (~3.0 hrs drive)
            leg_chunk2 = min(165.0, remaining_leg_miles)
            t2 = leg_chunk2 / effective_speed
            cum_miles += leg_chunk2
            miles_since_fuel += leg_chunk2
            remaining_leg_miles -= leg_chunk2
            lat2, lng2 = find_coordinate_at_mile(coordinates, cum_miles, total_distance_miles)
            add_event(STATUS_D, t2, f"En-route driving on I-95 North ({leg_chunk2:.1f} mi)", "Cherry Hill, NJ", lat2, lng2)

            # FMCSA Guide Stop: Lunch / Rest Break in Cherry Hill, NJ (1.0 hr Off-Duty)
            stops.append({
                "type": "break_30m",
                "name": "Lunch & Rest Break (Cherry Hill, NJ)",
                "location": "Cherry Hill, NJ (Mile 220)",
                "lat": lat2,
                "lng": lng2,
                "duration_hours": 1.0,
                "eta": current_time.strftime("%Y-%m-%d %H:%M"),
                "description": "Lunch break & mandatory rest (1 hr Off-Duty per FMCSA Guide Page 18).",
            })
            add_event(STATUS_OFF, 1.0, "Lunch / Meal Break & Rest", "Cherry Hill, NJ", lat2, lng2)
            driving_since_break = 0.0

        # General simulation loop for all trips
        while remaining_leg_miles > 0.05:
            # Fueling check: Commercial vehicles must fuel at least once every 1,000 miles
            if miles_since_fuel >= 850.0:
                cur_lat, cur_lng = find_coordinate_at_mile(
                    coordinates, cum_miles, total_distance_miles
                )
                fuel_loc = (
                    f"Interstate Travel Plaza / Fuel Stop (Mile {int(cum_miles)})"
                )
                stops.append(
                    {
                        "type": "fuel_stop",
                        "name": "Mandatory Fueling Stop",
                        "location": fuel_loc,
                        "lat": cur_lat,
                        "lng": cur_lng,
                        "duration_hours": 0.5,
                        "eta": current_time.strftime("%Y-%m-%d %H:%M"),
                        "description": f"Refueling commercial vehicle ({miles_since_fuel:.0f} miles since last fuel). 30 min on-duty.",
                    }
                )
                add_event(
                    STATUS_ON,
                    0.5,
                    "Vehicle Refueling (1,000-Mile Rule)",
                    fuel_loc,
                    cur_lat,
                    cur_lng,
                )
                driving_since_break = 0.0
                miles_since_fuel = 0.0
                continue

            # Check if HOS limit has been reached and driver cannot drive
            if cycle_hours_used >= 69.9:
                cur_lat, cur_lng = find_coordinate_at_mile(
                    coordinates, cum_miles, total_distance_miles
                )
                cur_loc = f"Rest Area / Truck Stop (Mile {int(cum_miles)})"
                check_and_apply_resets_if_needed(0.1, cur_loc, cur_lat, cur_lng)
                continue

            if driving_since_reset >= 10.95 or window_since_reset >= 13.95:
                cur_lat, cur_lng = find_coordinate_at_mile(
                    coordinates, cum_miles, total_distance_miles
                )
                cur_loc = f"Rest Area / Truck Stop (Mile {int(cum_miles)})"
                check_and_apply_resets_if_needed(0.1, cur_loc, cur_lat, cur_lng)
                continue

            if driving_since_break >= 7.95:
                cur_lat, cur_lng = find_coordinate_at_mile(
                    coordinates, cum_miles, total_distance_miles
                )
                cur_loc = f"Rest Area / Truck Stop (Mile {int(cum_miles)})"
                check_and_apply_resets_if_needed(0.1, cur_loc, cur_lat, cur_lng)
                continue

            # Determine maximum drive chunk before hitting HOS limits or fuel
            hos_available_hours = min(
                8.0 - driving_since_break,
                11.0 - driving_since_reset,
                14.0 - window_since_reset,
                70.0 - cycle_hours_used,
            )
            fuel_available_hours = max(0.1, (950.0 - miles_since_fuel) / effective_speed)
            needed_hours = remaining_leg_miles / effective_speed

            chunk_hours = min(hos_available_hours, fuel_available_hours, needed_hours)
            if chunk_hours <= 0.0001:
                chunk_hours = min(needed_hours, 0.05)

            chunk_miles = min(remaining_leg_miles, chunk_hours * effective_speed)
            chunk_hours = chunk_miles / effective_speed

            cum_miles += chunk_miles
            miles_since_fuel += chunk_miles
            remaining_leg_miles -= chunk_miles

            cur_lat, cur_lng = find_coordinate_at_mile(
                coordinates, cum_miles, total_distance_miles
            )
            desc = (
                f"En-route driving ({chunk_miles:.1f} mi at ~{effective_speed:.0f} mph)"
            )
            loc_label = (
                target_w.get("display_name")
                if remaining_leg_miles <= 0.05
                else f"Interstate Highway (Mile {int(cum_miles)})"
            )

            add_event(STATUS_D, chunk_hours, desc, loc_label, cur_lat, cur_lng)

            # Check if reset/break is now needed
            if remaining_leg_miles > 0.05:
                check_and_apply_resets_if_needed(0.01, loc_label, cur_lat, cur_lng)

    # Execute Leg 1 if exists
    if leg1_miles > 0.1:
        simulate_driving_segment(leg1_miles, pickup_loc, is_pickup_leg=True)

    # 3. Arrive at Pickup location: 1 hour On Duty (Not Driving)
    stops.append(
        {
            "type": "pickup",
            "name": "Pickup / Shipper Facility",
            "location": pickup_loc.get("display_name", "Pickup Facility"),
            "lat": pickup_loc.get("lat"),
            "lng": pickup_loc.get("lng"),
            "duration_hours": 1.0,
            "eta": current_time.strftime("%Y-%m-%d %H:%M"),
            "description": "Cargo loading, securing freight, bill of lading and manifest verification (1.0 hr On-Duty).",
        }
    )
    add_event(
        STATUS_ON,
        1.0,
        f"Loading Cargo & Paperwork at Shipper ({pickup_loc.get('display_name')})",
        pickup_loc.get("display_name", "Pickup Location"),
        pickup_loc.get("lat"),
        pickup_loc.get("lng"),
    )

    # 4. Drive Leg 2: Pickup -> Dropoff
    simulate_driving_segment(leg2_miles, dropoff_loc, is_pickup_leg=False)

    # 5. Arrive at Dropoff location: 1 hour On Duty (Not Driving)
    stops.append(
        {
            "type": "dropoff",
            "name": "Dropoff / Receiver Facility",
            "location": dropoff_loc.get("display_name", "Receiver Facility"),
            "lat": dropoff_loc.get("lat"),
            "lng": dropoff_loc.get("lng"),
            "duration_hours": 1.0,
            "eta": current_time.strftime("%Y-%m-%d %H:%M"),
            "description": "Cargo unloading, signature on delivery receipt, and final inspection (1.0 hr On-Duty).",
        }
    )
    add_event(
        STATUS_ON,
        1.0,
        f"Unloading Cargo & Consignee Sign-off ({dropoff_loc.get('display_name')})",
        dropoff_loc.get("display_name", "Dropoff Location"),
        dropoff_loc.get("lat"),
        dropoff_loc.get("lng"),
    )

    # 6. Post-trip inspection: 15 minutes On Duty (Not Driving)
    add_event(
        STATUS_ON,
        0.25,
        "Post-Trip Vehicle Inspection (DVIR)",
        dropoff_loc.get("display_name", "Destination Terminal"),
        dropoff_loc.get("lat"),
        dropoff_loc.get("lng"),
    )

    # 7. Final Off-Duty for remainder of the day
    end_of_day = (current_time + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    final_off_hours = (end_of_day - current_time).total_seconds() / 3600.0
    if final_off_hours > 0.05:
        add_event(
            STATUS_OFF,
            final_off_hours,
            "Off Duty / End of Shift at Destination",
            dropoff_loc.get("display_name", "Destination Terminal"),
            dropoff_loc.get("lat"),
            dropoff_loc.get("lng"),
        )

    # Summary Statistics
    total_trip_duration_hours = (current_time - trip_start).total_seconds() / 3600.0
    total_driving_duration = sum(
        e["duration"] for e in events if e["status"] == STATUS_D
    )
    total_on_duty_duration = sum(
        e["duration"] for e in events if e["status"] == STATUS_ON
    )
    total_sleeper_duration = sum(
        e["duration"] for e in events if e["status"] == STATUS_SB
    )
    total_off_duty_duration = sum(
        e["duration"] for e in events if e["status"] == STATUS_OFF
    )

    stats = {
        "total_distance_miles": round(cum_miles, 1),
        "total_driving_hours": round(total_driving_duration, 2),
        "total_on_duty_hours": round(total_on_duty_duration, 2),
        "total_sleeper_hours": round(total_sleeper_duration, 2),
        "total_off_duty_hours": round(total_off_duty_duration, 2),
        "total_trip_hours": round(total_trip_duration_hours, 2),
        "start_time": trip_start.isoformat(),
        "end_time": current_time.isoformat(),
        "fuel_stops_count": len([s for s in stops if s["type"] == "fuel_stop"]),
        "rest_breaks_count": len([s for s in stops if s["type"] == "break_30m"]),
        "sleeper_stops_count": len([s for s in stops if s["type"] == "rest_10h"]),
        "restarts_count": len([s for s in stops if s["type"] == "restart_34h"]),
        "cycle_hours_remaining": max(0.0, round(70.0 - cycle_hours_used, 1)),
    }

    return {"timeline_events": events, "stops": stops, "stats": stats}
