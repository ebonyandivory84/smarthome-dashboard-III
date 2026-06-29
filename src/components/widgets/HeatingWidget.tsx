import { useState } from 'react';
import { motion } from 'framer-motion';
import { useIoBrokerStates } from '../../hooks/useIoBrokerStates';
import { api } from '../../services/iobroker';
import { playSound } from '../../utils/sounds';
import type { HeatingWidgetConfig } from '../../types/dashboard';

interface Props { widget: HeatingWidgetConfig }

const MODES = [
  { val: '0', label: 'Auto' },
  { val: '1', label: 'Comfort' },
  { val: '2', label: 'Sparsam' },
  { val: '3', label: 'Frost' },
  { val: '4', label: 'Off' },
];

export default function HeatingWidget({ widget }: Props) {
  const ids = [
    widget.tempActualStateId, widget.tempSetStateId,
    widget.modeReadStateId, widget.activeProgStateId,
    widget.tempSetNormalStateId, widget.tempSetReducedStateId, widget.tempSetFrostStateId,
  ].filter(Boolean) as string[];
  const states = useIoBrokerStates(ids);

  const tempActual = parseFloat(String(states[widget.tempActualStateId ?? '']?.val ?? 'NaN'));
  const tempSet = parseFloat(String(states[widget.tempSetStateId ?? '']?.val ?? 'NaN'));
  const mode = String(states[widget.modeReadStateId ?? '']?.val ?? '');
  const prog = String(states[widget.activeProgStateId ?? '']?.val ?? '');

  const isActive = !isNaN(tempActual) && !isNaN(tempSet) && tempActual < tempSet;
  const accent = isActive ? '#ff6b7a' : '#5c7cff';

  const setTemp = (delta: number) => {
    if (!widget.tempSetStateId) return;
    const next = Math.round(((isNaN(tempSet) ? 20 : tempSet) + delta) * 10) / 10;
    playSound('tap3');
    api.setState(widget.tempSetStateId, next).catch(console.error);
  };

  const setMode = (val: string) => {
    if (!widget.modeWriteStateId) return;
    playSound('tap4');
    api.setState(widget.modeWriteStateId, val).catch(console.error);
  };

  return (
    <div
      className="widget-card"
      style={{
        backgroundImage: widget.backgroundImage
          ? `linear-gradient(rgba(4,8,17,0.7),rgba(4,8,17,0.85)), url(${widget.backgroundImage}) center/cover`
          : undefined,
      }}
    >
      {widget.showTitle !== false && <div className="widget-title">{widget.title}</div>}

      <div className="widget-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Temperatures */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: accent, lineHeight: 1 }}>
              {isNaN(tempActual) ? '–' : `${tempActual.toFixed(1)}°`}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Ist</div>
          </div>

          {widget.tempSetStateId && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setTemp(-0.5)} style={btnStyle}>−</button>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', minWidth: 56, textAlign: 'center' }}>
                  {isNaN(tempSet) ? '–' : `${tempSet.toFixed(1)}°`}
                </div>
                <button onClick={() => setTemp(0.5)} style={btnStyle}>+</button>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Soll</div>
            </div>
          )}
        </div>

        {/* Heating indicator */}
        {isActive && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: accent, fontSize: 12 }}>
            <FlameIcon />
            Heizt
          </div>
        )}

        {/* Mode selector */}
        {widget.modeWriteStateId && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {MODES.map(m => (
              <motion.button
                key={m.val}
                whileTap={{ scale: 0.9 }}
                onClick={() => setMode(m.val)}
                style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                  background: mode === m.val ? `${accent}25` : 'var(--card)',
                  border: `1px solid ${mode === m.val ? `${accent}80` : 'var(--border)'}`,
                  color: mode === m.val ? accent : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                {m.label}
              </motion.button>
            ))}
          </div>
        )}

        {/* Active program */}
        {prog && (
          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
            Programm: <span style={{ color: 'var(--text)' }}>{prog}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6,
  background: 'var(--card)', border: '1px solid var(--border)',
  color: 'var(--text)', fontSize: 16, cursor: 'pointer',
};

const FlameIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2c0 0-5 4.5-5 10.5a5 5 0 0 0 10 0C17 6.5 12 2 12 2zm0 14.5a2.5 2.5 0 0 1-2.5-2.5C9.5 11.5 12 9 12 9s2.5 2.5 2.5 5a2.5 2.5 0 0 1-2.5 2.5z"/>
  </svg>
);
