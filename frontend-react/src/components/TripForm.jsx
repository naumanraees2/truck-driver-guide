import React, { useState } from 'react';
import { MapPin, Navigation, Clock, Play, Sparkles, User, Building, Truck } from 'lucide-react';

export default function TripForm({
  formData,
  setFormData,
  onSubmit,
  loading,
  sampleTrips,
  onSelectSample
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCycleChange = (e) => {
    const val = parseFloat(e.target.value) || 0;
    setFormData((prev) => ({ ...prev, current_cycle_used: val }));
  };

  return (
    <div className="panel no-print">
      <div className="panel-title">
        <Navigation size={20} color="#3b82f6" />
        <span>Trip & Duty Parameters</span>
      </div>

      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <MapPin size={15} color="#94a3b8" />
            Current Location (Origin / Terminal)
          </label>
          <input
            type="text"
            name="current_location"
            className="input-field"
            value={formData.current_location}
            onChange={handleChange}
            placeholder="e.g. Richmond, VA or Ontario, CA"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <MapPin size={15} color="#10b981" />
            Pickup Location (1.0 Hr On-Duty Loading)
          </label>
          <input
            type="text"
            name="pickup_location"
            className="input-field"
            value={formData.pickup_location}
            onChange={handleChange}
            placeholder="e.g. Richmond, VA or Los Angeles, CA"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <MapPin size={15} color="#f43f5e" />
            Dropoff Location (1.0 Hr On-Duty Unloading)
          </label>
          <input
            type="text"
            name="dropoff_location"
            className="input-field"
            value={formData.dropoff_location}
            onChange={handleChange}
            placeholder="e.g. Newark, NJ or Dallas, TX"
            required
          />
        </div>

        {/* Quick Freight Hubs Chips */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
            Quick-fill popular destination:
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {['Newark, NJ', 'Dallas, TX', 'Miami, FL', 'Chicago, IL', 'Salt Lake City, UT', 'Atlanta, GA'].map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, dropoff_location: city }))}
                style={{
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#cbd5e1',
                  cursor: 'pointer'
                }}
              >
                + {city}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={15} color="#f59e0b" />
              Current Cycle Used (Hours)
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>FMCSA Limit: 70h / 8-day</span>
          </label>
          <div className="range-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="range"
              min="0"
              max="70"
              step="0.5"
              className="range-slider"
              value={formData.current_cycle_used}
              onChange={handleCycleChange}
              style={{ flex: 1 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <input
                type="number"
                min="0"
                max="70"
                step="0.5"
                value={formData.current_cycle_used}
                onChange={handleCycleChange}
                style={{
                  width: '64px',
                  padding: '0.25rem 0.4rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#93c5fd',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>hrs</span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', fontSize: '0.8rem', padding: '0.45rem' }}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? '▲ Hide Driver & Carrier Details' : '▼ Edit Driver & Carrier Info (Optional)'}
          </button>
        </div>

        {showAdvanced && (
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Driver Name</label>
              <input
                type="text"
                name="driver_name"
                className="input-field"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                value={formData.driver_name}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Carrier Name & Office</label>
              <input
                type="text"
                name="carrier_name"
                className="input-field"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                value={formData.carrier_name}
                onChange={handleChange}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Truck / Tractor #</label>
                <input
                  type="text"
                  name="truck_number"
                  className="input-field"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                  value={formData.truck_number}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Trailer #</label>
                <input
                  type="text"
                  name="trailer_number"
                  className="input-field"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                  value={formData.trailer_number}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.85rem' }}
          disabled={loading}
        >
          {loading ? (
            <span>Calculating Route & HOS Simulation...</span>
          ) : (
            <>
              <Play size={18} fill="#ffffff" />
              <span>Plan Trip & Generate ELD Logs</span>
            </>
          )}
        </button>
      </form>

      {/* Quick Presets */}
      <div style={{ marginTop: '1.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
          <Sparkles size={16} color="#3b82f6" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Quick Route Scenarios
          </span>
        </div>

        <div className="preset-list">
          {sampleTrips && sampleTrips.map((s) => (
            <button
              key={s.id}
              type="button"
              className="preset-btn"
              onClick={() => onSelectSample(s)}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.title}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Cycle Used: {s.current_cycle_used}h
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 700 }}>Load →</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
