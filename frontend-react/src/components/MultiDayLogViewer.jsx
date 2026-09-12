import { useState } from 'react';
import EldLogSheet from './EldLogSheet';
import { FileText, Printer, Layers } from 'lucide-react';

export default function MultiDayLogViewer({ dailyLogs }) {
  const [activeTab, setActiveTab] = useState(0); // 0-based index or -1 for "All"

  if (!dailyLogs || dailyLogs.length === 0) return null;

  const totalDays = dailyLogs.length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="eld-section">
      <div className="eld-header-bar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <FileText size={22} color="#3b82f6" />
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              FMCSA Daily Log Sheets (RODS)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Complete 24-hour graph grid and duty status record for all {totalDays} calendar day(s) of the trip
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="eld-tabs">
            {dailyLogs.map((log, idx) => (
              <button
                key={log.day_number}
                className={`eld-tab ${activeTab === idx ? 'active' : ''}`}
                onClick={() => setActiveTab(idx)}
              >
                Day {log.day_number} ({log.date})
              </button>
            ))}

            {totalDays > 1 && (
              <button
                className={`eld-tab ${activeTab === -1 ? 'active' : ''}`}
                onClick={() => setActiveTab(-1)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Layers size={13} />
                  View All Days ({totalDays})
                </span>
              </button>
            )}
          </div>

          <button
            className="btn btn-secondary btn-sm btn-print"
            onClick={handlePrint}
            title="Print or save all daily sheets as PDF"
          >
            <Printer size={15} color="#10b981" />
            <span>Print Sheets</span>
          </button>
        </div>
      </div>

      {/* Render Single Sheet on Screen or All Sheets */}
      {activeTab === -1 ? (
        <div className="all-sheets-container">
          {dailyLogs.map((log) => (
            <EldLogSheet
              key={log.day_number}
              logData={log}
              totalDays={totalDays}
            />
          ))}
        </div>
      ) : (
        <>
          <div className="screen-only-sheet">
            <EldLogSheet
              logData={dailyLogs[activeTab]}
              totalDays={totalDays}
            />
          </div>
          <div className="print-only-sheets">
            {dailyLogs.map((log) => (
              <EldLogSheet
                key={log.day_number}
                logData={log}
                totalDays={totalDays}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
