# TruckLogix: Commercial Truck Driver Guide & ELD Service

A full-stack logistics and Hours of Service (HOS) route planning web application built with **Django REST Framework** and **React**. Designed strictly around **FMCSA 49 CFR Part 395 regulations** for property-carrying commercial drivers under the 70-hour / 8-day rule.

![TruckLogix Banner](https://img.shields.io/badge/FMCSA-Part%20395%20Compliant-blue?style=for-the-badge)
![Full-Stack](https://img.shields.io/badge/Stack-Django%20%2B%20React-10b981?style=for-the-badge)
![Map](https://img.shields.io/badge/Map-Leaflet%20%2B%20OSM-orange?style=for-the-badge)

---

## 🎯 Project Objectives & Requirements Fulfillments

1. **Mandatory Inputs**:
   - **Current Location** (Origin / Driver Starting Terminal)
   - **Pickup Location** (Shipper Facility with 1.0 hr On-Duty Loading)
   - **Dropoff Location** (Receiver Consignee Facility with 1.0 hr On-Duty Unloading)
   - **Current Cycle Used (Hours)** (Dual interactive slider + numeric input, up to 70.0 hrs)
   - *Driver & Carrier Information* (Driver Name, Carrier Name & Office Address, Truck #, Trailer #, Shipping Doc / BOL #)

2. **Core Outputs**:
   - **Interactive Route Map** (Powered by **Leaflet & OpenStreetMap** free public tiles):
     - Interactive route polyline with glow effect.
     - Custom visual markers for Origin (🚛), Pickup (📦), Fuel Stops (⛽), 30-min Rest Breaks (☕), 10-hr Sleeper Berth Resets (🛏️), 34-hr Cycle Restarts (🔄), and Dropoff (🏁).
     - Interactive popups with ETA, scheduled stop duration, and duty description.
     - Map Legend overlay & click-to-pan/zoom functionality from itinerary stops and route instructions.
   - **Turn-by-Turn Route Instructions & Driver Guidance**:
     - Step-by-step navigation instructions detailing highway corridors, mileposts, pre-trip DVIR walkaround, check-in/loading, en-route rest/fueling stops, unloading, and shift closeout.
   - **FMCSA Daily Log Sheets (RODS - Record of Duty Status)**:
     - High-fidelity **24-hour graph grid** drawn with vector SVG step-line (Midnight to Midnight).
     - 4 Standard Duty Status Rows: **1. Off Duty (OFF)**, **2. Sleeper Berth (SB)**, **3. Driving (D)**, **4. On Duty Not Driving (ON)**.
     - Strict mathematical invariant: **every daily sheet sums to exactly 24.00 hours**.
     - Location callout annotations on the grid with time ticks.
     - Remarks table with event timestamps, status badges, locations, and descriptions.
     - Driver certification signature block and 70-hour / 8-day rolling recap table.
     - **Multi-day trip support** with individual Day tabs (Day 1, Day 2, Day 3...) and "View All Days" mode.
     - **Export to Vector SVG** and **Print-Ready Stylesheet** (`@media print` formatted for standard 8.5x11 PDF/paper).

3. **Regulatory Assumptions (FMCSA Part 395 Compliance)**:
   - **11-Hour Driving Limit** (§ 395.3(a)(3)): Cannot drive more than 11 hours following 10 consecutive hours off duty.
   - **14-Hour Duty Window** (§ 395.3(a)(2)): Cannot drive past the 14th consecutive hour after coming on duty.
   - **30-Minute Rest Break** (§ 395.3(a)(3)(ii)): Mandatory 30-minute interruption before exceeding 8 cumulative driving hours.
   - **70-Hour / 8-Day Limit & 34-Hour Restart** (§ 395.3(b) & (c)): Mandatory 34-hour restart when weekly cycle limit is reached.
   - **Fueling Rule**: Scheduled at least once every 1,000 miles (30 min On-Duty).
   - **Shipper / Consignee Times**: 1.0 hour On-Duty for freight loading (Pickup) and 1.0 hour On-Duty for freight unloading (Dropoff).

---

## 🏗️ Architecture

```
Truck-Driver-Guide-Service/
├── django-backend/             # Python / Django REST API
│   ├── config/                 # Django settings, WSGI, URLs
│   ├── trip_planner/           # Core HOS & Routing application
│   │   ├── services/
│   │   │   ├── geocoding.py    # Fast in-memory US freight hubs + Nominatim fallback
│   │   │   ├── routing.py      # OSRM highway routing + Turn Instructions generator
│   │   │   ├── hos_simulator.py# FMCSA Part 395 continuous simulation engine
│   │   │   └── log_generator.py# 24-hr calendar day slicer & SVG step-point generator
│   │   ├── views.py            # REST endpoints (/api/plan-trip/, /api/sample-trips/)
│   │   └── tests.py            # Comprehensive automated test suite
│   └── requirements.txt        # Python backend dependencies
│
├── frontend-react/             # Modern React 19 + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── EldLogSheet.jsx         # FMCSA 24-hr vector grid, remarks, recap, SVG/Print
│   │   │   ├── MultiDayLogViewer.jsx   # Multi-day tabs & batch print controller
│   │   │   ├── RouteMap.jsx            # Interactive Leaflet & OpenStreetMap visualizer
│   │   │   ├── RouteInstructions.jsx  # Turn-by-turn navigation & driver checklist
│   │   │   ├── StopsList.jsx           # Toggleable Itinerary & Route Instructions
│   │   │   ├── TripForm.jsx            # Inputs, dual slider/numeric input, quick city chips
│   │   │   ├── TripStats.jsx           # KPI metrics (distance, driving, fuel stops, resets)
│   │   │   ├── HosRulesModal.jsx       # FMCSA Part 395 reference modal
│   │   │   └── Navbar.jsx              # App header and actions
│   │   ├── utils/
│   │   │   └── clientHosSimulator.js   # Client-side fallback calculation engine
│   │   ├── App.jsx                     # Main state & view controller
│   │   └── index.css                   # Premium dark logistics theme & print rules
│   └── package.json
│
├── LOOM_WALKTHROUGH_SCRIPT.md  # 3-5 minute video presentation script
├── vercel.json                 # Vercel deployment configuration
└── README.md                   # Documentation
```

---

## 🚀 Quickstart (Local Development)

### 1. Run the Django Backend

```bash
cd django-backend

# 1. Activate virtual environment (or create one with: python3 -m venv venv)
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run automated tests
python manage.py test

# 4. Start the Django API server (runs at http://localhost:8000)
python manage.py runserver 8000
```

### 2. Run the React Frontend

In a new terminal:

```bash
cd frontend-react

# 1. Install dependencies
npm install

# 2. Start the Vite development server (runs at http://localhost:5173)
npm run dev
```

Open your browser at **http://localhost:5173** to interact with the application.

---

## 🌐 Live Hosted Version on Vercel

The application is pre-configured for instant deployment on [Vercel](https://vercel.com).

### Quick Deployment via Vercel CLI:
```bash
npm install -g vercel
vercel
```

Or connect this repository directly on the Vercel Web Dashboard:
- **Root Directory**: Select `frontend-react` (or project root with the included `vercel.json`).
- **Framework Preset**: `Vite`.
- **Node.js Version**: `20.x` or `22.x` (configured in `.nvmrc`).
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variable (Optional)**: `VITE_API_BASE_URL` pointing to your hosted Django backend (e.g. on Render / Railway).

> **High Availability Note**: If deployed standalone or if the backend server experiences a cold start on a free tier, the frontend automatically falls back to its built-in client HOS simulation engine so the live app never shows a broken screen.

---

## 🧪 Automated Testing

Run the Django backend automated test suite:

```bash
cd django-backend
./venv/bin/python manage.py test
```

Test coverage includes:
- `test_geocoding`: Fast hub lookup and coordinate extraction.
- `test_routing_and_haversine`: Haversine highway distance and geometry generation.
- `test_hos_simulation_fmcsa_limits`: 11-hour driving, 14-hour window, 30-minute break, 1,000-mile fueling, and strict 24.0-hour daily log sum.
- `test_plan_trip_api_endpoint`: End-to-end `/api/plan-trip/` POST request and response schema.
- `test_sample_trips_api_endpoint`: `/api/sample-trips/` preset catalog.
- `test_fmcsa_richmond_newark_stops`: Exact FMCSA guide page 18-19 validation (Fredericksburg fuel, Cherry Hill lunch).
- `test_short_route_no_infinite_loop`: Verifies micro-segment and short trip simulation termination.
- `test_34_hour_cycle_restart`: 70-hour cycle depletion triggering mandatory 34-hour restart.

---

## 📹 Loom Video Walkthrough

A structured 3-5 minute video script detailing the application walkthrough, regulatory accuracy, and code architecture is available in [`LOOM_WALKTHROUGH_SCRIPT.md`](./LOOM_WALKTHROUGH_SCRIPT.md).

---

## 📜 License & Compliance

Complies with the regulations established in **49 CFR Part 395** by the **Federal Motor Carrier Safety Administration (FMCSA)**, U.S. Department of Transportation.
