'use client';

// Composants de graphiques légers (SVG/CSS pur, aucune dépendance externe).

export interface Slice {
  label: string;
  value: number;
  extra?: number;
}

// --- Carte KPI -----------------------------------------------------------------
export function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`kpi ${accent ? 'kpi-accent' : ''}`}>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

// --- Histogramme horizontal ----------------------------------------------------
export function BarChart({ data, unit }: { data: Slice[]; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bars">
      {data.map((d, i) => (
        <div className="bar-row" key={d.label}>
          <span className="bar-label" title={d.label}>{d.label}</span>
          <span className="bar-track">
            <span
              className="bar-fill"
              style={{ width: `${(d.value / max) * 100}%`, animationDelay: `${i * 60}ms` }}
            />
          </span>
          <span className="bar-value">
            {d.value.toLocaleString('fr-FR')}
            {unit ? ` ${unit}` : ''}
            {d.extra !== undefined && <em> · {d.extra.toLocaleString('fr-FR')} j</em>}
          </span>
        </div>
      ))}
    </div>
  );
}

// --- Donut (camembert évidé) ---------------------------------------------------
const PALETTE = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#a3a3a3'];

export function Donut({ data }: { data: Slice[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const R = 60;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 160 160" className="donut">
        <g transform="rotate(-90 80 80)">
          {data.map((d, i) => {
            const frac = d.value / total;
            const dash = frac * C;
            const seg = (
              <circle
                key={d.label}
                cx="80"
                cy="80"
                r={R}
                fill="none"
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth="22"
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return seg;
          })}
        </g>
        <text x="80" y="76" className="donut-total">{total.toLocaleString('fr-FR')}</text>
        <text x="80" y="94" className="donut-cap">total</text>
      </svg>
      <ul className="legend">
        {data.map((d, i) => (
          <li key={d.label}>
            <span className="dot" style={{ background: PALETTE[i % PALETTE.length] }} />
            {d.label}
            <strong>{Math.round((d.value / total) * 100)}%</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
