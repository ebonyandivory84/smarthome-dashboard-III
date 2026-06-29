import { motion } from 'framer-motion';
import { useIoBrokerStates } from '../../hooks/useIoBrokerStates';
import { api } from '../../services/iobroker';
import { playSound } from '../../utils/sounds';
import type { WallboxWidgetConfig } from '../../types/dashboard';

interface Props { widget: WallboxWidgetConfig }

function num(v: unknown): number | null {
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}
function fmtKW(w: number | null): string {
  if (w === null) return '–';
  if (w >= 1000) return `${(w / 1000).toFixed(2)} kW`;
  return `${Math.round(w)} W`;
}
function fmtKWh(kwh: number | null): string {
  if (kwh === null) return '–';
  return `${kwh.toFixed(2)} kWh`;
}

const STATUS: Record<string, { label: string; color: string }> = {
  '1': { label: 'Bereit',  color: '#64748b' },
  '2': { label: 'Warten',  color: '#f59e0b' },
  '3': { label: 'Lädt',    color: '#6cff8f' },
  '4': { label: 'Fertig',  color: '#5c7cff' },
  '5': { label: 'Fehler',  color: '#ff6b7a' },
};

const AMP_PRESETS = [6, 10, 12, 14, 16];
const MAX_POWER_W = 11000;

export default function WallboxWidget({ widget }: Props) {
  const ids = [
    widget.powerStateId, widget.socStateId, widget.statusStateId,
    widget.chargedStateId, widget.allowedCurrentStateId, widget.toggleStateId,
  ].filter(Boolean) as string[];
  const states = useIoBrokerStates(ids);

  const power   = num(states[widget.powerStateId ?? '']?.val);
  const soc     = num(states[widget.socStateId ?? '']?.val);
  const statusRaw = String(states[widget.statusStateId ?? '']?.val ?? '');
  const charged = num(states[widget.chargedStateId ?? '']?.val);
  const current = num(states[widget.allowedCurrentStateId ?? '']?.val);
  const isOn    = Boolean(states[widget.toggleStateId ?? '']?.val);

  const status     = STATUS[statusRaw] ?? { label: statusRaw || '–', color: '#64748b' };
  const isCharging = statusRaw === '3';
  const powerPct   = Math.min(100, ((power ?? 0) / MAX_POWER_W) * 100);

  // Power bar gradient color stop
  const powerColor = powerPct >= 75 ? '#35cf84' : powerPct >= 45 ? '#f3c35d' : '#ef4f62';

  const toggle = () => {
    if (!widget.toggleStateId) return;
    playSound('tap4');
    api.setState(widget.toggleStateId, !isOn).catch(console.error);
  };

  const setAmpere = (a: number) => {
    if (!widget.writeCurrentStateId) return;
    playSound('tap3');
    api.setState(widget.writeCurrentStateId, a).catch(console.error);
  };

  const currentRound = current !== null ? Math.round(current) : null;

  return (
    <div className="widget-card" style={{ padding: 0, overflow: 'hidden' }}>
      {widget.showTitle !== false && (
        <div className="widget-title" style={{ padding: '8px 12px 0' }}>{widget.title}</div>
      )}

      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>

        {/* ── Status strip ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 10px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(191,209,245,0.14)',
          borderRadius: 10,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: status.color,
            boxShadow: `0 0 6px ${status.color}`,
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: status.color }}>{status.label}</span>
          <div style={{ marginLeft: 'auto', fontSize: 20, fontWeight: 800, color: isCharging ? '#6cff8f' : 'var(--text-muted)' }}>
            {fmtKW(power)}
          </div>
        </div>

        {/* ── Power bar 0–11 kW ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Ladeleistung</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>11 kW</span>
          </div>
          <div style={{ height: 7, background: 'var(--card)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
            {/* gradient track (always visible, clipped) */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, #ef4f62 0%, #f3c35d 52%, #35cf84 100%)',
              opacity: 0.25,
            }} />
            <motion.div
              animate={{ width: `${powerPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                height: '100%', borderRadius: 4,
                background: `linear-gradient(90deg, #ef4f62 0%, #f3c35d 52%, ${powerColor} 100%)`,
                position: 'relative',
              }}
            />
          </div>
        </div>

        {/* ── Vehicle SOC ── */}
        {soc !== null && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Fahrzeug Akku</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#5c7cff' }}>{Math.round(soc)} %</span>
            </div>
            <div style={{ height: 5, background: 'var(--card)', borderRadius: 3, overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${Math.max(0, Math.min(100, soc))}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ height: '100%', background: '#5c7cff', borderRadius: 3 }}
              />
            </div>
          </div>
        )}

        {/* ── Metrics row ── */}
        <div style={{ display: 'flex', gap: 6 }}>
          <MetricCard label="Session" value={fmtKWh(charged)} color={isCharging ? '#6cff8f' : 'var(--text)'} />
          <MetricCard label="Strom" value={currentRound !== null ? `${currentRound} A` : '–'} color="var(--text)" />
        </div>

        {/* ── Ampere presets ── */}
        {widget.writeCurrentStateId && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 5 }}>Ladestrom wählen</div>
            <div style={{ display: 'flex', gap: 5 }}>
              {AMP_PRESETS.map(a => {
                const active = currentRound === a;
                return (
                  <motion.button
                    key={a}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setAmpere(a)}
                    style={{
                      flex: 1, padding: '6px 2px',
                      borderRadius: 8, fontSize: 11, fontWeight: 600,
                      cursor: 'pointer',
                      background: active ? 'rgba(95,158,255,0.25)' : 'var(--card)',
                      border: `1px solid ${active ? 'rgba(95,158,255,0.6)' : 'var(--border)'}`,
                      color: active ? '#5f9eff' : 'var(--text-muted)',
                    }}
                  >
                    {a}A
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Toggle ── */}
        {widget.toggleStateId && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={toggle}
            style={{
              padding: '8px 12px', borderRadius: 10,
              background: isOn ? 'rgba(108,255,143,0.12)' : 'rgba(255,107,122,0.1)',
              border: `1px solid ${isOn ? 'rgba(108,255,143,0.4)' : 'rgba(255,107,122,0.35)'}`,
              color: isOn ? '#6cff8f' : '#ff6b7a',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isOn ? '#6cff8f' : '#ff6b7a',
              boxShadow: `0 0 5px ${isOn ? '#6cff8f' : '#ff6b7a'}`,
            }} />
            {isOn ? 'Laden aktiv' : 'Laden gesperrt'}
          </motion.button>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      flex: 1, padding: '7px 10px', borderRadius: 9,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(191,209,245,0.14)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  );
}
