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
