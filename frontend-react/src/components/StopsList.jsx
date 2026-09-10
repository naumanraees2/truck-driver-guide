import React, { useState } from 'react';
import { ListOrdered, Fuel, Coffee, Moon, PackageCheck, Flag, RotateCcw, Navigation } from 'lucide-react';
import RouteInstructions from './RouteInstructions';

export default function StopsList({ stops, routeInstructions, onSelectStop }) {
  const [activeTab, setActiveTab] = useState('stops'); // 'stops' or 'instructions'

  if (!stops || stops.length === 0) {
    return (
      <div className="panel" style={{ height: '100%', minHeight: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Configure trip parameters and click "Plan Trip" to see itinerary stops and route instructions.
        </p>
      </div>
    );
  }

  const getStopIcon = (type) => {
    switch (type) {
      case 'fuel_stop':
        return { icon: <Fuel size={18} color="#06b6d4" />, bg: 'rgba(6, 182, 212, 0.15)' };
      case 'break_30m':
        return { icon: <Coffee size={18} color="#f59e0b" />, bg: 'rgba(245, 158, 11, 0.15)' };
      case 'rest_10h':
        return { icon: <Moon size={18} color="#8b5cf6" />, bg: 'rgba(139, 92, 246, 0.15)' };
      case 'restart_34h':
        return { icon: <RotateCcw size={18} color="#ec4899" />, bg: 'rgba(236, 72, 153, 0.15)' };
      case 'pickup':
        return { icon: <PackageCheck size={18} color="#10b981" />, bg: 'rgba(16, 185, 129, 0.15)' };
      case 'dropoff':
        return { icon: <Flag size={18} color="#f43f5e" />, bg: 'rgba(244, 63, 94, 0.15)' };
      default:
        return { icon: <ListOrdered size={18} color="#3b82f6" />, bg: 'rgba(59, 130, 246, 0.15)' };
    }
  };

  return (
    <div className="panel" style={{ minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header & Tab Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="panel-title" style={{ margin: 0 }}>
          {activeTab === 'stops' ? (
            <>
              <ListOrdered size={20} color="#3b82f6" />
              <span>Itinerary Stops & Schedule ({stops.length})</span>
            </>
          ) : (
            <>
              <Navigation size={20} color="#3b82f6" />
              <span>Turn-by-Turn Route Guide ({routeInstructions?.length || 0})</span>
            </>
          )}
        </div>

        {/* Segmented View Switcher */}
        <div style={{
          display: 'inline-flex',
          background: 'rgba(15, 23, 42, 0.8)',
          padding: '3px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('stops')}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'stops' ? '#2563eb' : 'transparent',
              color: activeTab === 'stops' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.2s ease',
            }}
          >
            Stops ({stops.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('instructions')}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'instructions' ? '#2563eb' : 'transparent',
              color: activeTab === 'instructions' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.2s ease',
            }}
          >
            Route Instructions ({routeInstructions?.length || 0})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="stops-list" style={{ flex: 1, maxHeight: '460px', overflowY: 'auto' }}>
        {activeTab === 'stops' ? (
          stops.map((stop, idx) => {
            const { icon, bg } = getStopIcon(stop.type);
            return (
              <div
                key={idx}
                className="stop-item"
                onClick={() => onSelectStop && onSelectStop(stop)}
                style={{ cursor: onSelectStop ? 'pointer' : 'default' }}
                title="Click to zoom on map"
              >
                <div className="stop-icon" style={{ background: bg }}>
                  {icon}
                </div>
                <div className="stop-info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="stop-title">{stop.name}</div>
                    <span style={{
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      color: '#93c5fd',
                      background: 'rgba(59, 130, 246, 0.1)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px'
                    }}>
                      {stop.duration_hours}h
                    </span>
                  </div>
                  <div className="stop-meta">
                    <span>📍 {stop.location}</span>
                    <span>⏰ ETA: {stop.eta}</span>
                  </div>
                  <div className="stop-desc">{stop.description}</div>
                </div>
              </div>
            );
          })
        ) : (
          <RouteInstructions
            instructions={routeInstructions}
            onSelectInstruction={(inst) => {
              if (onSelectStop && inst.location) {
                // Find matching stop or waypoint
                const match = stops.find((s) => s.name === inst.title || s.location.includes(inst.location));
                if (match) onSelectStop(match);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

