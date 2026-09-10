import React from 'react';
import { Route, Gauge, Coffee, Fuel, Moon, Shield, Calendar, AlertTriangle } from 'lucide-react';

export default function TripStats({ stats, dailyLogsCount }) {
  if (!stats) return null;

  return (
    <div className="stats-grid no-print">
      <div className="stat-card" style={{ '--card-accent': '#3b82f6' }}>
        <div className="stat-label">Total Distance</div>
        <div className="stat-value">{Number(stats.total_distance_miles).toLocaleString()} <span style={{ fontSize: '0.9rem' }}>mi</span></div>
        <div className="stat-sub">Commercial highway route</div>
      </div>

      <div className="stat-card" style={{ '--card-accent': '#10b981' }}>
        <div className="stat-label">Total Driving Time</div>
        <div className="stat-value">{stats.total_driving_hours} <span style={{ fontSize: '0.9rem' }}>hrs</span></div>
        <div className="stat-sub">≤ 11h per shift limit</div>
      </div>

      <div className="stat-card" style={{ '--card-accent': '#f59e0b' }}>
        <div className="stat-label">On-Duty Time</div>
        <div className="stat-value">{stats.total_on_duty_hours} <span style={{ fontSize: '0.9rem' }}>hrs</span></div>
        <div className="stat-sub">Loading, fueling, pre/post</div>
      </div>

      <div className="stat-card" style={{ '--card-accent': '#8b5cf6' }}>
        <div className="stat-label">Daily Log Sheets</div>
        <div className="stat-value">{dailyLogsCount} <span style={{ fontSize: '0.9rem' }}>days</span></div>
        <div className="stat-sub">24-hr RODS calendar sheets</div>
      </div>

      <div className="stat-card" style={{ '--card-accent': '#06b6d4' }}>
        <div className="stat-label">Fuel Stops</div>
        <div className="stat-value">{stats.fuel_stops_count} <span style={{ fontSize: '0.9rem' }}>stops</span></div>
        <div className="stat-sub">≤ 1,000 mi requirement</div>
      </div>

      <div className="stat-card" style={{ '--card-accent': '#ec4899' }}>
        <div className="stat-label">30-Min Rest Breaks</div>
        <div className="stat-value">{stats.rest_breaks_count} <span style={{ fontSize: '0.9rem' }}>breaks</span></div>
        <div className="stat-sub">Every 8h driving rule</div>
      </div>

      <div className="stat-card" style={{ '--card-accent': '#6366f1' }}>
        <div className="stat-label">10-Hr Sleeper Resets</div>
        <div className="stat-value">{stats.sleeper_stops_count} <span style={{ fontSize: '0.9rem' }}>resets</span></div>
        <div className="stat-sub">11h drive / 14h window reset</div>
      </div>

      <div className="stat-card" style={{ '--card-accent': stats.cycle_hours_remaining < 10 ? '#f43f5e' : '#10b981' }}>
        <div className="stat-label">70-Hr Cycle Remaining</div>
        <div className="stat-value">{stats.cycle_hours_remaining} <span style={{ fontSize: '0.9rem' }}>hrs</span></div>
        <div className="stat-sub">{stats.restarts_count > 0 ? `${stats.restarts_count} restart(s) taken` : 'Available driving hours'}</div>
      </div>
    </div>
  );
}
