"""
FMCSA ELD Daily Log Sheet (RODS) Generator.
Slices continuous multi-day HOS events into 24-hour calendar days (Midnight to Midnight),
calculates exact duty totals (strictly summing to 24.0 hours), generates SVG grid line
step coordinates, and formats DOT-compliant remarks and recap.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any

STATUS_ROW_MAP = {
    "OFF": 0,  # Off Duty
    "SB": 1,  # Sleeper Berth
    "D": 2,  # Driving
    "ON": 3,  # On Duty (Not Driving)
}


def generate_daily_logs(
    timeline_events: List[Dict[str, Any]],
    carrier_name: str = "Interstate Logistics Express",
    carrier_address: str = "Dallas, TX",
    driver_name: str = "John E. Doe",
    truck_number: str = "Unit 1084",
    trailer_number: str = "Van 53210",
    shipping_doc: str = "BOL-774920",
) -> List[Dict[str, Any]]:
    """
    Slices timeline events into discrete calendar day logs (00:00 - 24:00).
    """
    if not timeline_events:
        return []

    # Find earliest start and latest end
    earliest_time = timeline_events[0]["start"]
    latest_time = timeline_events[-1]["end"]

    # Start date at midnight
    current_day_start = earliest_time.replace(hour=0, minute=0, second=0, microsecond=0)
    final_day_end = (latest_time + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    daily_logs: List[Dict[str, Any]] = []
    day_number = 1

    # Keep track of rolling cycle hours
    rolling_cycle_total = 0.0

    while current_day_start < latest_time:
        current_day_end = current_day_start + timedelta(days=1)
        day_events: List[Dict[str, Any]] = []

        # Slice any event that overlaps with [current_day_start, current_day_end]
        for ev in timeline_events:
            ev_start = ev["start"]
            ev_end = ev["end"]

            # Check overlap
            if ev_end <= current_day_start or ev_start >= current_day_end:
                continue

            # Clamped overlap inside this calendar day
            slice_start = max(ev_start, current_day_start)
            slice_end = min(ev_end, current_day_end)
            slice_dur = (slice_end - slice_start).total_seconds() / 3600.0

            if slice_dur > 0.001:
                start_hour_in_day = (
                    slice_start - current_day_start
                ).total_seconds() / 3600.0
                end_hour_in_day = (
                    slice_end - current_day_start
                ).total_seconds() / 3600.0

                day_events.append(
                    {
                        "status": ev["status"],
                        "start_hour": round(start_hour_in_day, 4),
                        "end_hour": round(end_hour_in_day, 4),
                        "duration": round(slice_dur, 4),
                        "location": ev.get("location", ""),
                        "description": ev.get("description", ""),
                        "cumulative_miles": ev.get("cumulative_miles", 0.0),
                        "is_transition": (ev_start >= current_day_start),
                    }
                )

        # Calculate exact totals for this 24-hour period
        total_off = sum(e["duration"] for e in day_events if e["status"] == "OFF")
        total_sb = sum(e["duration"] for e in day_events if e["status"] == "SB")
        total_d = sum(e["duration"] for e in day_events if e["status"] == "D")
        total_on = sum(e["duration"] for e in day_events if e["status"] == "ON")

        # Guarantee strict 24.00 hours total
        raw_sum = total_off + total_sb + total_d + total_on
        diff = 24.0 - raw_sum
        if abs(diff) > 0.0001:
            total_off += diff

        # Driving miles for today
        day_driving_events = [e for e in day_events if e["status"] == "D"]
        if day_driving_events:
            start_m = day_driving_events[0]["cumulative_miles"]
            end_m = day_driving_events[-1]["cumulative_miles"]
            miles_today = max(0.0, round(end_m - start_m + 35.0, 1))  # include segment
        else:
            miles_today = 0.0

        # Construct Step Line Points for Canvas / SVG Graph Grid:
        # Each vertex has: [hour (0-24), status_index (0-3)]
        step_points = []
        for i, ev in enumerate(day_events):
            row_idx = STATUS_ROW_MAP.get(ev["status"], 0)
            if i == 0 and ev["start_hour"] > 0:
                # Fill initial gap with OFF
                step_points.append({"hour": 0.0, "status_index": 0})
                step_points.append({"hour": ev["start_hour"], "status_index": 0})

            # Start of this event
            step_points.append({"hour": ev["start_hour"], "status_index": row_idx})
            # End of this event
            step_points.append({"hour": ev["end_hour"], "status_index": row_idx})

        # Fill end gap if needed
        if step_points and step_points[-1]["hour"] < 24.0:
            last_row = step_points[-1]["status_index"]
            step_points.append({"hour": 24.0, "status_index": last_row})

        # Generate DOT Remarks (Page 17 & 18 in Guide):
        # Format: City, State with time and duty change
        remarks: List[Dict[str, Any]] = []
        seen_remarks = set()
        for ev in day_events:
            loc = ev.get("location", "")
            if loc and loc not in seen_remarks:
                seen_remarks.add(loc)
                time_h = int(ev["start_hour"])
                time_m = int(round((ev["start_hour"] - time_h) * 60))
                time_str = f"{time_h:02d}:{time_m:02d}"
                remarks.append(
                    {
                        "hour": ev["start_hour"],
                        "time_str": time_str,
                        "location": loc,
                        "status": ev["status"],
                        "description": ev["description"],
                    }
                )

        # Daily recap totals
        on_duty_today = round(total_d + total_on, 2)
        rolling_cycle_total += on_duty_today

        daily_logs.append(
            {
                "day_number": day_number,
                "date": current_day_start.strftime("%m/%d/%Y"),
                "formatted_date": current_day_start.strftime("%B %d, %Y"),
                "carrier_name": carrier_name,
                "carrier_address": carrier_address,
                "driver_name": driver_name,
                "truck_number": truck_number,
                "trailer_number": trailer_number,
                "shipping_doc": shipping_doc,
                "total_miles_driving_today": round(miles_today, 1),
                "hours_summary": {
                    "off_duty": round(total_off, 2),
                    "sleeper_berth": round(total_sb, 2),
                    "driving": round(total_d, 2),
                    "on_duty_not_driving": round(total_on, 2),
                    "total": 24.0,
                },
                "recap": {
                    "on_duty_today": on_duty_today,
                    "total_cycle_hours_used": round(rolling_cycle_total, 2),
                    "cycle_hours_available": max(
                        0.0, round(70.0 - rolling_cycle_total, 2)
                    ),
                },
                "events": day_events,
                "step_points": step_points,
                "remarks": remarks,
            }
        )

        current_day_start = current_day_end
        day_number += 1

    return daily_logs
