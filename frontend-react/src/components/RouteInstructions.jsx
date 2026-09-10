import React from 'react';
import {
  Navigation,
  Compass,
  MapPin,
  Clock,
  Fuel,
  Coffee,
  Moon,
  PackageCheck,
  Flag,
  Wrench,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

export default function RouteInstructions({ instructions, onSelectInstruction }) {
  if (!instructions || instructions.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No route instructions available. Plan a trip to view turn-by-turn guidance.
      </div>
    );
  }

  const getStepIcon = (type) => {
    switch (type) {
      case 'inspect':
        return { icon: <Wrench size={16} color="#f59e0b" />, bg: 'rgba(245, 158, 11, 0.15)' };
      case 'drive':
        return { icon: <Navigation size={16} color="#3b82f6" />, bg: 'rgba(59, 130, 246, 0.15)' };
      case 'pickup':
        return { icon: <PackageCheck size={16} color="#10b981" />, bg: 'rgba(16, 185, 129, 0.15)' };
      case 'dropoff':
        return { icon: <Flag size={16} color="#f43f5e" />, bg: 'rgba(244, 63, 94, 0.15)' };
      case 'fuel':
        return { icon: <Fuel size={16} color="#06b6d4" />, bg: 'rgba(6, 182, 212, 0.15)' };
      case 'rest':
        return { icon: <Coffee size={16} color="#f59e0b" />, bg: 'rgba(245, 158, 11, 0.15)' };
      case 'sleeper':
      case 'restart':
        return { icon: <Moon size={16} color="#8b5cf6" />, bg: 'rgba(139, 92, 246, 0.15)' };
      default:
        return { icon: <Compass size={16} color="#94a3b8" />, bg: 'rgba(148, 163, 184, 0.15)' };
    }
  };

  const getDutyBadgeColor = (status) => {
    switch (status) {
      case 'D':
        return { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399', border: 'rgba(16, 185, 129, 0.4)' };
      case 'ON':
        return { bg: 'rgba(245, 158, 11, 0.2)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.4)' };
      case 'SB':
        return { bg: 'rgba(139, 92, 246, 0.2)', text: '#c084fc', border: 'rgba(139, 92, 246, 0.4)' };
      case 'OFF':
        return { bg: 'rgba(100, 116, 139, 0.2)', text: '#94a3b8', border: 'rgba(100, 116, 139, 0.4)' };
      default:
        return { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.4)' };
    }
  };

  return (
    <div className="instructions-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {instructions.map((step, idx) => {
        const { icon, bg } = getStepIcon(step.type);
        const badge = getDutyBadgeColor(step.duty_status);

        return (
          <div
            key={idx}
            className="instruction-card"
            onClick={() => onSelectInstruction && onSelectInstruction(step)}
            style={{
              display: 'flex',
              gap: '0.85rem',
              padding: '0.85rem 1rem',
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '10px',
              cursor: onSelectInstruction ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
              e.currentTarget.style.background = 'rgba(30, 41, 59, 0.75)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.65)';
            }}
          >
            {/* Step Number & Icon */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {icon}
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                #{step.step_number}
              </span>
            </div>

            {/* Instruction Body */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {step.title}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  {step.duty_status && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        background: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`,
                      }}
                    >
                      {step.duty_status}
                    </span>
                  )}
                  {step.duration && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-mono)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {step.duration}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#93c5fd', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <MapPin size={12} />
                <span>{step.location}</span>
                {step.distance_miles > 0 && (
                  <span style={{ color: 'var(--text-muted)' }}>
                    • Mile {step.distance_miles}
                  </span>
                )}
              </div>

              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '0.35rem', lineHeight: '1.4' }}>
                {step.instruction}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
