import React, { useRef } from 'react';
import { Download } from 'lucide-react';

export default function EldLogSheet({ logData, dayIndex, totalDays }) {
  const svgRef = useRef(null);
  if (!logData) return null;

  const {
    date,
    carrier_name,
    carrier_address,
    driver_name,
    truck_number,
    trailer_number,
    shipping_doc,
    total_miles_driving_today,
    hours_summary,
    recap,
    step_points,
    remarks
  } = logData;

  // SVG Grid layout dimensions
  const SVG_WIDTH = 960;
  const SVG_HEIGHT = 280;
  const LEFT_LABEL_WIDTH = 110;
  const RIGHT_TOTAL_WIDTH = 80;
  const GRID_LEFT = LEFT_LABEL_WIDTH;
  const GRID_RIGHT = SVG_WIDTH - RIGHT_TOTAL_WIDTH;
  const GRID_WIDTH = GRID_RIGHT - GRID_LEFT; // 770px for 24 hours -> ~32.08px per hour

  const ROW_HEIGHT = 36;
  const HEADER_Y = 32;
  const GRID_TOP = HEADER_Y + 12;
  // 4 rows: 0: OFF, 1: SB, 2: D, 3: ON
  const getRowY = (rowIndex) => GRID_TOP + rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

  const getHourX = (hour) => {
    return GRID_LEFT + (hour / 24.0) * GRID_WIDTH;
  };

  // Convert step points to SVG path 'd' string
  let pathD = '';
  if (step_points && step_points.length > 0) {
    step_points.forEach((pt, idx) => {
      const x = getHourX(pt.hour);
      const y = getRowY(pt.status_index);
      if (idx === 0) {
        pathD += `M ${x.toFixed(2)} ${y.toFixed(2)}`;
      } else {
        pathD += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
      }
    });
  }

  // Row labels
  const rows = [
    { label: '1. Off Duty', code: 'OFF', total: hours_summary.off_duty },
    { label: '2. Sleeper Berth', code: 'SB', total: hours_summary.sleeper_berth },
    { label: '3. Driving', code: 'D', total: hours_summary.driving },
    { label: '4. On Duty (Not Driving)', code: 'ON', total: hours_summary.on_duty_not_driving }
  ];

  // Download SVG
  const handleDownloadSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `ELD-Log-Day-${logData.day_number}-${date.replace(/\//g, '-')}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="eld-paper-sheet">
      {/* Action buttons inside paper sheet (hidden during print) */}
      <div className="no-print" style={{ position: 'absolute', top: '1.25rem', right: '1.5rem', display: 'flex', gap: '0.5rem' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => window.print()}
          title="Print or Save PDF"
          style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
        >
          <span>🖨️ Print Sheet</span>
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleDownloadSVG}
          title="Download Vector SVG"
          style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
        >
          <Download size={14} />
          <span>Save SVG</span>
        </button>
      </div>

      {/* Official Form Header */}
      <div className="eld-form-title-row">
        <div className="eld-form-agency">
          U.S. DEPARTMENT OF TRANSPORTATION<br />
          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>FEDERAL MOTOR CARRIER SAFETY ADMINISTRATION</span>
        </div>

        <div className="eld-form-main-heading">
          <h2>DRIVER'S DAILY LOG</h2>
          <p>(ONE CALENDAR DAY — 24 HOURS)</p>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e3a8a', marginTop: '2px' }}>
            DAY {logData.day_number} OF {totalDays}
          </div>
        </div>

        <div className="eld-form-copy-rules">
          ORIGINAL — Submit to carrier within 13 days<br />
          DUPLICATE — Driver retains possession for eight days
        </div>
      </div>

      {/* Meta Grid Fields */}
      <div className="eld-meta-grid">
        <div className="eld-field-box">
          <span className="eld-field-label">Date (Month / Day / Year)</span>
          <span className="eld-field-value">{date}</span>
        </div>

        <div className="eld-field-box">
          <span className="eld-field-label">Total Miles Driving Today</span>
          <span className="eld-field-value">{total_miles_driving_today} mi</span>
        </div>

        <div className="eld-field-box">
          <span className="eld-field-label">Truck / Tractor & Trailer #</span>
          <span className="eld-field-value">{truck_number} / {trailer_number}</span>
        </div>

        <div className="eld-field-box">
          <span className="eld-field-label">Shipping / Manifest / Pro #</span>
          <span className="eld-field-value">{shipping_doc}</span>
        </div>

        <div className="eld-field-box" style={{ gridColumn: 'span 2' }}>
          <span className="eld-field-label">Name of Carrier</span>
          <span className="eld-field-value">{carrier_name}</span>
        </div>

        <div className="eld-field-box" style={{ gridColumn: 'span 2' }}>
          <span className="eld-field-label">Main Office Address</span>
          <span className="eld-field-value">{carrier_address}</span>
        </div>
      </div>

      {/* The FMCSA 24-Hour Graph Grid */}
      <div className="eld-grid-wrapper">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="eld-grid-svg"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background */}
          <rect x="0" y="0" width={SVG_WIDTH} height={SVG_HEIGHT} fill="#ffffff" />

          {/* Column Header for Total Hours */}
          <text
            x={GRID_RIGHT + RIGHT_TOTAL_WIDTH / 2}
            y={HEADER_Y - 4}
            textAnchor="middle"
            fontSize="10"
            fontWeight="800"
            fill="#0f172a"
          >
            TOTAL
          </text>
          <text
            x={GRID_RIGHT + RIGHT_TOTAL_WIDTH / 2}
            y={HEADER_Y + 7}
            textAnchor="middle"
            fontSize="9"
            fontWeight="700"
            fill="#0f172a"
          >
            HOURS
          </text>

          {/* 24-Hour Column Headers */}
          {Array.from({ length: 25 }).map((_, h) => {
            const x = getHourX(h);
            let label = h === 0 ? 'Mid' : h === 12 ? 'Noon' : h === 24 ? 'Mid' : h.toString();
            return (
              <g key={h}>
                <text
                  x={x}
                  y={HEADER_Y + 2}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="700"
                  fill="#0f172a"
                >
                  {label}
                </text>
                {/* Vertical Hour Grid Lines */}
                <line
                  x1={x}
                  y1={GRID_TOP}
                  x2={x}
                  y2={GRID_TOP + 4 * ROW_HEIGHT}
                  stroke="#cbd5e1"
                  strokeWidth={h === 0 || h === 12 || h === 24 ? "1.5" : "0.75"}
                />
              </g>
            );
          })}

          {/* Intermediate 15-minute and 30-minute ticks */}
          {Array.from({ length: 24 }).map((_, h) => {
            return [0.25, 0.5, 0.75].map((sub) => {
              const x = getHourX(h + sub);
              const isHalf = sub === 0.5;
              return Array.from({ length: 4 }).map((_, r) => {
                const rowTop = GRID_TOP + r * ROW_HEIGHT;
                const rowBot = rowTop + ROW_HEIGHT;
                const tickLen = isHalf ? 8 : 4;
                return (
                  <g key={`${h}-${sub}-${r}`}>
                    {/* Top tick of row */}
                    <line
                      x1={x}
                      y1={rowTop}
                      x2={x}
                      y2={rowTop + tickLen}
                      stroke="#94a3b8"
                      strokeWidth="0.5"
                    />
                    {/* Bottom tick of row */}
                    <line
                      x1={x}
                      y1={rowBot - tickLen}
                      x2={x}
                      y2={rowBot}
                      stroke="#94a3b8"
                      strokeWidth="0.5"
                    />
                  </g>
                );
              });
            });
          })}

          {/* Row Boundaries and Labels */}
          {rows.map((row, idx) => {
            const yTop = GRID_TOP + idx * ROW_HEIGHT;
            const yMid = yTop + ROW_HEIGHT / 2;
            return (
              <g key={row.code}>
                {/* Horizontal row divider line */}
                <line
                  x1={GRID_LEFT}
                  y1={yTop}
                  x2={GRID_RIGHT}
                  y2={yTop}
                  stroke="#0f172a"
                  strokeWidth="1.2"
                />

                {/* Left Label */}
                <text
                  x={GRID_LEFT - 8}
                  y={yMid + 4}
                  textAnchor="end"
                  fontSize="10"
                  fontWeight="700"
                  fill="#1e293b"
                >
                  {row.label}
                </text>

                {/* Right Total Hours */}
                <rect
                  x={GRID_RIGHT}
                  y={yTop}
                  width={RIGHT_TOTAL_WIDTH}
                  height={ROW_HEIGHT}
                  fill={idx % 2 === 0 ? '#f8fafc' : '#ffffff'}
                  stroke="#cbd5e1"
                  strokeWidth="0.5"
                />
                <text
                  x={GRID_RIGHT + RIGHT_TOTAL_WIDTH / 2}
                  y={yMid + 4}
                  textAnchor="middle"
                  fontSize="12"
                  fontFamily="monospace"
                  fontWeight="800"
                  fill="#0f172a"
                >
                  {row.total.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Bottom Grid border */}
          <line
            x1={GRID_LEFT}
            y1={GRID_TOP + 4 * ROW_HEIGHT}
            x2={GRID_RIGHT}
            y2={GRID_TOP + 4 * ROW_HEIGHT}
            stroke="#0f172a"
            strokeWidth="1.5"
          />

          {/* Sum row "=24" on the right */}
          <text
            x={GRID_RIGHT + RIGHT_TOTAL_WIDTH / 2}
            y={GRID_TOP + 4 * ROW_HEIGHT + 18}
            textAnchor="middle"
            fontSize="13"
            fontWeight="900"
            fontFamily="monospace"
            fill="#1e3a8a"
          >
            = 24.00
          </text>

          {/* Remarks Section Header Row */}
          <rect
            x={GRID_LEFT}
            y={GRID_TOP + 4 * ROW_HEIGHT}
            width={GRID_WIDTH}
            height="22"
            fill="#f1f5f9"
            stroke="#cbd5e1"
            strokeWidth="0.5"
          />
          <text
            x={GRID_LEFT - 8}
            y={GRID_TOP + 4 * ROW_HEIGHT + 15}
            textAnchor="end"
            fontSize="10"
            fontWeight="800"
            fill="#0f172a"
          >
            REMARKS
          </text>

          {/* Render Drawn Step Line Path (Blue Ink Pen look) */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#1d4ed8"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Location Callout Annotations on Grid Bottom */}
          {remarks && remarks.map((rem, i) => {
            const x = getHourX(rem.hour);
            const y = GRID_TOP + 4 * ROW_HEIGHT + 26;
            return (
              <g key={i} transform={`translate(${x}, ${y}) rotate(48)`}>
                {/* Pointer line */}
                <line x1="0" y1="-8" x2="0" y2="0" stroke="#2563eb" strokeWidth="1" strokeDasharray="2 2" />
                <text
                  x="4"
                  y="4"
                  fontSize="8.5"
                  fontWeight="600"
                  fill="#1e293b"
                >
                  {rem.location} ({rem.time_str})
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Remarks Detail Table */}
      <div className="eld-remarks-box">
        <div className="eld-remarks-heading">Change of Duty Status Remarks & Event Log</div>
        <table className="eld-remarks-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Time</th>
              <th style={{ width: '90px' }}>Status</th>
              <th style={{ width: '220px' }}>Location</th>
              <th>Duty Description & FMCSA Event Remarks</th>
            </tr>
          </thead>
          <tbody>
            {remarks && remarks.map((r, i) => (
              <tr key={i}>
                <td><strong>{r.time_str}</strong></td>
                <td>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 800,
                    background: r.status === 'D' ? '#dcfce7' : r.status === 'ON' ? '#fef3c7' : r.status === 'SB' ? '#ede9fe' : '#f1f5f9',
                    color: r.status === 'D' ? '#166534' : r.status === 'ON' ? '#92400e' : r.status === 'SB' ? '#5b21b6' : '#334155'
                  }}>
                    {r.status}
                  </span>
                </td>
                <td>{r.location}</td>
                <td>{r.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Signature & 70-Hr / 8-Day Recap */}
      <div className="eld-footer-row">
        <div className="eld-signature-block">
          <p className="eld-cert-text">
            I certify that these entries are true and correct and comply with 49 CFR Part 395.
          </p>
          <div className="eld-sig-line">
            {driver_name}
          </div>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>
            Driver's Signature in Full
          </span>
        </div>

        <div>
          <table className="eld-recap-table">
            <tbody>
              <tr>
                <td><strong>A.</strong> Total On-Duty Hours Today:</td>
                <td className="strong" style={{ textAlign: 'right' }}>{recap.on_duty_today.toFixed(2)} hrs</td>
              </tr>
              <tr>
                <td><strong>B.</strong> Total 70-Hr Cycle Used to Date:</td>
                <td className="strong" style={{ textAlign: 'right' }}>{recap.total_cycle_hours_used.toFixed(2)} hrs</td>
              </tr>
              <tr>
                <td><strong>C.</strong> Available Hours for Tomorrow:</td>
                <td className="strong" style={{ textAlign: 'right', color: recap.cycle_hours_available < 10 ? '#dc2626' : '#16a34a' }}>
                  {recap.cycle_hours_available.toFixed(2)} hrs
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
