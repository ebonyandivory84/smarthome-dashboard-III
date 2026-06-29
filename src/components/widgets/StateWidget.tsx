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
    <div
      className="widget-card"
      onClick={handlePress}
      style={{ cursor: widget.writeable ? 'pointer' : 'default' }}
    >
      {widget.showTitle !== false && <div className="widget-title">{widget.title}</div>}

      <div className="widget-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        {/* Icon / image */}
        {widget.iconImage ? (
          <img
            src={widget.iconImage}
            alt=""
            style={{
              width: 48, height: 48,
              borderRadius: widget.iconImageCrop === 'circle' ? '50%' : widget.iconImageCrop === 'rounded' ? 10 : 0,
              objectFit: 'cover',
              opacity: isOn ? 1 : 0.4,
              transition: 'opacity 0.2s',
            }}
          />
        ) : (
          <motion.div
            animate={{ scale: isOn ? 1 : 0.85, opacity: isOn ? 1 : 0.4 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              width: 40, height: 40,
              borderRadius: '50%',
              background: isOn ? accent : 'var(--card)',
              border: `2px solid ${isOn ? accent : 'var(--border)'}`,
              boxShadow: isOn ? `0 0 16px ${accent}60` : 'none',
              transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
            }}
          />
        )}

        {/* Value label */}
        <div style={{
          fontSize: 22,
          fontWeight: 700,
          color: isOn ? 'var(--text)' : 'var(--text-muted)',
          textAlign: 'center',
          lineHeight: 1.1,
        }}>
          {resolveLabel(val, widget)}
        </div>
      </div>
    </div>
  );
}
