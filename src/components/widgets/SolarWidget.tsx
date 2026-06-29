import { useEffect, useRef, useState } from 'react';
import { motion, animate } from 'framer-motion';
import { useIoBrokerStates } from '../../hooks/useIoBrokerStates';
import type { SolarWidgetConfig } from '../../types/dashboard';

interface Props { widget: SolarWidgetConfig }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(val: number | null, unit = 'W'): string {
  if (val === null) return '–';
  if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(1)} k${unit}`;
  return `${Math.round(val)} ${unit}`;
}
function num(v: unknown): number | null {
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}
function socColor(soc: number): string {
  if (soc >= 80) return '#6cff8f';
  if (soc >= 40) return '#f7c65f';
  return '#ff6b7a';
}
function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
function flowWidth(power: number, cap: number): number {
  return 3 + (Math.min(Math.abs(power), cap) / cap) * 17;
}
function flowDuration(power: number, cap: number): number {
  return Math.max(650, 2200 - (Math.min(Math.abs(power), cap) / cap) * 1500);
}

type Pt = [number, number];

function ctrlPts(a: Pt, b: Pt, bow: number): [Pt, Pt] {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * bow, ny = (dx / len) * bow;
  return [
    [a[0] + dx * 0.4 + nx, a[1] + dy * 0.4 + ny],
    [b[0] - dx * 0.4 + nx, b[1] - dy * 0.4 + ny],
  ];
}

function bezPt(a: Pt, c1: Pt, c2: Pt, b: Pt, t: number): Pt {
  const mt = 1 - t;
  return [
    mt * mt * mt * a[0] + 3 * mt * mt * t * c1[0] + 3 * mt * t * t * c2[0] + t * t * t * b[0],
    mt * mt * mt * a[1] + 3 * mt * mt * t * c1[1] + 3 * mt * t * t * c2[1] + t * t * t * b[1],
  ];
}

function buildRibbon(a: Pt, b: Pt, bow: number, wA: number, wB: number, n = 16): string {
  const [c1, c2] = ctrlPts(a, b, bow);
  const top: Pt[] = [], bot: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p0 = bezPt(a, c1, c2, b, t);
    const p1 = bezPt(a, c1, c2, b, Math.min(1, t + 0.01));
    let tx = p1[0] - p0[0], ty = p1[1] - p0[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    const hw = (wA + (wB - wA) * t) / 2;
    top.push([p0[0] - ty * hw, p0[1] + tx * hw]);
    bot.push([p0[0] + ty * hw, p0[1] - tx * hw]);
  }
  return (
    'M ' + top.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L ') +
    ' L ' + bot.slice().reverse().map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L ') +
    ' Z'
  );
}

function centerline(a: Pt, b: Pt, bow: number): string {
  const [c1, c2] = ctrlPts(a, b, bow);
  return `M ${a[0]},${a[1]} C ${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${b[0]},${b[1]}`;
}

function socArc(cx: number, cy: number, r: number, fraction: number): string {
  const f = clamp(fraction, 0.001, 0.9999);
  const start = -Math.PI / 2;
  const end = start + f * Math.PI * 2;
  const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end);
  return `M ${x1},${y1} A ${r},${r} 0 ${f > 0.5 ? 1 : 0} 1 ${x2},${y2}`;
}

// ─── Animated number hook ─────────────────────────────────────────────────────

function useAnimNum(target: number | null): number | null {
  const [val, setVal] = useState<number | null>(target);
  const prev = useRef<number | null>(target);
  useEffect(() => {
    if (target === null) { setVal(null); prev.current = null; return; }
    const from = prev.current ?? target;
    prev.current = target;
    const ctrl = animate(from, target, {
      duration: 0.55,
      ease: 'easeOut',
      onUpdate: (v) => setVal(v),
    });
    return () => ctrl.stop();
  }, [target]);
  return val;
}

// ─── Scene constants ──────────────────────────────────────────────────────────

const VW = 300, VH = 220;
const HOME    = { cx: 150, cy: 110, r: 38 };
const PV      = { cx: 150, cy: 28,  w: 78, h: 30 };
const BATT    = { cx: 40,  cy: 110, r: 27, ring: 33 };
const GRID    = { cx: 258, cy: 110, w: 72, h: 30 };
const WALLBOX = { cx: 150, cy: 192, w: 78, h: 30 };

const ptPV: Pt = [PV.cx,      PV.cy];
const ptH:  Pt = [HOME.cx,    HOME.cy];
const ptB:  Pt = [BATT.cx,    BATT.cy];
const ptG:  Pt = [GRID.cx,    GRID.cy];
const ptWB: Pt = [WALLBOX.cx, WALLBOX.cy];

const BOW = { pv: 12, batt: -12, grid: 12, wallbox: -12 };

// ─── SVG sub-components ───────────────────────────────────────────────────────

interface RibbonProps {
  id: string; a: Pt; b: Pt; bow: number;
  wA: number; wB: number; color: string;
  active: boolean; dur: number;
}
function Ribbon({ id, a, b, bow, wA, wB, color, active, dur }: RibbonProps) {
  const gid = `sg-${id}`;
  return (
    <>
      <defs>
        <linearGradient id={gid} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor={color} stopOpacity={active ? 0.42 : 0.12} />
          <stop offset="100%" stopColor={color} stopOpacity={active ? 0.16 : 0.04} />
        </linearGradient>
      </defs>
      <path d={buildRibbon(a, b, bow, wA, wB)} fill={`url(#${gid})`} />
      {active && (
        <path d={centerline(a, b, bow)} fill="none" stroke={color}
          strokeWidth={3} strokeLinecap="round" strokeDasharray="8 10"
          strokeDashoffset={0} opacity={0.85} filter="url(#solar-glow)"
          style={{ animation: `solar-flow ${dur}ms linear infinite` }} />
      )}
    </>
  );
}

