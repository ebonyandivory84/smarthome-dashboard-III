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
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8,
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
              whileTap={{ scale: 0.95 }}
              onClick={() => run(s.id)}
              disabled={!!running}
              style={{
                display: 'flex', flexDirection: 'row',
                alignItems: 'center', gap: 9,
                padding: '8px 12px 8px 8px', borderRadius: 999, minHeight: 44,
                background: isRunning ? 'var(--grad-green)' : 'rgba(255,255,255,0.055)',
                border: `1px solid ${isRunning ? 'rgba(78,224,138,0.6)' : 'rgba(255,255,255,0.1)'}`,
                color: isRunning ? '#06281a' : (s.enabled ? 'var(--text)' : 'var(--text-muted)'),
                cursor: running ? 'default' : 'pointer',
                transition: 'background 0.18s, border-color 0.18s',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isRunning ? 'rgba(6,40,26,0.18)' : 'rgba(255,255,255,0.09)',
                border: `1.5px solid ${isRunning ? 'rgba(6,40,26,0.3)' : 'rgba(255,255,255,0.14)'}`,
                color: isRunning ? '#06281a' : 'var(--text-muted)',
              }}>
                {isRunning
                  ? <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#06281a' }} />
                  : <PlayIcon />}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, lineHeight: 1.25, textAlign: 'left',
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                wordBreak: 'break-word', flex: 1,
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
