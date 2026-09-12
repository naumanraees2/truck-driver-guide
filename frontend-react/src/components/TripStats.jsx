import { Route, Gauge, Coffee, Fuel, Moon, Shield, Calendar, AlertTriangle } from 'lucide-react';

export default function TripStats({ stats, dailyLogsCount }) {
  if (!stats) return null;

  return (
    <div className="stats-grid no-print">
      <div className="stat-card" style={{ '--card-accent': '#3b82f6' }}>
        <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Route size={15} color="#3b82f6" />
          <span>Total Distance</span>
        </div>
        <div className="stat-value">{Number(stats.total_distance_miles).toLocaleString()} <span style={{ fontSize: '0.9rem' }}>mi</span></div>
        <div className="stat-sub">Commercial highway route</div>
      </div>

      <div className="stat-card" style={{ '--card-accent': '#10b981' }}>
        <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Gauge size={15} color="#10b981" />
          <span>Total Driving Time</span>
        </div>
        <div className="stat-value">{stats.total_driving_hours} <span style={{ fontSize: '0.9rem' }}>hrs</span></div>
        <div className="stat-sub">≤ 11h per shift limit</div>
      </div>

      <div className="stat-card" style={{ '--card-accent': '#f59e0b' }}>
        <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Shield size={15} color="#f59e0b" />
          <span>On-Duty Time</span>
        </div>
        <div className="stat-value">{stats.total_on_duty_hours} <span style={{ fontSize: '0.9rem' }}>hrs</span></div>
        <div className="stat-sub">Loading, fueling, pre/post</div>
      </div>

      <div className="stat-card" style={{ '--card-accent': '#8b5cf6' }}>
        <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Calendar size={15} color="#8b5cf6" />
          <span>Daily Log Sheets</span>
        </div>
        <div className="stat-value">{dailyLogsCount} <span style={{ fontSize: '0.9rem' }}>days</span></div>
        <div className="stat-sub">24-hr RODS calendar sheets</div>
      </div>

      <div className="stat-card" style={{ '--card-accent': '#06b6d4' }}>
        <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Fuel size={15} color="#06b6d4" />
          <span>Fuel Stops</span>
        </div>
        <div className="stat-value">{stats.fuel_stops_count} <span style={{ fontSize: '0.9rem' }}>stops</span></div>
        <div className="stat-sub">≤ 1,000 mi requirement</div>
      </div>

      <div className="stat-card" style={{ '--card-accent': '#ec4899' }}>
        <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Coffee size={15} color="#ec4899" />
          <span>30-Min Rest Breaks</span>
        </div>
        <div className="stat-value">{stats.rest_breaks_count} <span style={{ fontSize: '0.9rem' }}>breaks</span></div>
        <div className="stat-sub">Every 8h driving rule</div>
      </div>

      <div className="stat-card" style={{ '--card-accent': '#6366f1' }}>
        <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Moon size={15} color="#6366f1" />
          <span>10-Hr Sleeper Resets</span>
        </div>
        <div className="stat-value">{stats.sleeper_stops_count} <span style={{ fontSize: '0.9rem' }}>resets</span></div>
        <div className="stat-sub">11h drive / 14h window reset</div>
      </div>

      <div className="stat-card" style={{ '--card-accent': stats.cycle_hours_remaining < 10 ? '#f43f5e' : '#10b981' }}>
        <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertTriangle size={15} color={stats.cycle_hours_remaining < 10 ? '#f43f5e' : '#10b981'} />
          <span>70-Hr Cycle Remaining</span>
        </div>
        <div className="stat-value">{stats.cycle_hours_remaining} <span style={{ fontSize: '0.9rem' }}>hrs</span></div>
        <div className="stat-sub">{stats.restarts_count > 0 ? `${stats.restarts_count} restart(s) taken` : 'Available driving hours'}</div>
      </div>
    </div>
  );
}