function PillNode({ cx, cy, w, h, color, value, label, active }: {
  cx: number; cy: number; w: number; h: number;
  color: string; value: string; label: string; active: boolean;
}) {
  return (
    <g filter={active ? 'url(#solar-glow)' : undefined}>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={h / 2}
        fill="rgba(8,12,22,0.92)" stroke={color}
        strokeOpacity={active ? 0.75 : 0.3} strokeWidth={1.5} />
      <text x={cx} y={cy - 2} textAnchor="middle"
        fill={color} fontSize={12} fontWeight={800} fontFamily="system-ui,sans-serif">
        {value}
      </text>
      <text x={cx} y={cy + 11} textAnchor="middle"
        fill="rgba(255,255,255,0.42)" fontSize={8} fontFamily="system-ui,sans-serif">
        {label}
      </text>
    </g>
  );
}

function HubNode({ value }: { value: string }) {
  return (
    <g filter="url(#solar-glow)">
      <circle cx={HOME.cx} cy={HOME.cy} r={HOME.r}
        fill="rgba(8,12,22,0.92)" stroke="#5c7cff" strokeOpacity={0.6} strokeWidth={1.6} />
      <text x={HOME.cx} y={HOME.cy - 4} textAnchor="middle"
        fill="#aebfff" fontSize={14} fontWeight={800} fontFamily="system-ui,sans-serif">
        {value}
      </text>
      <text x={HOME.cx} y={HOME.cy + 13} textAnchor="middle"
        fill="rgba(255,255,255,0.42)" fontSize={9} fontFamily="system-ui,sans-serif">
        Haus
      </text>
    </g>
  );
}

