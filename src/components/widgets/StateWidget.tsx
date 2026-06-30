import { motion } from 'framer-motion';
import { useIoBrokerState } from '../../hooks/useIoBrokerStates';
import { api } from '../../services/iobroker';
import { playSound } from '../../utils/sounds';
import type { StateWidgetConfig } from '../../types/dashboard';

interface Props { widget: StateWidgetConfig }

function resolveLabel(val: unknown, cfg: StateWidgetConfig): string {
  if (val === null || val === undefined) return '–';
  const s = String(val);
  if (cfg.valueLabels?.[s]) return cfg.valueLabels[s];
  if (cfg.format === 'boolean') {
    const on = Boolean(val === true || val === 1 || val === cfg.activeValue);
    return on ? (cfg.onLabel ?? 'An') : (cfg.offLabel ?? 'Aus');
  }
  if (cfg.unit) return `${s} ${cfg.unit}`;
  return s;
}

export default function StateWidget({ widget }: Props) {
  const state = useIoBrokerState(widget.stateId);
  const val = state?.val ?? null;

  const isOn = widget.format === 'boolean'
    ? Boolean(val === true || val === 1 || String(val) === widget.activeValue)
    : Boolean(val);

  const accent = widget.appearance?.accentColor ?? (isOn ? '#5c7cff' : '#8c94ad');

  const handlePress = () => {
    if (!widget.writeable) return;
    playSound(widget.sounds?.press ?? 'tap4');
    const next = widget.format === 'boolean'
      ? !isOn
      : widget.activeValue ?? !val;
    api.setState(widget.stateId, next).catch(console.error);
  };

  return (
    <motion.div
      className="widget-card"
      onClick={handlePress}
      whileTap={widget.writeable ? { scale: 0.95 } : undefined}
      style={{
        cursor: widget.writeable ? 'pointer' : 'default',
        background: isOn ? `${accent}1c` : 'var(--panel)',
        border: `1px solid ${isOn ? `${accent}55` : 'var(--border)'}`,
        transition: 'background 0.18s, border-color 0.18s',
      }}
    >
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', gap: 7,
        padding: '10px 8px',
      }}>
        {/* Icon / image */}
        {widget.iconImage ? (
          <img
            src={widget.iconImage}
            alt=""
            style={{
              width: 36, height: 36,
              borderRadius: widget.iconImageCrop === 'circle' ? '50%' : widget.iconImageCrop === 'rounded' ? 10 : 0,
              objectFit: 'cover',
              opacity: isOn ? 1 : 0.45,
              transition: 'opacity 0.18s',
            }}
          />
        ) : (
          <div style={{
            width: 36, height: 36, borderRadius: 11, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isOn ? `${accent}2e` : 'rgba(255,255,255,0.06)',
            border: `1.5px solid ${isOn ? `${accent}80` : 'rgba(255,255,255,0.1)'}`,
            boxShadow: isOn ? `0 0 12px ${accent}40` : 'none',
            transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
          }}>
            <div style={{
              width: 11, height: 11, borderRadius: '50%',
              background: isOn ? accent : 'var(--text-muted)',
              opacity: isOn ? 1 : 0.6,
            }} />
          </div>
        )}

        {widget.showTitle !== false && (
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text)',
            textAlign: 'center', lineHeight: 1.2, maxWidth: '100%',
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as const,
          }}>
            {widget.title}
          </div>
        )}

        {/* Value label */}
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: isOn ? accent : 'var(--text-muted)',
          textAlign: 'center',
          lineHeight: 1.1,
        }}>
          {resolveLabel(val, widget)}
        </div>
      </div>
    </motion.div>
  );
}
