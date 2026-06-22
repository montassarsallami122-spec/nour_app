'use client';

// Composants de graphiques légers (SVG/CSS pur, animés avec framer-motion).

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, animate } from 'framer-motion';

export interface Slice {
  label: string;
  value: number;
  extra?: number;
}

// --- Carte KPI (compteur animé + révélation au scroll) -------------------------
export function KpiCard({
  label,
  value,
  decimals = 0,
  suffix = '',
  sub,
  accent,
  index = 0,
}: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  sub?: string;
  accent?: boolean;
  index?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.1,
      ease: 'easeOut',
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [inView, value]);

  const formatted = val.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <motion.div
      ref={ref}
      className={`kpi ${accent ? 'kpi-accent' : ''}`}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, ease: 'easeOut', delay: index * 0.08 }}
      whileHover={{ y: -4 }}
    >
      <div className="kpi-value">{formatted}{suffix}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </motion.div>
  );
}

// --- Histogramme horizontal (barres qui poussent au scroll) --------------------
export function BarChart({ data, unit }: { data: Slice[]; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <motion.div
      className="bars"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
    >
      {data.map((d) => (
        <motion.div
          className="bar-row"
          key={d.label}
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
        >
          <span className="bar-label" title={d.label}>{d.label}</span>
          <span className="bar-track">
            <motion.span
              className="bar-fill"
              initial={{ width: 0 }}
              variants={{
                hidden: { width: 0 },
                show: { width: `${(d.value / max) * 100}%` },
              }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </span>
          <span className="bar-value">
            {d.value.toLocaleString('fr-FR')}
            {unit ? ` ${unit}` : ''}
            {d.extra !== undefined && <em> · {d.extra.toLocaleString('fr-FR')} j</em>}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}

// --- Prévision (courbe historique + projection + intervalle de confiance) ------
export interface ForecastPoint {
  period: string;
  value: number;
  forecast: boolean;
  lower?: number;
  upper?: number;
}
export interface ForecastSeries {
  unit: string;
  points: ForecastPoint[];
  lastActual: number;
  nextValue: number;
  changePct: number;
  trend: 'up' | 'down' | 'flat';
  horizon: number;
}

const fmtPeriod = (p: string) => (p.length === 7 ? `${p.slice(5)}/${p.slice(2, 4)}` : p);

export function ForecastChart({ series, color = '#6366f1' }: { series: ForecastSeries; color?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  const pts = series.points;
  const W = 360;
  const H = 180;
  const padL = 34;
  const padR = 14;
  const padT = 16;
  const padB = 28;
  const iw = W - padL - padR;
  const ih = H - padT - padB;

  const vals = pts.flatMap((p) => [p.value, p.lower ?? p.value, p.upper ?? p.value]);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.12;
  min = Math.max(0, min - pad);
  max += pad;

  const n = pts.length;
  const x = (i: number) => padL + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v: number) => padT + ih - ((v - min) / (max - min)) * ih;

  const firstFc = pts.findIndex((p) => p.forecast);
  const lastActualIdx = firstFc === -1 ? n - 1 : firstFc - 1;

  const actualPath = pts
    .slice(0, lastActualIdx + 1)
    .map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p.value)}`)
    .join(' ');

  const fcAnchor = firstFc === -1 ? [] : [pts[lastActualIdx], ...pts.slice(firstFc)];
  const fcPath = fcAnchor
    .map((p, k) => `${k ? 'L' : 'M'} ${x(lastActualIdx + k)} ${y(p.value)}`)
    .join(' ');

  const bandUpper = fcAnchor.map((p, k) => `${x(lastActualIdx + k)} ${y(p.upper ?? p.value)}`);
  const bandLower = fcAnchor.map((p, k) => `${x(lastActualIdx + k)} ${y(p.lower ?? p.value)}`).reverse();
  const bandPath = fcAnchor.length ? `M ${[...bandUpper, ...bandLower].join(' L ')} Z` : '';
  const boundaryX = firstFc === -1 ? null : (x(lastActualIdx) + x(firstFc)) / 2;

  const tickIdx = [...new Set([0, lastActualIdx, n - 1])];

  return (
    <motion.div
      ref={ref}
      className="forecast-wrap"
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="forecast-svg" preserveAspectRatio="none">
        {/* Grille : min / max */}
        {[max, (max + min) / 2, min].map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className="fc-grid" />
            <text x={padL - 6} y={y(v) + 3} className="fc-ytick">
              {Math.round(v)}
            </text>
          </g>
        ))}

        {/* Intervalle de confiance */}
        {bandPath && <path d={bandPath} fill={color} className="fc-band" />}

        {/* Séparateur historique / prévision */}
        {boundaryX !== null && (
          <line x1={boundaryX} x2={boundaryX} y1={padT} y2={padT + ih} className="fc-divider" />
        )}

        {/* Courbe historique */}
        <motion.path
          d={actualPath}
          fill="none"
          stroke={color}
          strokeWidth={2.4}
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : {}}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
        {/* Courbe prévisionnelle (pointillés) */}
        {fcPath && (
          <motion.path
            d={fcPath}
            fill="none"
            stroke={color}
            strokeWidth={2.4}
            strokeDasharray="5 4"
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={inView ? { pathLength: 1 } : {}}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.6 }}
          />
        )}

        {/* Points */}
        {pts.map((p, i) => (
          <motion.circle
            key={p.period}
            cx={x(i)}
            cy={y(p.value)}
            r={p.forecast ? 3 : 2.8}
            fill={p.forecast ? 'var(--panel)' : color}
            stroke={color}
            strokeWidth={p.forecast ? 1.6 : 0}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.3, delay: 0.4 + i * 0.03 }}
          />
        ))}

        {/* Étiquettes axe X */}
        {tickIdx.map((i) => (
          <text key={i} x={x(i)} y={H - 8} className="fc-xtick" textAnchor="middle">
            {fmtPeriod(pts[i].period)}
          </text>
        ))}
      </svg>
    </motion.div>
  );
}

// --- Donut (camembert évidé, segments qui se dessinent au scroll) --------------
const PALETTE = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#a3a3a3'];

export function Donut({ data }: { data: Slice[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const R = 60;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <motion.div
      ref={ref}
      className="donut-wrap"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
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
                strokeDasharray={inView ? `${dash} ${C - dash}` : `0 ${C}`}
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
          <motion.li
            key={d.label}
            initial={{ opacity: 0, x: 8 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.35, delay: 0.15 + i * 0.06 }}
          >
            <span className="dot" style={{ background: PALETTE[i % PALETTE.length] }} />
            {d.label}
            <strong>{Math.round((d.value / total) * 100)}%</strong>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
