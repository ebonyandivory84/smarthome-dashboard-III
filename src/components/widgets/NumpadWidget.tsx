import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../services/iobroker';
import { playSound } from '../../utils/sounds';
import type { NumpadWidgetConfig } from '../../types/dashboard';

interface Props { widget: NumpadWidgetConfig }

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['C', '0', '✓'],
];

export default function NumpadWidget({ widget }: Props) {
  const [input, setInput] = useState('');
  const max = widget.maxLength ?? 6;

  const press = (key: string) => {
    playSound('tap5');
    if (key === 'C') { setInput(''); return; }
    if (key === '✓') {
      if (widget.stateId) api.setState(widget.stateId, input).catch(console.error);
      if (widget.confirmStateId) api.setState(widget.confirmStateId, true).catch(console.error);
      playSound('confirm');
      setInput('');
      return;
    }
    if (input.length < max) setInput(p => p + key);
  };

  return (
    <div className="widget-card">
      {widget.showTitle !== false && <div className="widget-title">{widget.title}</div>}

      <div className="widget-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Display */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 8, padding: '10px 14px',
          fontSize: 22, fontWeight: 700,
          letterSpacing: 6, textAlign: 'center',
          color: input ? 'var(--text)' : 'var(--text-muted)',
          minHeight: 46, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {input ? '•'.repeat(input.length) : '––––'}
        </div>

        {/* Keys */}
        {KEYS.map((row, ri) => (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {row.map(key => (
              <motion.button
                key={key}
                whileTap={{ scale: 0.88 }}
                onClick={() => press(key)}
                style={{
                  height: 40, borderRadius: 8, fontSize: 16, fontWeight: 600,
                  background: key === '✓' ? 'rgba(108,255,143,0.15)' : key === 'C' ? 'rgba(255,107,122,0.12)' : 'var(--card)',
                  border: `1px solid ${key === '✓' ? 'rgba(108,255,143,0.4)' : key === 'C' ? 'rgba(255,107,122,0.3)' : 'var(--border)'}`,
                  color: key === '✓' ? '#6cff8f' : key === 'C' ? '#ff6b7a' : 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                {key}
              </motion.button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
