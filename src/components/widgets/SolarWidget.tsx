import { motion } from 'framer-motion';
import { useIoBrokerStates } from '../../hooks/useIoBrokerStates';
import { widgetColors } from '../../utils/theme';
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

export default function SolarWidget({ widget }: Props) {
  const ids = [
    widget.pvStateId,
    widget.homeStateId,
    widget.gridStateId,
    widget.batteryStateId,
    widget.socStateId,
    widget.pvDayStateId,
    widget.homeDayStateId,
    widget.selfDayStateId,
    widget.battTempStateId,
    ...(widget.stats?.map(s => s.stateId) ?? []),
  ].filter(Boolean) as string[];

  const states = useIoBrokerStates(ids);
  const g = (id?: string) => (id ? num(states[id]?.val) : null);

  const pv = g(widget.pvStateId);
  const home = g(widget.homeStateId);
  const grid = g(widget.gridStateId);
  const batt = g(widget.batteryStateId);
  const soc = g(widget.socStateId);
  const pvDay = g(widget.pvDayStateId);
  const homeDay = g(widget.homeDayStateId);
  const selfDay = g(widget.selfDayStateId);

  const c = widgetColors.solar;

  const nodes = [
    { id: 'pv', label: 'Solar', value: fmt(pv), color: c.pv, icon: SunIcon },
    { id: 'home', label: 'Haus', value: fmt(home), color: c.home, icon: HomeIcon },
    { id: 'grid', label: grid !== null && grid < 0 ? 'Export' : 'Import', value: grid !== null ? fmt(Math.abs(grid)) : '–', color: c.grid, icon: GridIcon },
    { id: 'batt', label: 'Batterie', value: soc !== null ? `${Math.round(soc)}%` : fmt(batt), color: c.battery, icon: BattIcon },
  ].filter((n) => {
    if (n.id === 'batt') return widget.batteryStateId || widget.socStateId;
    if (n.id === 'grid') return widget.gridStateId;
    return true;
  });

  return (
    <div className="widget-card">
      {widget.showTitle !== false && <div className="widget-title">{widget.title}</div>}

      {/* Power nodes */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px 12px', flexWrap: 'wrap', gap: 8 }}>
        {nodes.map(node => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              minWidth: 60,
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: `${node.color}20`,
              border: `1.5px solid ${node.color}60`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: node.color,
            }}>
              <node.icon />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: node.color }}>{node.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{node.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Battery SOC bar */}
      {soc !== null && (
        <div style={{ padding: '0 12px 8px' }}>
          <div style={{ height: 4, background: 'var(--card)', borderRadius: 2, overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${Math.max(0, Math.min(100, soc))}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ height: '100%', background: c.battery, borderRadius: 2 }}
            />
          </div>
        </div>
      )}

      {/* Daily stats */}
      {(pvDay !== null || homeDay !== null || selfDay !== null) && (
        <div style={{ display: 'flex', gap: 0, borderTop: '1px solid var(--border)' }}>
          {[
            { label: 'PV heute', value: pvDay !== null ? fmt(pvDay * 1000, 'Wh') : null, color: c.pv },
            { label: 'Verbrauch', value: homeDay !== null ? fmt(homeDay * 1000, 'Wh') : null, color: c.home },
            { label: 'Eigennutz', value: selfDay !== null ? `${Math.round(selfDay)}%` : null, color: c.grid },
          ].filter(s => s.value !== null).map(stat => (
            <div key={stat.label} style={{ flex: 1, padding: '6px 8px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Custom stat cards */}
      {widget.stats && widget.stats.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', borderTop: '1px solid var(--border)' }}>
          {widget.stats.map(stat => {
            const val = states[stat.stateId]?.val;
            return (
              <div key={stat.stateId} style={{ flex: '1 0 50%', padding: '6px 10px', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: stat.color ?? 'var(--text)' }}>
                  {val != null ? `${val}${stat.unit ? ' ' + stat.unit : ''}` : '–'}
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

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const HomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);
const GridIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
);
const BattIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="6" width="18" height="12" rx="2"/><path d="M23 13v-2"/>
  </svg>
);
