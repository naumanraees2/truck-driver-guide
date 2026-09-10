"""
Geocoding service for Truck Driver Guide Service.
Provides fast in-memory resolution of major logistics hubs and US cities,
with fallback to OpenStreetMap Nominatim for arbitrary addresses.
"""

import requests
import time
import re
from typing import Dict, Any, Optional

# Curated lookup for major US freight cities & hubs for instant, bulletproof response
US_LOGISTICS_HUBS = {
    "los angeles, ca": {
        "lat": 34.0522,
        "lng": -118.2437,
        "city": "Los Angeles",
        "state": "CA",
        "name": "Los Angeles, CA",
    },
    "los angeles": {
        "lat": 34.0522,
        "lng": -118.2437,
        "city": "Los Angeles",
        "state": "CA",
        "name": "Los Angeles, CA",
    },
    "long beach, ca": {
        "lat": 33.7701,
        "lng": -118.1937,
        "city": "Long Beach",
        "state": "CA",
        "name": "Long Beach, CA",
    },
    "ontario, ca": {
        "lat": 34.0633,
        "lng": -117.6509,
        "city": "Ontario",
        "state": "CA",
        "name": "Ontario, CA",
    },
    "san francisco, ca": {
        "lat": 37.7749,
        "lng": -122.4194,
        "city": "San Francisco",
        "state": "CA",
        "name": "San Francisco, CA",
    },
    "sacramento, ca": {
        "lat": 38.5816,
        "lng": -121.4944,
        "city": "Sacramento",
        "state": "CA",
        "name": "Sacramento, CA",
    },
    "seattle, wa": {
        "lat": 47.6062,
        "lng": -122.3321,
        "city": "Seattle",
        "state": "WA",
        "name": "Seattle, WA",
    },
    "portland, or": {
        "lat": 45.5152,
        "lng": -122.6784,
        "city": "Portland",
        "state": "OR",
        "name": "Portland, OR",
    },
    "phoenix, az": {
        "lat": 33.4484,
        "lng": -112.0740,
        "city": "Phoenix",
        "state": "AZ",
        "name": "Phoenix, AZ",
    },
    "las vegas, nv": {
        "lat": 36.1699,
        "lng": -115.1398,
        "city": "Las Vegas",
        "state": "NV",
        "name": "Las Vegas, NV",
    },
    "salt lake city, ut": {
        "lat": 40.7608,
        "lng": -111.8910,
        "city": "Salt Lake City",
        "state": "UT",
        "name": "Salt Lake City, UT",
    },
    "denver, co": {
        "lat": 39.7392,
        "lng": -104.9903,
        "city": "Denver",
        "state": "CO",
        "name": "Denver, CO",
    },
    "albuquerque, nm": {
        "lat": 35.0844,
        "lng": -106.6504,
        "city": "Albuquerque",
        "state": "NM",
        "name": "Albuquerque, NM",
    },
    "el paso, tx": {
        "lat": 31.7619,
        "lng": -106.4850,
        "city": "El Paso",
        "state": "TX",
        "name": "El Paso, TX",
    },
    "dallas, tx": {
        "lat": 32.7767,
        "lng": -96.7970,
        "city": "Dallas",
        "state": "TX",
        "name": "Dallas, TX",
    },
    "fort worth, tx": {
        "lat": 32.7555,
        "lng": -97.3308,
        "city": "Fort Worth",
        "state": "TX",
        "name": "Fort Worth, TX",
    },
    "houston, tx": {
        "lat": 29.7604,
        "lng": -95.3698,
        "city": "Houston",
        "state": "TX",
        "name": "Houston, TX",
    },
    "san antonio, tx": {
        "lat": 29.4241,
        "lng": -98.4936,
        "city": "San Antonio",
        "state": "TX",
        "name": "San Antonio, TX",
    },
    "austin, tx": {
        "lat": 30.2672,
        "lng": -97.7431,
        "city": "Austin",
        "state": "TX",
        "name": "Austin, TX",
    },
    "oklahoma city, ok": {
        "lat": 35.4676,
        "lng": -97.5164,
        "city": "Oklahoma City",
        "state": "OK",
        "name": "Oklahoma City, OK",
    },
    "kansas city, mo": {
        "lat": 39.0997,
        "lng": -94.5786,
        "city": "Kansas City",
        "state": "MO",
        "name": "Kansas City, MO",
    },
    "st. louis, mo": {
        "lat": 38.6270,
        "lng": -90.1994,
        "city": "St. Louis",
        "state": "MO",
        "name": "St. Louis, MO",
    },
    "st louis, mo": {
        "lat": 38.6270,
        "lng": -90.1994,
        "city": "St. Louis",
        "state": "MO",
        "name": "St. Louis, MO",
    },
    "memphis, tn": {
        "lat": 35.1495,
        "lng": -90.0490,
        "city": "Memphis",
        "state": "TN",
        "name": "Memphis, TN",
    },
    "nashville, tn": {
        "lat": 36.1627,
        "lng": -86.7816,
        "city": "Nashville",
        "state": "TN",
        "name": "Nashville, TN",
    },
    "chicago, il": {
        "lat": 41.8781,
        "lng": -87.6298,
        "city": "Chicago",
        "state": "IL",
        "name": "Chicago, IL",
    },
    "indianapolis, in": {
        "lat": 39.7684,
        "lng": -86.1581,
        "city": "Indianapolis",
        "state": "IN",
        "name": "Indianapolis, IN",
    },
    "columbus, oh": {
        "lat": 39.9612,
        "lng": -82.9988,
        "city": "Columbus",
        "state": "OH",
        "name": "Columbus, OH",
    },
    "cleveland, oh": {
        "lat": 41.4993,
        "lng": -81.6944,
        "city": "Cleveland",
        "state": "OH",
        "name": "Cleveland, OH",
    },
    "cincinnati, oh": {
        "lat": 39.1031,
        "lng": -84.5120,
        "city": "Cincinnati",
        "state": "OH",
        "name": "Cincinnati, OH",
    },
    "detroit, mi": {
        "lat": 42.3314,
        "lng": -83.0458,
        "city": "Detroit",
        "state": "MI",
        "name": "Detroit, MI",
    },
    "louisville, ky": {
        "lat": 38.2527,
        "lng": -85.7585,
        "city": "Louisville",
        "state": "KY",
        "name": "Louisville, KY",
    },
    "atlanta, ga": {
        "lat": 33.7490,
        "lng": -84.3880,
        "city": "Atlanta",
        "state": "GA",
        "name": "Atlanta, GA",
    },
    "savannah, ga": {
        "lat": 32.0809,
        "lng": -81.0912,
        "city": "Savannah",
        "state": "GA",
        "name": "Savannah, GA",
    },
    "charlotte, nc": {
        "lat": 35.2271,
        "lng": -80.8431,
        "city": "Charlotte",
        "state": "NC",
        "name": "Charlotte, NC",
    },
    "jacksonville, fl": {
        "lat": 30.3322,
        "lng": -81.6557,
        "city": "Jacksonville",
        "state": "FL",
        "name": "Jacksonville, FL",
    },
    "orlando, fl": {
        "lat": 28.5383,
        "lng": -81.3792,
        "city": "Orlando",
        "state": "FL",
        "name": "Orlando, FL",
    },
    "miami, fl": {
        "lat": 25.7617,
        "lng": -80.1918,
        "city": "Miami",
        "state": "FL",
        "name": "Miami, FL",
    },
    "tampa, fl": {
        "lat": 27.9506,
        "lng": -82.4572,
        "city": "Tampa",
        "state": "FL",
        "name": "Tampa, FL",
    },
    "richmond, va": {
        "lat": 37.5407,
        "lng": -77.4360,
        "city": "Richmond",
        "state": "VA",
        "name": "Richmond, VA",
    },
    "newark, nj": {
        "lat": 40.7357,
        "lng": -74.1724,
        "city": "Newark",
        "state": "NJ",
        "name": "Newark, NJ",
    },
    "new york, ny": {
        "lat": 40.7128,
        "lng": -74.0060,
        "city": "New York",
        "state": "NY",
        "name": "New York, NY",
    },
    "philadelphia, pa": {
        "lat": 39.9526,
        "lng": -75.1652,
        "city": "Philadelphia",
        "state": "PA",
        "name": "Philadelphia, PA",
    },
    "pittsburgh, pa": {
        "lat": 40.4406,
        "lng": -79.9959,
        "city": "Pittsburgh",
        "state": "PA",
        "name": "Pittsburgh, PA",
    },
    "baltimore, md": {
        "lat": 39.2904,
        "lng": -76.6122,
        "city": "Baltimore",
        "state": "MD",
        "name": "Baltimore, MD",
    },
    "fredericksburg, va": {
        "lat": 38.3032,
        "lng": -77.4605,
        "city": "Fredericksburg",
        "state": "VA",
        "name": "Fredericksburg, VA",
    },
    "cherry hill, nj": {
        "lat": 39.9348,
        "lng": -75.0307,
        "city": "Cherry Hill",
        "state": "NJ",
        "name": "Cherry Hill, NJ",
    },
    "washington, dc": {
        "lat": 38.9072,
        "lng": -77.0369,
        "city": "Washington",
        "state": "DC",
        "name": "Washington, DC",
    },
    "boston, ma": {
        "lat": 42.3601,
        "lng": -71.0589,
        "city": "Boston",
        "state": "MA",
        "name": "Boston, MA",
    },
    "minneapolis, mn": {
        "lat": 44.9778,
        "lng": -93.2650,
        "city": "Minneapolis",
        "state": "MN",
        "name": "Minneapolis, MN",
    },
    "milwaukee, wi": {
        "lat": 43.0389,
        "lng": -87.9065,
        "city": "Milwaukee",
        "state": "WI",
        "name": "Milwaukee, WI",
    },
    "omaha, ne": {
        "lat": 41.2565,
        "lng": -95.9345,
        "city": "Omaha",
        "state": "NE",
        "name": "Omaha, NE",
    },
}

