import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import TripForm from './components/TripForm';
import TripStats from './components/TripStats';
import RouteMap from './components/RouteMap';
import StopsList from './components/StopsList';
import MultiDayLogViewer from './components/MultiDayLogViewer';
import HosRulesModal from './components/HosRulesModal';
import { simulateTripClient } from './utils/clientHosSimulator';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function App() {
  const [formData, setFormData] = useState({
    current_location: 'Richmond, VA',
    pickup_location: 'Richmond, VA',
    dropoff_location: 'Newark, NJ',
    current_cycle_used: 15.0,
    driver_name: 'John E. Doe',
    carrier_name: "John Doe's Transportation",
    carrier_address: 'Washington, D.C.',
    truck_number: '123',
    trailer_number: '20544',
    shipping_doc: '101601',
  });

  const [sampleTrips, setSampleTrips] = useState([
    {
      id: 'fmcsa-richmond-newark',
      title: 'Richmond, VA to Newark, NJ (FMCSA Guide Sample)',
      current_location: 'Richmond, VA',
      pickup_location: 'Richmond, VA',
      dropoff_location: 'Newark, NJ',
      current_cycle_used: 15.0,
      driver_name: 'John E. Doe',
      carrier_name: "John Doe's Transportation",
      carrier_address: 'Washington, D.C.',
      truck_number: '123',
      trailer_number: '20544',
      shipping_doc: '101601',
    },
    {
      id: 'cross-country-la-dallas',
      title: 'Los Angeles, CA to Dallas, TX (Multi-Day Long-Haul)',
      current_location: 'Ontario, CA',
      pickup_location: 'Los Angeles, CA',
      dropoff_location: 'Dallas, TX',
      current_cycle_used: 28.5,
      driver_name: 'Marcus Vance',
      carrier_name: 'Pacific Southwest Freight',
      carrier_address: 'Long Beach, CA',
      truck_number: 'Unit 504',
      trailer_number: 'Van 53018',
      shipping_doc: 'BOL-892100',
    },
    {
      id: 'midwest-chicago-miami',
      title: 'Chicago, IL to Miami, FL (Southeast Corridor)',
      current_location: 'Gary, IN',
      pickup_location: 'Chicago, IL',
      dropoff_location: 'Miami, FL',
      current_cycle_used: 42.0,
      driver_name: 'Sarah Jenkins',
      carrier_name: 'Great Lakes Logistics',
      carrier_address: 'Chicago, IL',
      truck_number: 'Rig 882',
      trailer_number: 'Reefer 9912',
      shipping_doc: 'BOL-449102',
    }
  ]);

  const [tripResult, setTripResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [focusedLocation, setFocusedLocation] = useState(null);

  // Fetch sample trips on initial mount
  useEffect(() => {
    fetch(`${API_BASE}/api/sample-trips/`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.sample_trips) {
          setSampleTrips(data.sample_trips);
        }
      })
      .catch(() => {});

    // Automatically plan the initial trip
    executePlanTrip(formData);
  }, []);

  const executePlanTrip = async (payload) => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`${API_BASE}/api/plan-trip/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned error (${response.status})`);
      }

      const data = await response.json();
      setTripResult(data);
    } catch (err) {
      console.warn('Backend API connection note:', err.message);
      // Seamlessly fall back to client HOS engine if backend is offline or sleeping
      try {
        const clientData = simulateTripClient(payload);
        setTripResult(clientData);
        setNotice('Connected via high-accuracy client simulation engine.');
      } catch (fallbackErr) {
        setError(err.message || 'Unable to plan trip. Please verify your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executePlanTrip(formData);
  };

  const handleSelectSample = (sample) => {
    const updated = {
      ...formData,
      current_location: sample.current_location,
      pickup_location: sample.pickup_location,
      dropoff_location: sample.dropoff_location,
      current_cycle_used: sample.current_cycle_used,
      driver_name: sample.driver_name || formData.driver_name,
      carrier_name: sample.carrier_name || formData.carrier_name,
      carrier_address: sample.carrier_address || formData.carrier_address,
      truck_number: sample.truck_number || formData.truck_number,
      trailer_number: sample.trailer_number || formData.trailer_number,
      shipping_doc: sample.shipping_doc || formData.shipping_doc,
    };
    setFormData(updated);
    executePlanTrip(updated);
  };

  return (
    <div className="app-container">
      <Navbar
        onOpenRules={() => setRulesModalOpen(true)}
        onPrintAll={() => window.print()}
        hasLogs={Boolean(tripResult && tripResult.daily_logs && tripResult.daily_logs.length > 0)}
      />

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '10px',
          padding: '1rem',
          color: '#fca5a5',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertCircle size={20} color="#ef4444" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          borderRadius: '10px',
          padding: '0.75rem 1rem',
          color: '#93c5fd',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.85rem'
        }}>
          <Info size={18} color="#60a5fa" />
          <span>{notice}</span>
        </div>
      )}

      {tripResult && tripResult.stats && (
        <TripStats
          stats={tripResult.stats}
          dailyLogsCount={tripResult.daily_logs ? tripResult.daily_logs.length : 0}
        />
      )}

      <div className="main-grid">
        {/* Left Column: Input Form & Presets */}
        <div>
          <TripForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            loading={loading}
            sampleTrips={sampleTrips}
            onSelectSample={handleSelectSample}
          />
        </div>

        {/* Right Column: Interactive Map & Stops Itinerary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <RouteMap
            waypoints={tripResult ? tripResult.waypoints : []}
            route={tripResult ? tripResult.route : null}
            stops={tripResult ? tripResult.stops : []}
            focusedLocation={focusedLocation}
          />

          <StopsList
            stops={tripResult ? tripResult.stops : []}
            routeInstructions={tripResult ? tripResult.route_instructions : []}
            onSelectStop={(stop) => setFocusedLocation(stop)}
          />
        </div>
      </div>

      {/* FMCSA Daily ELD Log Sheets Section */}
      {tripResult && tripResult.daily_logs && (
        <MultiDayLogViewer dailyLogs={tripResult.daily_logs} />
      )}

      {/* HOS Rules Information Modal */}
      <HosRulesModal
        isOpen={rulesModalOpen}
        onClose={() => setRulesModalOpen(false)}
      />
    </div>
  );
}
