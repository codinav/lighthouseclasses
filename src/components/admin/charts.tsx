"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Admin charts. Palette validated with the dataviz six-checks validator:
 * light surface (#ffffff) + dark surface (#211c17) → #b3383c, #c67c02, #38649d
 * (series order fixed). Single-series charts use #b3383c only. Identity is
 * never color-alone: every multi-series mark carries a direct label + legend,
 * and each chart ships an sr-only data table.
 */
const S1 = "#b3383c";
const S2 = "#c67c02";
const S3 = "#38649d";
export const CHART_COLORS = [S1, S2, S3];

export interface SeriesPoint {
  label: string;
  value: number;
}

/* ------------------------------------------------------------------ */
/* Single-series area chart with crosshair tooltip                     */
/* ------------------------------------------------------------------ */

export function AreaSeries({
  points,
  ariaLabel,
  format = (v) => String(v),
  tickEvery = 1,
}: {
  points: SeriesPoint[];
  ariaLabel: string;
  format?: (v: number) => string;
  tickEvery?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 220;
  const PAD = { l: 44, r: 16, t: 16, b: 28 };
  const max = Math.max(1, Math.ceil(Math.max(...points.map((d) => d.value)) * 1.15));

  const x = (i: number) => PAD.l + (i / Math.max(1, points.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / max) * (H - PAD.t - PAD.b);

  const linePath = points.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.value)}`).join(" ");
  const areaPath = `${linePath} L${x(points.length - 1)},${H - PAD.b} L${x(0)},${H - PAD.b} Z`;
  const grid = [0, max / 2, max];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
        {grid.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity="0.08" />
            <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" className="fill-[var(--lh-ink-soft)] text-[10px]">
              {Math.round(v)}
            </text>
          </g>
        ))}
        <path d={areaPath} fill={S1} opacity="0.12" />
        <path d={linePath} fill="none" stroke={S1} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.length > 0 && (
          <text x={x(points.length - 1) - 4} y={y(points[points.length - 1].value) - 10} textAnchor="end" className="fill-[var(--lh-ink)] text-[11px] font-bold">
            {format(points[points.length - 1].value)}
          </text>
        )}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(points[hover].value)} r="5" fill={S1} stroke="var(--lh-card)" strokeWidth="2" />
          </g>
        )}
        {points.map((d, i) =>
          i % tickEvery === 0 ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className={cn("text-[10px]", hover === i ? "fill-[var(--lh-ink)] font-bold" : "fill-[var(--lh-ink-soft)]")}>
              {d.label}
            </text>
          ) : null
        )}
        {points.map((d, i) => (
          <rect
            key={`h${i}`}
            x={x(i) - (W - PAD.l - PAD.r) / Math.max(1, points.length - 1) / 2}
            y={PAD.t}
            width={(W - PAD.l - PAD.r) / Math.max(1, points.length - 1)}
            height={H - PAD.t - PAD.b}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>
      <div className="mt-1 h-6 text-center text-xs" aria-live="polite">
        {hover !== null ? (
          <span className="rounded-lg bg-navy-900 px-2.5 py-1 font-semibold text-white dark:bg-white dark:text-navy-950">
            {points[hover].label} · {format(points[hover].value)}
          </span>
        ) : (
          <span className="muted">Hover the chart for exact values</span>
        )}
      </div>
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <tbody>
          {points.map((d) => (
            <tr key={d.label}><td>{d.label}</td><td>{d.value}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Share donut (≤3 slices) with legend + direct values                 */
/* ------------------------------------------------------------------ */

export function ShareDonut({
  slices,
  centerTitle,
  centerSub,
  ariaLabel,
}: {
  slices: SeriesPoint[]; // values as percentages summing ~100
  centerTitle: string;
  centerSub: string;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const R = 70;
  const STROKE = 26;
  const C = 2 * Math.PI * R;
  let acc = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <svg viewBox="0 0 180 180" className="h-44 w-44 shrink-0" role="img" aria-label={ariaLabel}>
        <g transform="rotate(-90 90 90)">
          {slices.map((p, i) => {
            const start = acc;
            acc += p.value;
            return (
              <circle
                key={p.label}
                cx="90"
                cy="90"
                r={R}
                fill="none"
                stroke={CHART_COLORS[i % 3]}
                strokeWidth={hover === i ? STROKE + 4 : STROKE}
                strokeDasharray={`${Math.max(0, (p.value / 100) * C - 2)} ${C - Math.max(0, (p.value / 100) * C - 2)}`}
                strokeDashoffset={-((start / 100) * C)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                className="transition-all duration-200"
              />
            );
          })}
        </g>
        <text x="90" y="84" textAnchor="middle" className="fill-[var(--lh-ink)] font-display text-xl font-bold">
          {centerTitle}
        </text>
        <text x="90" y="102" textAnchor="middle" className="fill-[var(--lh-ink-soft)] text-[10px] uppercase tracking-widest">
          {centerSub}
        </text>
      </svg>
      <ul className="w-full space-y-2.5">
        {slices.map((p, i) => (
          <li
            key={p.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className={cn("flex items-center gap-3 rounded-xl px-3 py-2 transition-colors", hover === i && "bg-navy-900/5 dark:bg-white/5")}
          >
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: CHART_COLORS[i % 3] }} aria-hidden />
            <span className="flex-1 text-sm font-medium">{p.label}</span>
            <span className="text-sm font-bold tabular-nums">{Math.round(p.value)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Single-hue horizontal bars with end labels                          */
/* ------------------------------------------------------------------ */

export function LabelBars({ items, ariaLabel }: { items: SeriesPoint[]; ariaLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...items.map((d) => d.value));

  return (
    <div className="space-y-3" role="img" aria-label={ariaLabel}>
      {items.map((d, i) => (
        <div key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <div className="flex items-baseline justify-between text-xs">
            <span className={cn("font-medium", hover === i ? "text-[var(--lh-ink)]" : "muted")}>{d.label}</span>
            <span className="font-bold tabular-nums">{new Intl.NumberFormat("en-IN").format(d.value)}</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-r bg-navy-900/[0.06] dark:bg-white/[0.08]">
            <div
              className="h-full rounded-r transition-all duration-500"
              style={{ width: `${(d.value / max) * 100}%`, background: S1, opacity: hover === null || hover === i ? 1 : 0.45 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
