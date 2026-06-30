import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../services/iobroker';
import { playSound } from '../../utils/sounds';
import type { ScriptWidgetConfig } from '../../types/dashboard';

interface Props { widget: ScriptWidgetConfig }
type Script = { id: string; name: string; enabled: boolean };

const PlayIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5,3 19,12 5,21" />
  </svg>
);

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
      <div style={{
        flex: 1, overflow: 'auto', padding: '8px 10px 10px',
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7,
        alignContent: 'start',
      }}>
        {filtered.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, gridColumn: '1/-1' }}>
            Keine Scripts
          </div>
        )}
        {filtered.map(s => {
          const isRunning = running === s.id;
          return (
            <motion.button
              key={s.id}
              whileTap={{ scale: 0.91 }}
              onClick={() => run(s.id)}
              disabled={!!running}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 7, padding: '10px 6px', borderRadius: 12, minHeight: 68,
                background: isRunning ? 'rgba(92,124,255,0.16)' : 'rgba(255,255,255,0.055)',
                border: `1px solid ${isRunning ? 'rgba(92,124,255,0.45)' : 'rgba(255,255,255,0.1)'}`,
                color: s.enabled ? 'var(--text)' : 'var(--text-muted)',
                cursor: running ? 'default' : 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isRunning ? 'rgba(92,124,255,0.28)' : 'rgba(255,255,255,0.09)',
                border: `1.5px solid ${isRunning ? 'rgba(92,124,255,0.55)' : 'rgba(255,255,255,0.14)'}`,
                color: isRunning ? 'var(--accent)' : 'var(--text-muted)',
              }}>
                {isRunning
                  ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
                  : <PlayIcon />}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600, lineHeight: 1.25, textAlign: 'center',
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                wordBreak: 'break-word', maxWidth: '100%',
              }}>
                {s.name}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
