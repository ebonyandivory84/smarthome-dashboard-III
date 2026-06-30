import { motion } from 'framer-motion';
import { useIoBrokerStates } from '../../hooks/useIoBrokerStates';
import { api } from '../../services/iobroker';
import { playSound } from '../../utils/sounds';
import type { HeatingWidgetConfig } from '../../types/dashboard';

interface Props { widget: HeatingWidgetConfig }

// Viessmann mode values
const MODES = [
  { val: 'standby',        label: 'Standby',    icon: '○', color: 'rgba(178,188,205,0.28)' },
  { val: 'dhw',            label: 'Warmwasser', icon: '◎', color: 'rgba(116,199,255,0.28)' },
  { val: 'heating',        label: 'Heizen',     icon: '◈', color: 'rgba(255,183,106,0.28)' },
  { val: 'dhwAndHeating',  label: 'Auto',       icon: '◉', color: 'rgba(108,255,143,0.22)' },
];

// Temperature → card color (cold → warm)
const TEMP_STOPS: [number, string][] = [
  [14, '#1f49a5'],
  [18, '#4a9ef0'],
  [21, '#3ec96c'],
  [23, '#f2b23c'],
  [27, '#a51c2e'],
];

function tempColor(t: number): string {
  const stops = TEMP_STOPS;
  if (t <= stops[0][0]) return stops[0][1];
  if (t >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t >= t0 && t <= t1) {
      const p = (t - t0) / (t1 - t0);
      return lerpColor(c0, c1, p);
    }
  }
  return stops[0][1];
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 0xff) * (1 - t) + ((pb >> 16) & 0xff) * t);
  const g = Math.round(((pa >> 8) & 0xff) * (1 - t) + ((pb >> 8) & 0xff) * t);
  const bv = Math.round((pa & 0xff) * (1 - t) + (pb & 0xff) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bv.toString(16).padStart(2, '0')}`;
}

export default function HeatingWidget({ widget }: Props) {
  const ids = [
    widget.tempActualStateId, widget.tempSetStateId,
    widget.tempSetNormalStateId, widget.tempSetReducedStateId,
    widget.modeReadStateId, widget.activeProgStateId, widget.valveStateId,
  ].filter(Boolean) as string[];

  const states = useIoBrokerStates(ids);
  const s = (id?: string) => states[id ?? '']?.val;

  const tempActual = parseFloat(String(s(widget.tempActualStateId) ?? 'NaN'));
  const tempSet    = parseFloat(String(s(widget.tempSetStateId) ?? s(widget.tempSetNormalStateId) ?? 'NaN'));
  const mode       = String(s(widget.modeReadStateId) ?? '');
  const prog       = String(s(widget.activeProgStateId) ?? '');
  const valveOn    = Boolean(s(widget.valveStateId));

  const hasActual = !isNaN(tempActual);
  const hasSet    = !isNaN(tempSet);
  const isHeating = hasActual && hasSet && tempActual < tempSet - 0.3;

  const accent = isHeating ? '#ff9c54' : '#5c7cff';
  const cardColor = hasActual ? tempColor(tempActual) : '#4a9ef0';

  const setTemp = (delta: number) => {
    const stateId = widget.tempSetStateId ?? widget.tempSetNormalStateId;
    if (!stateId) return;
    const next = Math.round(((isNaN(tempSet) ? 20 : tempSet) + delta) * 2) / 2; // 0.5 steps
    playSound('tap3');
    api.setState(stateId, next).catch(console.error);
  };

  const setMode = (val: string) => {
    if (!widget.modeWriteStateId) return;
    playSound('tap4');
    api.setState(widget.modeWriteStateId, val).catch(console.error);
  };

  // Status ticker text
  const tickerParts = [
    isHeating ? 'Heizt aktiv' : 'Standby',
    valveOn ? 'Kompressor an' : null,
    prog ? `Programm: ${prog}` : null,
    mode ? `Modus: ${mode}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div
      className="widget-card"
      style={{
        padding: 0, overflow: 'hidden',
        backgroundImage: widget.backgroundImage
          ? `linear-gradient(rgba(4,8,17,0.72),rgba(4,8,17,0.88)), url(${widget.backgroundImage}) center/cover`
          : undefined,
      }}
    >
      {widget.showTitle !== false && (
        <div className="widget-title" style={{ padding: '8px 12px 0' }}>{widget.title}</div>
      )}

      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>

        {/* ── Temperature KPI card ── */}
        <div style={{
          borderRadius: 16, padding: '10px 12px',
          background: `${cardColor}18`,
          border: `1px solid ${cardColor}50`,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Subtle blink overlay when actively heating */}
          {isHeating && (
            <motion.div
              animate={{ opacity: [0.08, 0.22, 0.08] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute', inset: 0,
                background: cardColor,
                pointerEvents: 'none',
              }}
            />
          )}

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', position: 'relative' }}>
            {/* Actual temp */}
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ist</div>
              <div style={{ fontSize: 38, fontWeight: 800, color: cardColor, lineHeight: 1 }}>
                {hasActual ? `${tempActual.toFixed(1)}°` : '–'}
              </div>
            </div>

            {/* Setpoint control */}
            {(widget.tempSetStateId || widget.tempSetNormalStateId) && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Soll</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StepBtn onClick={() => setTemp(-0.5)}>−</StepBtn>
                  <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', minWidth: 52, textAlign: 'center' }}>
                    {hasSet ? `${tempSet.toFixed(1)}°` : '–'}
                  </span>
                  <StepBtn onClick={() => setTemp(0.5)}>+</StepBtn>
                </div>
              </div>
            )}
          </div>

          {/* Heating indicator */}
          {isHeating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, color: accent, fontSize: 11, fontWeight: 600, position: 'relative' }}>
              <FlameIcon />
              Heizt
              {valveOn && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · Kompressor aktiv</span>}
            </div>
          )}
        </div>

        {/* ── Mode selector ── */}
        {widget.modeWriteStateId && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Betriebsart</div>
            <div style={{
              display: 'flex', gap: 5,
              padding: 5, borderRadius: 14,
              background: 'rgba(255,255,255,0.035)',
              border: '1px solid rgba(184,206,242,0.14)',
            }}>
              {MODES.map(m => {
                const active = mode === m.val || mode.includes(m.val);
                return (
                  <motion.button
                    key={m.val}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setMode(m.val)}
                    style={{
                      flex: 1, padding: '6px 4px',
                      borderRadius: 10, fontSize: 10, fontWeight: 700,
                      cursor: 'pointer', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 2,
                      background: active ? m.color : 'transparent',
                      border: `1px solid ${active ? 'rgba(173,204,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
                      color: active ? 'var(--text)' : 'var(--text-muted)',
                    }}
                  >
                    <span style={{ fontSize: 13 }}>{m.icon}</span>
                    <span>{m.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Reduced / frost setpoints ── */}
        {(widget.tempSetNormalStateId || widget.tempSetReducedStateId) && (
          <div style={{ display: 'flex', gap: 6 }}>
            {widget.tempSetNormalStateId && (
              <TempCard
                label="Normal"
                value={parseFloat(String(s(widget.tempSetNormalStateId) ?? 'NaN'))}
                color="#5c7cff"
              />
            )}
            {widget.tempSetReducedStateId && (
              <TempCard
                label="Reduziert"
                value={parseFloat(String(s(widget.tempSetReducedStateId) ?? 'NaN'))}
                color="#94a3b8"
              />
            )}
          </div>
        )}

        {/* ── Status ticker ── */}
        {tickerParts && (
          <div style={{
            padding: '6px 10px', borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(184,206,242,0.12)',
            overflow: 'hidden', whiteSpace: 'nowrap',
          }}>
            <TickerText text={tickerParts} />
          </div>
        )}
      </div>
    </div>
  );
}

function StepBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      style={{
        width: 28, height: 28, borderRadius: 7,
        background: 'var(--card)', border: '1px solid var(--border)',
        color: 'var(--text)', fontSize: 17, fontWeight: 800,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </motion.button>
  );
}

function TempCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      flex: 1, padding: '6px 10px', borderRadius: 12,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(191,209,245,0.14)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color }}>
        {isNaN(value) ? '–' : `${value.toFixed(1)}°`}
      </div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>{label}</div>
    </div>
  );
}

// Smooth-scrolling ticker — CSS animation only (no JS)
let tickerStyleInjected = false;
function TickerText({ text }: { text: string }) {
  if (!tickerStyleInjected && typeof document !== 'undefined') {
    tickerStyleInjected = true;
    const s = document.createElement('style');
    s.textContent = `
      @keyframes tickerScroll {
        0%   { transform: translate3d(0, 0, 0); }
        100% { transform: translate3d(-50%, 0, 0); }
      }
    `;
    document.head.appendChild(s);
  }

  const full = `${text}    ·    ${text}    `;
  const dur = Math.max(8, text.length * 0.25);

  return (
    <div style={{ display: 'flex', overflow: 'hidden' }}>
      <span style={{
        display: 'inline-block',
        whiteSpace: 'nowrap',
        fontSize: 11, fontWeight: 600,
        color: 'var(--text-muted)',
        animationName: 'tickerScroll',
        animationDuration: `${dur}s`,
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
      }}>
        {full}
      </span>
    </div>
  );
}

const FlameIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2c0 0-5 4.5-5 10.5a5 5 0 0 0 10 0C17 6.5 12 2 12 2zm0 14.5a2.5 2.5 0 0 1-2.5-2.5C9.5 11.5 12 9 12 9s2.5 2.5 2.5 5a2.5 2.5 0 0 1-2.5 2.5z"/>
  </svg>
);