_GEOCODE_CACHE: Dict[str, Dict[str, Any]] = {}


def geocode_location(query: str) -> Dict[str, Any]:
    """
    Geocodes a place name or address into coordinates and standard metadata.
    Returns:
    {
        "lat": float,
        "lng": float,
        "city": str,
        "state": str,
        "display_name": str
    }
    """
    clean_q = query.strip().lower()
    clean_q = re.sub(r"\s+", " ", clean_q)

    # 1. Check in-memory cache
    if clean_q in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[clean_q]

    # 2. Check US freight hubs preset
    if clean_q in US_LOGISTICS_HUBS:
        data = US_LOGISTICS_HUBS[clean_q]
        res = {
            "lat": data["lat"],
            "lng": data["lng"],
            "city": data["city"],
            "state": data["state"],
            "display_name": data["name"],
        }
        _GEOCODE_CACHE[clean_q] = res
        return res

    for hub_key, data in US_LOGISTICS_HUBS.items():
        if hub_key in clean_q or clean_q in hub_key:
            res = {
                "lat": data["lat"],
                "lng": data["lng"],
                "city": data["city"],
                "state": data["state"],
                "display_name": data["name"],
            }
            _GEOCODE_CACHE[clean_q] = res
            return res

    # 3. Query OpenStreetMap Nominatim API
    try:
        url = "https://nominatim.openstreetmap.org/search"
        headers = {
            "User-Agent": "TruckDriverGuideService/1.0 (commercial-hos-eld-app; support@truckguide.internal)"
        }
        params = {"q": query, "format": "json", "addressdetails": 1, "limit": 1}
        response = requests.get(url, params=params, headers=headers, timeout=5)
        if response.status_code == 200:
            results = response.json()
            if results:
                item = results[0]
                addr = item.get("address", {})
                city = (
                    addr.get("city")
                    or addr.get("town")
                    or addr.get("village")
                    or addr.get("county")
                    or query.split(",")[0].strip()
                )
                state = addr.get("state") or addr.get("state_code") or ""
                # Convert full state names or abbreviations
                display_name = item.get("display_name", query)
                short_name = f"{city}, {state}" if state else city

                res = {
                    "lat": float(item["lat"]),
                    "lng": float(item["lon"]),
                    "city": city,
                    "state": state[:2].upper() if len(state) <= 3 else state,
                    "display_name": short_name,
                }
                _GEOCODE_CACHE[clean_q] = res
                return res
    except Exception as e:
        print(f"Nominatim geocode exception: {e}")

    # Fallback to coordinate extraction or default if parsing fails
    coord_match = re.search(r"(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)", query)
    if coord_match:
        lat, lng = float(coord_match.group(1)), float(coord_match.group(2))
        res = {
            "lat": lat,
            "lng": lng,
            "city": "Waypoint",
            "state": "US",
            "display_name": f"{lat:.4f}, {lng:.4f}",
        }
        _GEOCODE_CACHE[clean_q] = res
        return res

    # Default fallback to center of US (Lebanon, KS or Kansas City)
    return {
        "lat": 39.0997,
        "lng": -94.5786,
        "city": query.title(),
        "state": "US",
        "display_name": query.title(),
    }
