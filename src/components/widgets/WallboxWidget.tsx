import { motion } from 'framer-motion';
import { useIoBrokerStates } from '../../hooks/useIoBrokerStates';
import { api } from '../../services/iobroker';
import { playSound } from '../../utils/sounds';
import { widgetColors } from '../../utils/theme';
import type { WallboxWidgetConfig } from '../../types/dashboard';

interface Props { widget: WallboxWidgetConfig }

function num(v: unknown): number | null {
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}

function fmt(v: number | null, unit = 'W'): string {
  if (v === null) return '–';
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)} k${unit}`;
  return `${Math.round(v)} ${unit}`;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  '1': { label: 'Bereit', color: '#8c94ad' },
  '2': { label: 'Warten', color: '#ffd166' },
  '3': { label: 'Lädt', color: '#6cff8f' },
  '4': { label: 'Fertig', color: '#5c7cff' },
  '5': { label: 'Fehler', color: '#ff6b7a' },
};

export default function WallboxWidget({ widget }: Props) {
  const ids = [
    widget.powerStateId, widget.socStateId, widget.statusStateId,
    widget.chargedStateId, widget.allowedCurrentStateId, widget.toggleStateId,
  ].filter(Boolean) as string[];
  const states = useIoBrokerStates(ids);

  const power = num(states[widget.powerStateId ?? '']?.val);
  const soc = num(states[widget.socStateId ?? '']?.val);
  const statusRaw = String(states[widget.statusStateId ?? '']?.val ?? '');
  const charged = num(states[widget.chargedStateId ?? '']?.val);
  const current = num(states[widget.allowedCurrentStateId ?? '']?.val);
  const isOn = Boolean(states[widget.toggleStateId ?? '']?.val);

  const status = STATUS_MAP[statusRaw] ?? { label: statusRaw || '–', color: '#8c94ad' };
  const isCharging = statusRaw === '3';
  const c = widgetColors.wallbox;

  const toggle = () => {
    if (!widget.toggleStateId) return;
    playSound('tap4');
    api.setState(widget.toggleStateId, !isOn).catch(console.error);
  };

  const setCurrentA = (delta: number) => {
    if (!widget.writeCurrentStateId) return;
    const next = Math.max(6, Math.min(32, (current ?? 16) + delta));
    playSound('tap3');
    api.setState(widget.writeCurrentStateId, next).catch(console.error);
  };

  return (
    <div className="widget-card">
      {widget.showTitle !== false && <div className="widget-title">{widget.title}</div>}

      <div className="widget-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Status pill + power */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{
            padding: '4px 10px', borderRadius: 20,
            background: `${status.color}20`,
            border: `1px solid ${status.color}60`,
            color: status.color, fontSize: 11, fontWeight: 600,
          }}>
            {status.label}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: isCharging ? c.charging : 'var(--text-muted)' }}>
            {fmt(power)}
          </div>
        </div>

        {/* SOC bar */}
        {soc !== null && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fahrzeug SOC</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: c.charging }}>{Math.round(soc)}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--card)', borderRadius: 3, overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${Math.max(0, Math.min(100, soc))}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ height: '100%', background: c.charging, borderRadius: 3 }}
              />
            </div>
          </div>
        )}

        {/* Charged today + current control */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {charged !== null && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{fmt(charged * 1000, 'Wh')}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Heute geladen</div>
            </div>
          )}
          {widget.writeCurrentStateId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => setCurrentA(-1)} style={btnStyle}>−</button>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{current ?? '–'} A</span>
              <button onClick={() => setCurrentA(1)} style={btnStyle}>+</button>
            </div>
          )}
        </div>

        {/* Toggle */}
        {widget.toggleStateId && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggle}
            style={{
              padding: '8px', borderRadius: 8,
              background: isOn ? 'rgba(108,255,143,0.15)' : 'var(--card)',
              border: `1px solid ${isOn ? c.charging : 'var(--border)'}`,
              color: isOn ? c.charging : 'var(--text-muted)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {isOn ? 'Laden aktiv' : 'Laden inaktiv'}
          </motion.button>
        )}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6,
  background: 'var(--card)', border: '1px solid var(--border)',
  color: 'var(--text)', fontSize: 16, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
