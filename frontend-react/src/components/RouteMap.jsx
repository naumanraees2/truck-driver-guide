import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function RouteMap({ waypoints, route, stops, focusedLocation }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Destroy existing map if present
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Default center of US
    const defaultCenter = [39.8283, -98.5795];
    const map = L.map(mapRef.current, {
      center: defaultCenter,
      zoom: 4,
      scrollWheelZoom: true,
      zoomControl: true
    });
    mapInstanceRef.current = map;
    markersRef.current = [];

    // Free OpenStreetMap CartoDB / OSM tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    // Helpers to create custom HTML markers
    const createCustomIcon = (bgColor, symbol, label) => {
      return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="
            background: ${bgColor};
            color: #ffffff;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 13px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.5);
            border: 2px solid #ffffff;
            cursor: pointer;
            transition: transform 0.2s ease;
          ">
            ${symbol}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18]
      });
    };

    const bounds = L.latLngBounds([]);

    // 1. Plot Waypoints (Current, Pickup, Dropoff)
    if (waypoints && waypoints.length > 0) {
      waypoints.forEach((w) => {
        let color = '#3b82f6';
        let symbol = '•';
        if (w.role === 'current') {
          color = '#2563eb';
          symbol = '🚛';
        } else if (w.role === 'pickup') {
          color = '#10b981';
          symbol = '📦';
        } else if (w.role === 'dropoff') {
          color = '#f43f5e';
          symbol = '🏁';
        }

        const marker = L.marker([w.lat, w.lng], {
          icon: createCustomIcon(color, symbol, w.label)
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 13px; min-width: 180px;">
            <strong style="color: ${color}; font-size: 14px;">${w.label || w.display_name}</strong>
            <p style="margin: 4px 0 0 0; color: #475569;">${w.display_name || ''}</p>
          </div>
        `);

        markersRef.current.push({ lat: w.lat, lng: w.lng, name: w.label, marker });
        bounds.extend([w.lat, w.lng]);
      });
    }

    // 2. Plot Route Polyline
    if (route && route.coordinates && route.coordinates.length > 0) {
      const latlngs = route.coordinates.map((c) => [c[0], c[1]]);
      
      // Background glow line
      L.polyline(latlngs, {
        color: '#1d4ed8',
        weight: 7,
        opacity: 0.5,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Main vibrant route line
      L.polyline(latlngs, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      latlngs.forEach((pt) => bounds.extend(pt));
    }

    // 3. Plot Stops (Fuel, 30m break, 10h sleeper, 34h restart)
    if (stops && stops.length > 0) {
      stops.forEach((s) => {
        if (!s.lat || !s.lng) return;

        let color = '#64748b';
        let symbol = '🛑';
        if (s.type === 'fuel_stop') {
          color = '#06b6d4';
          symbol = '⛽';
        } else if (s.type === 'break_30m') {
          color = '#f59e0b';
          symbol = '☕';
        } else if (s.type === 'rest_10h') {
          color = '#8b5cf6';
          symbol = '🛏️';
        } else if (s.type === 'restart_34h') {
          color = '#4c1d95';
          symbol = '🔄';
        } else if (s.type === 'pickup' || s.type === 'dropoff') {
          return; // already handled in waypoints
        }

        const marker = L.marker([s.lat, s.lng], {
          icon: createCustomIcon(color, symbol, s.name)
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 13px; max-width: 230px;">
            <strong style="color: ${color}; font-size: 14px;">${s.name}</strong>
            <div style="margin: 4px 0; color: #1e293b; font-weight: 700;">ETA: ${s.eta}</div>
            <div style="color: #64748b; font-size: 12px; margin-bottom: 4px;">Duration: ${s.duration_hours}h</div>
            <p style="margin: 0; color: #475569; font-size: 12px; line-height: 1.3;">${s.description}</p>
          </div>
        `);

        markersRef.current.push({ lat: s.lat, lng: s.lng, name: s.name, marker });
        bounds.extend([s.lat, s.lng]);
      });
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [waypoints, route, stops]);

  // Handle focusing when a stop/location is clicked
  useEffect(() => {
    if (!focusedLocation || !mapInstanceRef.current) return;
    const { lat, lng } = focusedLocation;
    if (lat && lng) {
      mapInstanceRef.current.flyTo([lat, lng], 10, { duration: 1.2 });
      // Find matching marker and open its popup
      const found = markersRef.current.find(
        (m) => Math.abs(m.lat - lat) < 0.05 && Math.abs(m.lng - lng) < 0.05
      );
      if (found && found.marker) {
        found.marker.openPopup();
      }
    }
  }, [focusedLocation]);

  return (
    <div className="map-panel" style={{ position: 'relative' }}>
      <div id="route-map" ref={mapRef} style={{ height: '420px', width: '100%', borderRadius: '12px' }} />

      {/* Floating Map Legend */}
      <div
        className="no-print"
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '8px',
          padding: '0.5rem 0.75rem',
          display: 'flex',
          gap: '0.85rem',
          fontSize: '0.72rem',
          fontWeight: 600,
          color: '#cbd5e1',
          flexWrap: 'wrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
        }}
      >
        <span>🚛 Current</span>
        <span>📦 Pickup (1h)</span>
        <span>⛽ Fuel (&le;1,000mi)</span>
        <span>☕ 30m Rest</span>
        <span>🛏️ 10h Sleeper</span>
        <span>🏁 Dropoff (1h)</span>
      </div>
    </div>
  );
}

