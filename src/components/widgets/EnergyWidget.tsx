import { useIoBrokerStates } from '../../hooks/useIoBrokerStates';
import { widgetColors } from '../../utils/theme';
import type { EnergyWidgetConfig } from '../../types/dashboard';

interface Props { widget: EnergyWidgetConfig }

function num(v: unknown): number | null {
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}

function fmt(v: number | null, unit = 'W'): string {
  if (v === null) return '–';
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)} k${unit}`;
  return `${Math.round(v)} ${unit}`;
}

export default function EnergyWidget({ widget }: Props) {
  const ids = [widget.pvStateId, widget.houseStateId, widget.batteryStateId, widget.gridStateId].filter(Boolean) as string[];
  const states = useIoBrokerStates(ids);
  const g = (id?: string) => (id ? num(states[id]?.val) : null);

  const c = widgetColors.energy;
  const nodes = [
    { label: 'Solar', value: g(widget.pvStateId), color: c.pv },
    { label: 'Haus', value: g(widget.houseStateId), color: c.home },
    { label: 'Batterie', value: g(widget.batteryStateId), color: c.battery },
    { label: 'Netz', value: g(widget.gridStateId), color: c.grid },
  ].filter(n => n.value !== null);

  return (
    <div className="widget-card">
      {widget.showTitle !== false && <div className="widget-title">{widget.title}</div>}
      <div className="widget-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignContent: 'center' }}>
        {nodes.map(node => (
          <div
            key={node.label}
            style={{
              background: `${node.color}10`,
              border: `1px solid ${node.color}30`,
              borderRadius: 8, padding: '10px 12px',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: node.color }}>{fmt(node.value)}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{node.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
