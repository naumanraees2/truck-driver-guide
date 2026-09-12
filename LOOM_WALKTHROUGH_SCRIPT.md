# 3-5 Minute Loom Video Walkthrough Script

Use this script and guide to record your **3 to 5 minute Loom presentation** for the Truck Driver Guide & ELD Service project.

---

## ⏱️ Timeline & Section Breakdown

| Segment | Timestamp | Topic | Screen Focus |
|---|---|---|---|
| **1. Introduction** | 0:00 - 0:35 | Project Overview & Goals | App Landing Page & Navbar |
| **2. Trip Planning & Map** | 0:35 - 1:40 | Inputs, Interactive Route Map & Stops | Form inputs, Leaflet map, Popups |
| **3. Route Instructions** | 1:40 - 2:20 | Turn-by-Turn Guide & Operational Steps | Route Instructions tab |
| **4. ELD Daily Log Sheets** | 2:20 - 3:30 | Multi-Day Vector Grid, 24h Strict Sum, SVG/Print | Log sheets, SVG export, Print dialog |
| **5. Code & Architecture** | 3:30 - 4:40 | Django Backend & React Implementation | VS Code / IDE code walkthrough |
| **6. Conclusion** | 4:40 - 5:00 | Summary & Live Deployment | Vercel hosted link & wrap-up |

---

## 🎙️ Spoken Script

### 1. Introduction (0:00 - 0:35)
> *"Hello everyone! Welcome to this walkthrough of the Truck Driver Guide and FMCSA ELD Daily Log Service. Today, I'm showcasing a full-stack web application built using Django REST Framework on the backend and React with Vite on the frontend. The objective of this project is to take commercial driver trip parameters—including origin, pickup, dropoff, and current cycle hours used—and generate both accurate route navigation instructions and official FMCSA Part 395 24-hour daily log sheets."*

### 2. Live Demo: Trip Inputs & Interactive Map (0:35 - 1:40)
*(Screen: Show the form on the left and the map on the right)*
> *"Let's take a look at the live user interface. On the left, drivers input their Current Location, Pickup Location with 1 hour allocated for loading, Dropoff Location with 1 hour allocated for unloading, and their Current Cycle Used against the 70-hour / 8-day limit.*
>
> *We have quick presets here, including the exact official FMCSA Richmond, VA to Newark, NJ sample from Page 18-19 of the FMCSA guide, as well as multi-day cross-country long-hauls like Los Angeles to Dallas.*
>
> *On the right, we render an interactive map powered by Leaflet and OpenStreetMap public tiles. You can see the full route polyline, along with custom visual markers for every waypoint and scheduled stop: green for shipper pickup, cyan for commercial fueling, yellow for the mandatory 30-minute rest break, purple for the 10-hour sleeper berth reset, and checkered flag for the consignee dropoff.*
>
> *Clicking on any marker or stop in our itinerary displays its ETA, duration, and duty description, and smoothly centers the camera."*

### 3. Turn-by-Turn Route Instructions (1:40 - 2:20)
*(Screen: Click the "Route Instructions" tab in the itinerary panel)*
> *"Here, we've provided dedicated Turn-by-Turn Route Instructions. It outlines the commercial highway corridors, mileposts, and driver operational checklist—beginning with the mandatory 49 CFR Part 396 pre-trip vehicle walkaround, inbound transit, shipper dock check-in, highway driving segments, en-route fueling stops, and concluding with receiver delivery and the post-trip DVIR report."*

### 4. FMCSA Daily ELD Log Sheets (RODS) (2:20 - 3:30)
*(Screen: Scroll down to the FMCSA Daily Log Sheets section. Switch between Day 1, Day 2, Day 3)*
> *"Now let's examine the primary deliverable: the Daily Log Sheets. Commercial property-carrying drivers must log duty status across four official rows: Off Duty, Sleeper Berth, Driving, and On Duty Not Driving.*
>
> *Our engine dynamically draws the crisp vector SVG step-line across the 24-hour grid from midnight to midnight, complete with quarter-hour and half-hour ticks. Notice that on every single day, the totals strictly sum to exactly 24.00 hours.*
>
> *Beneath the grid, we provide location callout pointers, a detailed Remarks and Change-of-Duty table with timestamps, the driver's signature certification block, and the official 70-hour / 8-day rolling recap.*
>
> *For multi-day trips like Los Angeles to Dallas, the system generates separate discrete sheets for Day 1, Day 2, and Day 3. Drivers can download any sheet as a standalone vector SVG or click 'Print All Logs' to generate a print-ready 8.5x11 PDF."*

### 5. Codebase Walkthrough (3:30 - 4:40)
*(Screen: Switch to your code editor showing the directory structure)*
> *"Now let's take a quick look under the hood at the code architecture.*
>
> *In `django-backend`, we organized the logic into modular services:
> - In `hos_simulator.py`, we implemented a continuous time-advancing HOS simulation engine that tracks the driver's driving clock, 14-hour window, 8-hour break rule, and 70-hour rolling cycle. It automatically inserts fueling stops every 1,000 miles, 30-minute rest breaks, 10-hour sleeper berth resets, and 34-hour cycle restarts when needed.
> - In `log_generator.py`, we slice the continuous multi-day timeline into 24-hour calendar days (midnight to midnight), calculating exact totals and SVG step coordinates.
> - In `routing.py`, we handle highway distance, polyline geometry, and step-by-step route instructions.
>
> *On the frontend in `frontend-react`, we have modern modular React components: `RouteMap` using Leaflet, `EldLogSheet` with responsive SVG rendering, and `StopsList` with view switching. We also created a client-side fallback calculation engine in `clientHosSimulator.js` to ensure the live application on Vercel remains highly available even during backend cold starts.*
>
> *All unit tests pass with `python manage.py test`, covering geocoding, routing, HOS limits, and short-route edge cases."*

### 6. Conclusion (4:40 - 5:00)
*(Screen: Return to the live hosted application in the browser)*
> *"The frontend is live and hosted on Vercel, and the entire clean codebase is tracked in GitHub with complete setup instructions in the README. Thank you for your time, and I look forward to your feedback!"*

---

## 💡 Quick Tips for Recording
1. Keep the browser window maximized at 1080p (1920x1080) for clear text on the ELD grid.
2. Demonstrate clicking one of the preset buttons (e.g. Richmond -> Newark or LA -> Dallas) to show real-time calculation.
3. Show the "Print Sheets" button opening the print dialog, and demonstrate "Save SVG" downloading a vector file.

