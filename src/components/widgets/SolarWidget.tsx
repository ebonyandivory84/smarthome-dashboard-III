import { useIoBrokerStates } from '../../hooks/useIoBrokerStates';
import type { SolarWidgetConfig } from '../../types/dashboard';

interface Props { widget: SolarWidgetConfig }

function fmt(val: number | null, unit = 'W'): string {
  if (val === null) return '–';
  if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(1)} k${unit}`;
  return `${Math.round(val)} ${unit}`;
}
function num(v: unknown): number | null {
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}

// SVG scene dimensions
const W = 280, H = 156;

// Node centers in SVG coords
const N = {
  pv:   { x: 140, y: 22,  w: 74, h: 32, color: '#ffd34f', label: 'Solar' },
  home: { x: 140, y: 100, w: 74, h: 32, color: '#86b7ff', label: 'Haus'  },
  batt: { x: 36,  y: 100, w: 64, h: 32, color: '#a78bfa', label: 'Akku'  },
  grid: { x: 244, y: 100, w: 64, h: 32, color: '#94a3b8', label: 'Netz'  },
};

// Line segment coordinates
const LINES = {
  pvHome:   { x1: 140, y1: 38,  x2: 140, y2: 84  }, // vertical
  battHome: { x1: 68,  y1: 100, x2: 104, y2: 100 }, // horizontal left
  homeGrid: { x1: 176, y1: 100, x2: 212, y2: 100 }, // horizontal right
};

interface DotProps {
  path: string;
  dur: number;
  color?: string;
  opacity?: number;
}
function FlowDot({ path, dur, color = '#f7c65f', opacity = 0.9 }: DotProps) {
  return (
    <circle r={4} fill={color} opacity={opacity} filter="url(#solar-glow)">
      <animateMotion path={path} dur={`${dur}ms`} repeatCount="indefinite" />
    </circle>
  );
}

interface NodeProps { cx: number; cy: number; w: number; h: number; color: string; val: string; label: string }
function SvgNode({ cx, cy, w, h, color, val, label }: NodeProps) {
  return (
    <g>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={9}
        fill={`${color}22`} stroke={`${color}55`} strokeWidth={1} />
      <text x={cx} y={cy - 3} textAnchor="middle"
        fill={color} fontSize={11} fontWeight={800} fontFamily="system-ui, sans-serif">
        {val}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle"
        fill="rgba(255,255,255,0.45)" fontSize={8} fontFamily="system-ui, sans-serif">
        {label}
      </text>
    </g>
  );
}

function socColor(soc: number) {
  if (soc >= 80) return '#6cff8f';
  if (soc >= 40) return '#f7c65f';
  return '#ff6b7a';
}

export default function SolarWidget({ widget }: Props) {
  const ids = [
    widget.pvStateId, widget.homeStateId, widget.gridStateId,
    widget.batteryStateId, widget.socStateId,
    widget.pvDayStateId, widget.homeDayStateId, widget.selfDayStateId,
    widget.battTempStateId,
    ...(widget.stats?.map(s => s.stateId) ?? []),
  ].filter(Boolean) as string[];

  const states = useIoBrokerStates(ids);
  const g = (id?: string) => (id ? num(states[id]?.val) : null);

  const pv   = g(widget.pvStateId);
  const home = g(widget.homeStateId);
  const grid = g(widget.gridStateId);        // >0 = import, <0 = export
  const batt = g(widget.batteryStateId);     // >0 = charging, <0 = discharging
  const soc  = g(widget.socStateId);
  const pvDay   = g(widget.pvDayStateId);
  const homeDay = g(widget.homeDayStateId);
  const selfDay = g(widget.selfDayStateId);

  const hasBatt = widget.batteryStateId || widget.socStateId;
  const hasGrid = widget.gridStateId;

  // ── Flow dots ──────────────────────────────────────────────────────────────
  // PV → Home (always when PV > 0)
  const pvFlow  = (pv ?? 0) > 50;
  const pvDur   = Math.max(600, 2000 - ((pv ?? 0) / 8000) * 1400);

  // Battery: >0 charging (Home→Batt), <0 discharging (Batt→Home)
  const battW     = batt ?? 0;
  const battCharge    = battW > 50;   // home → batt
  const battDischarge = battW < -50;  // batt → home
  const battDur = Math.max(800, 2400 - (Math.abs(battW) / 6000) * 1600);

  // Grid: >0 import (Grid→Home), <0 export (Home→Grid)
  const gridW    = grid ?? 0;
  const gridImport = gridW > 50;
  const gridExport = gridW < -50;
  const gridDur  = Math.max(700, 2000 - (Math.abs(gridW) / 12000) * 1300);

  // Path strings for animateMotion
  const pathPvHome   = `M ${N.pv.x},38 L ${N.pv.x},84`;
  const pathBattHome = `M 68,100 L 104,100`;
  const pathHomeBatt = `M 104,100 L 68,100`;
  const pathGridHome = `M 212,100 L 176,100`;
  const pathHomeGrid = `M 176,100 L 212,100`;

  const battColor = soc !== null ? socColor(soc) : '#a78bfa';

  return (
    <div className="widget-card" style={{ padding: 0, overflow: 'hidden' }}>
      {widget.showTitle !== false && (
        <div className="widget-title" style={{ padding: '8px 12px 0' }}>{widget.title}</div>
      )}

      {/* ── Energy flow SVG ── */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="solar-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Lines */}
        <line {...LINES.pvHome}   stroke="rgba(255,255,255,0.13)" strokeWidth={3} strokeLinecap="round" />
        {hasBatt && <line {...LINES.battHome} stroke="rgba(255,255,255,0.13)" strokeWidth={3} strokeLinecap="round" />}
        {hasGrid && <line {...LINES.homeGrid} stroke="rgba(255,255,255,0.13)" strokeWidth={3} strokeLinecap="round" />}

        {/* Animated flow dots */}
        {pvFlow   && <FlowDot path={pathPvHome}   dur={pvDur}   color="#f7c65f" />}
        {battDischarge && hasBatt && <FlowDot path={pathBattHome} dur={battDur} color={battColor} />}
        {battCharge    && hasBatt && <FlowDot path={pathHomeBatt} dur={battDur} color={battColor} opacity={0.65} />}
        {gridImport && hasGrid && <FlowDot path={pathGridHome} dur={gridDur} color="#94a3b8" />}
        {gridExport && hasGrid && <FlowDot path={pathHomeGrid} dur={gridDur} color="#f7c65f" opacity={0.7} />}

        {/* Nodes */}
        <SvgNode {...N.pv}   val={fmt(pv)}  label={N.pv.label}   color={N.pv.color} />
        <SvgNode {...N.home} val={fmt(home)} label={N.home.label} color={N.home.color} />
        {hasBatt && (
          <SvgNode
            {...N.batt}
            val={soc !== null ? `${Math.round(soc)}%` : fmt(batt)}
            label={N.batt.label}
            color={battColor}
          />
        )}
        {hasGrid && (
          <SvgNode
            {...N.grid}
            val={gridW !== 0 ? fmt(Math.abs(gridW)) : '–'}
            label={gridW < 0 ? 'Export' : 'Import'}
            color={N.grid.color}
          />
        )}
      </svg>

      {/* ── Battery SOC bar ── */}
      {soc !== null && (
        <div style={{ padding: '0 12px 6px' }}>
          <div style={{ height: 3, background: 'var(--card)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.max(0, Math.min(100, soc))}%`,
              background: battColor,
              borderRadius: 2,
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>
      )}

      {/* ── Daily stats ── */}
      {(pvDay !== null || homeDay !== null || selfDay !== null) && (
        <div style={{ display: 'flex', borderTop: '1px solid var(--border)' }}>
          {[
            { label: 'PV heute',  value: pvDay   !== null ? fmt(pvDay * 1000, 'Wh')   : null, color: N.pv.color },
            { label: 'Verbrauch', value: homeDay !== null ? fmt(homeDay * 1000, 'Wh') : null, color: N.home.color },
            { label: 'Eigennutz', value: selfDay !== null ? `${Math.round(selfDay)}%`  : null, color: '#6cff8f' },
          ].filter(s => s.value !== null).map(stat => (
            <div key={stat.label} style={{
              flex: 1, padding: '5px 8px', textAlign: 'center',
              borderRight: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Custom stat cards ── */}
      {widget.stats && widget.stats.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', borderTop: '1px solid var(--border)' }}>
          {widget.stats.map(stat => {
            const val = states[stat.stateId]?.val;
            return (
              <div key={stat.stateId} style={{ flex: '1 0 50%', padding: '5px 10px', borderRight: '1px solid var(--border)' }}>
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
