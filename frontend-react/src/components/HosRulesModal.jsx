import React from 'react';
import { X, ShieldAlert, CheckCircle2, Info } from 'lucide-react';

export default function HosRulesModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }} onClick={onClose}>
      <div style={{
        background: '#111827',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        maxWidth: '720px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
        color: '#f8fafc',
        padding: '2rem',
        position: 'relative'
      }} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={22} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <ShieldAlert size={28} color="#3b82f6" />
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>
            FMCSA Hours of Service (HOS) Part 395 Guide
          </h2>
        </div>

        <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1.5rem', lineHeight: '1.6' }}>
          Rules applied by the TruckLogix planning engine for property-carrying commercial motor vehicles operating under the 70-hour / 8-day rule:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#38bdf8' }}>
              <CheckCircle2 size={16} />
              11-Hour Driving Limit (§ 395.3(a)(3))
            </div>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.35rem' }}>
              May drive a maximum of 11 cumulative hours after 10 consecutive hours off duty or sleeper berth.
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#fbbf24' }}>
              <CheckCircle2 size={16} />
              14-Hour Driving Window (§ 395.3(a)(2))
            </div>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.35rem' }}>
              May not drive past the 14th consecutive hour after coming on duty, following 10 consecutive hours off duty. Off-duty time does not extend the 14-hour clock.
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#34d399' }}>
              <CheckCircle2 size={16} />
              30-Minute Mandatory Rest Break (§ 395.3(a)(3)(ii))
            </div>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.35rem' }}>
              Driving is not permitted if more than 8 consecutive/cumulative hours of driving have passed without at least a 30-minute interruption (off-duty, sleeper berth, or on-duty fueling/inspection).
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#a78bfa' }}>
              <CheckCircle2 size={16} />
              70-Hour / 8-Day Limit (§ 395.3(b)) & 34-Hour Restart (§ 395.3(c))
            </div>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.35rem' }}>
              May not drive after 70 hours on duty in any 8 consecutive days. Any 34 consecutive hours off duty or in sleeper berth completely resets the 70-hour clock back to zero.
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#f472b6' }}>
              <CheckCircle2 size={16} />
              Fueling & Shipper/Receiver Assumptions
            </div>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.35rem' }}>
              • Fueling scheduled at least once every 1,000 miles (30 min On-Duty).<br />
              • Pickup: 1.0 hour On-Duty (Not Driving) for freight loading and BOL paperwork.<br />
              • Dropoff: 1.0 hour On-Duty (Not Driving) for freight unloading and consignee sign-off.<br />
              • Daily Log Sheet: Strictly 24.0 hours per calendar day grid (FMCSA RODS form).
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={onClose}>
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
