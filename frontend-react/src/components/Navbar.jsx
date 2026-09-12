import { Truck, BookOpen, Printer } from 'lucide-react';

export default function Navbar({ onOpenRules, onPrintAll, hasLogs }) {
  return (
    <header className="navbar no-print">
      <div className="brand">
        <div className="brand-icon">
          <Truck size={26} color="#ffffff" strokeWidth={2.2} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="brand-title">TruckLogix ELD</span>
            <span className="brand-badge">FMCSA Part 395</span>
          </div>
          <div className="brand-subtitle">Commercial Route & Driver's Daily Log (RODS) Generator</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenRules}
          title="View FMCSA HOS Rules Reference"
        >
          <BookOpen size={16} color="#60a5fa" />
          <span>HOS Rules Guide</span>
        </button>

        {hasLogs && (
          <button
            className="btn btn-secondary btn-sm btn-print"
            onClick={onPrintAll}
            title="Print or Save All Daily Log Sheets"
          >
            <Printer size={16} color="#10b981" />
            <span>Print All Logs</span>
          </button>
        )}
      </div>
    </header>
  );
}