function BattNode({ soc, battColor, value }: {
  soc: number | null; battColor: string; value: string;
}) {
  return (
    <g>
      <circle cx={BATT.cx} cy={BATT.cy} r={BATT.ring}
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
      {soc !== null && soc > 0 && (
        <path d={socArc(BATT.cx, BATT.cy, BATT.ring, soc / 100)}
          fill="none" stroke={battColor} strokeWidth={3} strokeLinecap="round" />
      )}
      <circle cx={BATT.cx} cy={BATT.cy} r={BATT.r}
        fill="rgba(8,12,22,0.92)" stroke={battColor}
        strokeOpacity={0.7} strokeWidth={1.5} filter="url(#solar-glow)" />
      <text x={BATT.cx} y={BATT.cy - 2} textAnchor="middle"
        fill={battColor} fontSize={12} fontWeight={800} fontFamily="system-ui,sans-serif">
        {value}
      </text>
      <text x={BATT.cx} y={BATT.cy + 11} textAnchor="middle"
        fill="rgba(255,255,255,0.42)" fontSize={8} fontFamily="system-ui,sans-serif">
        Akku
      </text>
    </g>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SolarWidget({ widget }: Props) {
  const hasWallbox = !!(widget.showWallbox && widget.wallboxStateId);

  const ids = [
    widget.pvStateId, widget.homeStateId, widget.gridStateId,
    widget.batteryStateId, widget.socStateId,
    widget.pvDayStateId, widget.homeDayStateId, widget.selfDayStateId,
    widget.battTempStateId,
    hasWallbox ? widget.wallboxStateId : undefined,
    ...(widget.stats?.map(s => s.stateId) ?? []),
  ].filter(Boolean) as string[];

  const states = useIoBrokerStates(ids);
  const g = (id?: string) => (id ? num(states[id]?.val) : null);

  const pvRaw   = g(widget.pvStateId);
  const homeRaw = g(widget.homeStateId);
  const gridRaw = g(widget.gridStateId);     // >0 = import, <0 = export
  const battRaw = g(widget.batteryStateId);  // >0 = charging, <0 = discharging
  const socRaw  = g(widget.socStateId);
  const wbRaw   = hasWallbox ? g(widget.wallboxStateId) : null;
  const pvDay   = g(widget.pvDayStateId);
  const homeDay = g(widget.homeDayStateId);
  const selfDay = g(widget.selfDayStateId);

  // Animated display values (spring tick-up on change)
  const pvDisp   = useAnimNum(pvRaw);
  const homeDisp = useAnimNum(homeRaw);
  const gridDisp = useAnimNum(gridRaw !== null ? Math.abs(gridRaw) : null);
  const battDisp = useAnimNum(battRaw !== null ? Math.abs(battRaw) : null);
  const socDisp  = useAnimNum(socRaw);
  const wbDisp   = useAnimNum(wbRaw);

  const hasBatt = !!(widget.batteryStateId || widget.socStateId);
  const hasGrid = !!widget.gridStateId;

  const battColor = socRaw !== null ? socColor(socRaw) : '#a78bfa';

  // PV → Home
  const pvOn   = (pvRaw ?? 0) > 50;
  const pvW    = flowWidth(pvRaw ?? 0, 8000);
  const pvDur  = flowDuration(pvRaw ?? 0, 8000);

  // Battery
  const battW_     = battRaw ?? 0;
  const battCharge = battW_ > 50;
  const battDisch  = battW_ < -50;
  const battOn     = battCharge || battDisch;
  const battWidth  = flowWidth(battW_, 6000);
  const battDur    = flowDuration(battW_, 6000);

  // Grid
  const gridW_     = gridRaw ?? 0;
  const gridImport = gridW_ > 50;
  const gridExport = gridW_ < -50;
  const gridOn     = gridImport || gridExport;
  const gridWidth  = flowWidth(gridW_, 10000);
  const gridDur    = flowDuration(gridW_, 10000);

  // Wallbox
  const wbW_    = wbRaw ?? 0;
  const wbOn    = hasWallbox && wbW_ > 50;
  const wbWidth = flowWidth(wbW_, 11000);
  const wbDur   = flowDuration(wbW_, 11000);

  // Hub glow proportional to total active power
  const totalFlow = (pvOn ? pvRaw ?? 0 : 0) +
    (battOn ? Math.abs(battW_) : 0) +
    (gridOn ? Math.abs(gridW_) : 0) +
    (wbOn ? wbW_ : 0);
  const hubGlow = clamp(0.04 + (totalFlow / 10000) * 0.34, 0.04, 0.38);

  // Node display strings
  const pvVal   = fmt(pvDisp);
  const homeVal = fmt(homeDisp);
  const gridVal = gridRaw === null || gridRaw === 0 ? '–' : fmt(gridDisp);
  const battVal = socRaw !== null
    ? `${Math.round(socDisp ?? socRaw)}%`
    : fmt(battDisp);
  const wbVal = fmt(wbDisp);

  return (
    <div className="widget-card" style={{ padding: 0, overflow: 'hidden' }}>
      {widget.showTitle !== false && (
        <div className="widget-title" style={{ padding: '8px 12px 0' }}>{widget.title}</div>
      )}

      <svg viewBox={`0 0 ${VW} ${VH}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        preserveAspectRatio="xMidYMid meet">
        <defs>
          <style>{`@keyframes solar-flow { to { stroke-dashoffset: -18; } }`}</style>
          <filter id="solar-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="hub-glow-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#5c7cff" stopOpacity={hubGlow} />
            <stop offset="100%" stopColor="#5c7cff" stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* Hub ambient glow — drawn first, below everything */}
        <circle cx={HOME.cx} cy={HOME.cy} r={76} fill="url(#hub-glow-grad)" />

        {/* Ribbons — below nodes so nodes occlude ribbon endpoints */}
        <Ribbon id="pv"
          a={ptPV} b={ptH} bow={BOW.pv}
          wA={pvW} wB={pvW * 0.85}
          color="#ffd34f" active={pvOn} dur={pvDur} />

        {hasBatt && (battDisch
          ? <Ribbon id="batt" a={ptB} b={ptH} bow={BOW.batt}
              wA={battWidth} wB={battWidth * 0.85}
              color={battColor} active={true} dur={battDur} />
          : <Ribbon id="batt" a={ptH} b={ptB} bow={BOW.batt}
              wA={battCharge ? battWidth * 0.85 : 3}
              wB={battCharge ? battWidth : 3}
              color={battColor} active={battCharge} dur={battDur} />
        )}

        {hasGrid && (gridImport
          ? <Ribbon id="grid" a={ptG} b={ptH} bow={BOW.grid}
              wA={gridWidth} wB={gridWidth * 0.85}
              color="#94a3b8" active={true} dur={gridDur} />
          : <Ribbon id="grid" a={ptH} b={ptG} bow={BOW.grid}
              wA={gridExport ? gridWidth * 0.85 : 3}
              wB={gridExport ? gridWidth : 3}
              color={gridExport ? '#ffd34f' : '#94a3b8'} active={gridExport} dur={gridDur} />
        )}

        {hasWallbox && (
          <Ribbon id="wb" a={ptH} b={ptWB} bow={BOW.wallbox}
            wA={wbOn ? wbWidth * 0.85 : 3}
            wB={wbOn ? wbWidth : 3}
            color="#2dd4bf" active={wbOn} dur={wbDur} />
        )}

        {/* Nodes — drawn on top to occlude ribbon endpoints cleanly */}
        <PillNode cx={PV.cx} cy={PV.cy} w={PV.w} h={PV.h}
          color="#ffd34f" value={pvVal} label="Solar" active={pvOn} />

        {hasGrid && (
          <PillNode cx={GRID.cx} cy={GRID.cy} w={GRID.w} h={GRID.h}
            color={gridExport ? '#ffd34f' : '#94a3b8'}
            value={gridVal}
            label={gridExport ? 'Export' : 'Netz'}
            active={gridOn} />
        )}

        {hasWallbox && (
          <PillNode cx={WALLBOX.cx} cy={WALLBOX.cy} w={WALLBOX.w} h={WALLBOX.h}
            color="#2dd4bf" value={wbVal} label="Wallbox" active={wbOn} />
        )}

        {hasBatt && (
          <BattNode soc={socRaw} battColor={battColor} value={battVal} />
        )}

        <HubNode value={homeVal} />
      </svg>

      {/* Daily stats — glass chips with fade-in */}
      {(pvDay !== null || homeDay !== null || selfDay !== null) && (
        <motion.div
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ display: 'flex', gap: 6, padding: '8px 10px 10px', borderTop: '1px solid var(--border)' }}
        >
          {[
            { label: 'PV heute',  value: pvDay   !== null ? fmt(pvDay * 1000, 'Wh')   : null, color: '#ffd34f' },
            { label: 'Verbrauch', value: homeDay !== null ? fmt(homeDay * 1000, 'Wh') : null, color: '#86b7ff' },
            { label: 'Eigennutz', value: selfDay !== null ? `${Math.round(selfDay)}%`  : null, color: '#6cff8f' },
          ].filter(s => s.value !== null).map(stat => (
            <div key={stat.label} style={{
              flex: 1, padding: '6px 8px', textAlign: 'center',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>{stat.label}</div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Custom stat cards */}
      {widget.stats && widget.stats.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 10px 10px' }}>
          {widget.stats.map(stat => {
            const val = states[stat.stateId]?.val;
            return (
              <div key={stat.stateId} style={{
                flex: '1 0 45%', padding: '6px 10px', borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: stat.color ?? 'var(--text)' }}>
                  {val != null ? `${val}${stat.unit ? ` ${stat.unit}` : ''}` : '–'}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{stat.label}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
