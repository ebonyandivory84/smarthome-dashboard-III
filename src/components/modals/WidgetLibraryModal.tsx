import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { playSound } from '../../utils/sounds';
import type { WidgetType, WidgetConfig } from '../../types/dashboard';

interface Props { open: boolean; onClose: () => void }

type WidgetDef = { type: WidgetType; label: string; desc: string; icon: string; defaultH: number };

const WIDGETS: WidgetDef[] = [
  { type: 'state', label: 'State', desc: 'ioBroker State lesen/schreiben', icon: '⚡', defaultH: 2 },
  { type: 'camera', label: 'Kamera', desc: 'Snapshot, MJPEG oder FLV', icon: '📷', defaultH: 3 },
  { type: 'cameraTalk', label: 'Kamera + Talk', desc: 'Kamera mit Reolink/Instar Talkback', icon: '🎤', defaultH: 4 },
  { type: 'solar', label: 'Solar', desc: 'PV, Haus, Netz, Batterie', icon: '☀️', defaultH: 3 },
  { type: 'energy', label: 'Energie', desc: '4-Knoten Energiefluss', icon: '⚡', defaultH: 2 },
  { type: 'wallbox', label: 'Wallbox', desc: 'EV-Ladestation (go-e)', icon: '🔌', defaultH: 3 },
  { type: 'heating', label: 'Heizung', desc: 'Thermostat & Modus', icon: '🌡', defaultH: 3 },
  { type: 'grafana', label: 'Grafana', desc: 'Panel-Snapshot', icon: '📊', defaultH: 2 },
  { type: 'weather', label: 'Wetter', desc: 'Open-Meteo oder ioBroker-States', icon: '⛅', defaultH: 2 },
  { type: 'numpad', label: 'Numpad', desc: 'Zahleneingabe', icon: '🔢', defaultH: 3 },
  { type: 'link', label: 'Link', desc: 'URL-Shortcut oder iFrame', icon: '🔗', defaultH: 2 },
  { type: 'log', label: 'Log', desc: 'ioBroker Systemlogs', icon: '📋', defaultH: 3 },
  { type: 'script', label: 'Script', desc: 'JavaScript-Scripts starten', icon: '▶', defaultH: 2 },
  { type: 'systemStats', label: 'System', desc: 'CPU, RAM, Disk, Uptime', icon: '🖥', defaultH: 2 },
];

function makeDefaultWidget(def: WidgetDef, x = 0, y = 0): WidgetConfig {
  const base = {
    id: `widget-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: def.type as WidgetType,
    title: def.label,
    showTitle: true,
    layouts: {
      desktop: { x, y, w: 1, h: def.defaultH },
      tablet: { x: 0, y, w: 1, h: def.defaultH },
      phone: { x: 0, y, w: 1, h: def.defaultH },
    },
  };
  // Type-specific defaults
  switch (def.type) {
    case 'state': return { ...base, type: 'state', stateId: '', writeable: false, format: 'boolean' } as WidgetConfig;
    case 'camera': return { ...base, type: 'camera', previewMode: 'snapshot', refreshMs: 5000 } as WidgetConfig;
    case 'cameraTalk': return { ...base, type: 'cameraTalk', previewMode: 'snapshot', refreshMs: 5000 } as WidgetConfig;
    case 'grafana': return { ...base, type: 'grafana', snapshotUrl: '', refreshMs: 30000 } as WidgetConfig;
    case 'link': return { ...base, type: 'link', url: 'https://', openInOverlay: true } as WidgetConfig;
    default: return base as WidgetConfig;
  }
}

export function WidgetLibraryModal({ open, onClose }: Props) {
  const { addWidget, activePageId } = useDashboard();
  const [search, setSearch] = useState('');

  const filtered = WIDGETS.filter(w =>
    w.label.toLowerCase().includes(search.toLowerCase()) ||
    w.desc.toLowerCase().includes(search.toLowerCase())
  );

  const add = (def: WidgetDef) => {
    addWidget(activePageId, makeDefaultWidget(def));
    playSound('confirm');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end' }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{
              width: '100%', maxWidth: 600, margin: '0 auto',
              background: 'var(--panel-2)',
              border: '1px solid var(--border)',
              borderRadius: '20px 20px 0 0',
              padding: '20px 20px 32px',
              maxHeight: '80dvh',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>Widget hinzufügen</span>
              <button onClick={onClose} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', padding: '4px 10px' }}>✕</button>
            </div>

            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Suchen…"
              style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 10, color: 'var(--text)',
                fontSize: 13, padding: '10px 12px', outline: 'none', marginBottom: 14,
              }}
            />

            <div style={{ overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
              {filtered.map(def => (
                <motion.button
                  key={def.type}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => add(def)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    gap: 4, padding: '12px 14px',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{def.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{def.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>{def.desc}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
