import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../services/iobroker';
import { playSound } from '../../utils/sounds';
import type { ScriptWidgetConfig } from '../../types/dashboard';

interface Props { widget: ScriptWidgetConfig }
type Script = { id: string; name: string; enabled: boolean };

export default function ScriptWidget({ widget }: Props) {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [running, setRunning] = useState<string | null>(null);

  useEffect(() => {
    api.getScripts().then(setScripts).catch(() => {});
  }, []);

  const filtered = widget.scriptId
    ? scripts.filter(s => s.id === widget.scriptId)
    : scripts;

  const run = async (id: string) => {
    setRunning(id);
    playSound('tap3');
    try {
      await api.runScript(id);
      playSound('confirm');
    } catch {
      playSound('error');
    } finally {
      setTimeout(() => setRunning(null), 1500);
    }
  };

  return (
    <div className="widget-card">
      {widget.showTitle !== false && <div className="widget-title">{widget.title}</div>}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Keine Scripts</div>}
        {filtered.map(s => (
          <motion.button
            key={s.id}
            whileTap={{ scale: 0.96 }}
            onClick={() => run(s.id)}
            disabled={!!running}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', borderRadius: 8,
              background: running === s.id ? 'rgba(92,124,255,0.15)' : 'var(--card)',
              border: `1px solid ${running === s.id ? 'rgba(92,124,255,0.4)' : 'var(--border)'}`,
              color: s.enabled ? 'var(--text)' : 'var(--text-muted)',
              fontSize: 12, cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span>{s.name}</span>
            {running === s.id ? (
              <span style={{ color: 'var(--accent)', fontSize: 10 }}>●</span>
            ) : (
              <PlayIcon />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

const PlayIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text-muted)' }}>
    <polygon points="5,3 19,12 5,21"/>
  </svg>
);
