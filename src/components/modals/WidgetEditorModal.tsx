import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { playSound } from '../../utils/sounds';
import type {
  WidgetConfig, StateWidgetConfig, CameraWidgetConfig,
  SolarWidgetConfig, EnergyWidgetConfig, WallboxWidgetConfig, HeatingWidgetConfig,
  GrafanaWidgetConfig, WeatherWidgetConfig, NumpadWidgetConfig, LinkWidgetConfig,
  LogWidgetConfig, ScriptWidgetConfig, SystemStatsWidgetConfig,
} from '../../types/dashboard';

interface Props {
  open: boolean;
  widget: WidgetConfig | null;
  pageId: string;
  onClose: () => void;
}

export function WidgetEditorModal({ open, widget, pageId, onClose }: Props) {
  const { updateWidget, removeWidget } = useDashboard();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!widget) return null;

  const update = (patch: Partial<WidgetConfig>) => {
    updateWidget(pageId, widget.id, patch);
  };

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    removeWidget(pageId, widget.id);
    playSound('error');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end' }}
          onClick={e => { if (e.target === e.currentTarget) { setConfirmDelete(false); onClose(); } }}
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
              padding: '20px 20px 36px',
              maxHeight: '90dvh',
              overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Widget bearbeiten</span>
              <button onClick={() => { setConfirmDelete(false); onClose(); }} style={closeBtnStyle}>✕</button>
            </div>

            {/* Common fields */}
            <Field label="Titel">
              <input
                value={widget.title ?? ''}
                onChange={e => update({ title: e.target.value })}
                style={inputStyle}
              />
            </Field>
            <Field label="Titel anzeigen">
              <Toggle
                value={widget.showTitle !== false}
                onChange={v => update({ showTitle: v })}
              />
            </Field>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

            {/* Type-specific fields */}
            {widget.type === 'state' && <StateEditor widget={widget as StateWidgetConfig} update={update} />}
            {widget.type === 'camera' && <CameraEditor widget={widget as CameraWidgetConfig} update={update} />}
            {widget.type === 'cameraTalk' && <CameraTalkEditor widget={widget as CameraWidgetConfig} update={update} />}
            {widget.type === 'solar' && <SolarEditor widget={widget as SolarWidgetConfig} update={update} />}
            {widget.type === 'energy' && <EnergyEditor widget={widget as EnergyWidgetConfig} update={update} />}
            {widget.type === 'wallbox' && <WallboxEditor widget={widget as WallboxWidgetConfig} update={update} />}
            {widget.type === 'heating' && <HeatingEditor widget={widget as HeatingWidgetConfig} update={update} />}
            {widget.type === 'grafana' && <GrafanaEditor widget={widget as GrafanaWidgetConfig} update={update} />}
            {widget.type === 'weather' && <WeatherEditor widget={widget as WeatherWidgetConfig} update={update} />}
            {widget.type === 'numpad' && <NumpadEditor widget={widget as NumpadWidgetConfig} update={update} />}
            {widget.type === 'link' && <LinkEditor widget={widget as LinkWidgetConfig} update={update} />}
            {widget.type === 'log' && <LogEditor widget={widget as LogWidgetConfig} update={update} />}
            {widget.type === 'script' && <ScriptEditor widget={widget as ScriptWidgetConfig} update={update} />}
            {widget.type === 'systemStats' && <SystemStatsEditor widget={widget as SystemStatsWidgetConfig} update={update} />}

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

            {/* Delete */}
            <button
              onClick={handleDelete}
              onBlur={() => setConfirmDelete(false)}
              style={{
                padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: confirmDelete ? 'rgba(255,107,122,0.15)' : 'var(--card)',
                border: `1px solid ${confirmDelete ? 'rgba(255,107,122,0.5)' : 'var(--border)'}`,
                color: 'var(--accent-red)',
              }}
            >
              {confirmDelete ? 'Nochmal klicken zum Löschen' : 'Widget löschen'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Type-specific editors ─────────────────────────────────────────────────────

function StateEditor({ widget, update }: { widget: StateWidgetConfig; update: (p: Partial<WidgetConfig>) => void }) {
  return (
    <>
      <Field label="State-ID">
        <input value={widget.stateId ?? ''} onChange={e => update({ stateId: e.target.value } as Partial<StateWidgetConfig>)} style={inputStyle} placeholder="adapter.0.channel.state" />
      </Field>
      <Field label="Format">
        <Select
          value={widget.format ?? 'boolean'}
          options={[
            { value: 'boolean', label: 'Boolean (Ein/Aus)' },
            { value: 'number', label: 'Zahl' },
            { value: 'string', label: 'Text' },
            { value: 'button', label: 'Button' },
          ]}
          onChange={v => update({ format: v } as Partial<StateWidgetConfig>)}
        />
      </Field>
      <Field label="Schreibbar">
        <Toggle value={widget.writeable ?? false} onChange={v => update({ writeable: v } as Partial<StateWidgetConfig>)} />
      </Field>
      {widget.format === 'number' && (
        <>
          <Field label="Einheit">
            <input value={widget.unit ?? ''} onChange={e => update({ unit: e.target.value } as Partial<StateWidgetConfig>)} style={inputStyle} placeholder="kWh, °C, %" />
          </Field>
          <Field label="Dezimalstellen">
            <input type="number" min={0} max={4} value={widget.decimals ?? 1} onChange={e => update({ decimals: Number(e.target.value) } as Partial<StateWidgetConfig>)} style={inputStyle} />
          </Field>
        </>
      )}
      {widget.format === 'boolean' && (
        <>
          <Field label="Label Ein">
            <input value={widget.labelOn ?? 'Ein'} onChange={e => update({ labelOn: e.target.value } as Partial<StateWidgetConfig>)} style={inputStyle} />
          </Field>
          <Field label="Label Aus">
            <input value={widget.labelOff ?? 'Aus'} onChange={e => update({ labelOff: e.target.value } as Partial<StateWidgetConfig>)} style={inputStyle} />
          </Field>
        </>
      )}

    </>
  );
}

function CameraEditor({ widget, update }: { widget: CameraWidgetConfig; update: (p: Partial<WidgetConfig>) => void }) {
  const mode = widget.previewMode ?? 'snapshot';
  const fsMode = widget.fullscreenMode ?? mode;
  const previewUrl = mode === 'snapshot' ? widget.snapshotUrl : mode === 'mjpeg' ? widget.mjpegUrl : widget.flvUrl;
  const fsUrl = fsMode === 'snapshot' ? widget.fullscreenSnapshotUrl : fsMode === 'mjpeg' ? widget.fullscreenMjpegUrl : widget.fullscreenFlvUrl;

  const setPreviewUrl = (v: string) => {
    if (mode === 'snapshot') update({ snapshotUrl: v } as Partial<CameraWidgetConfig>);
    else if (mode === 'mjpeg') update({ mjpegUrl: v } as Partial<CameraWidgetConfig>);
    else update({ flvUrl: v } as Partial<CameraWidgetConfig>);
  };
  const setFsUrl = (v: string) => {
    if (fsMode === 'snapshot') update({ fullscreenSnapshotUrl: v } as Partial<CameraWidgetConfig>);
    else if (fsMode === 'mjpeg') update({ fullscreenMjpegUrl: v } as Partial<CameraWidgetConfig>);
    else update({ fullscreenFlvUrl: v } as Partial<CameraWidgetConfig>);
  };

  return (
    <>
      <Field label="Vorschau-Modus">
        <Select value={mode} options={[
          { value: 'snapshot', label: 'Snapshot' }, { value: 'mjpeg', label: 'MJPEG' }, { value: 'flv', label: 'FLV' },
        ]} onChange={v => update({ previewMode: v as 'snapshot' | 'mjpeg' | 'flv' })} />
      </Field>
      <Field label={`Vorschau-URL (${mode.toUpperCase()})`}>
        <input value={previewUrl ?? ''} onChange={e => setPreviewUrl(e.target.value)} style={inputStyle} placeholder="http://..." />
      </Field>
      <Field label="Vollbild-Modus">
        <Select value={fsMode} options={[
          { value: 'snapshot', label: 'Snapshot' }, { value: 'mjpeg', label: 'MJPEG' }, { value: 'flv', label: 'FLV' },
        ]} onChange={v => update({ fullscreenMode: v as 'snapshot' | 'mjpeg' | 'flv' })} />
      </Field>
      <Field label={`Vollbild-URL (${fsMode.toUpperCase()})`}>
        <input value={fsUrl ?? ''} onChange={e => setFsUrl(e.target.value)} style={inputStyle} placeholder="http://..." />
      </Field>
      <Field label="Refresh (ms)">
        <input type="number" min={500} step={500} value={widget.refreshMs ?? 5000} onChange={e => update({ refreshMs: Number(e.target.value) } as Partial<CameraWidgetConfig>)} style={inputStyle} />
      </Field>
      <Field label="Maximize State-ID (optional)">
        <input value={widget.maximizeStateId ?? ''} onChange={e => update({ maximizeStateId: e.target.value } as Partial<CameraWidgetConfig>)} style={inputStyle} placeholder="adapter.0.maximize" />
      </Field>
    </>
  );
}

function CameraTalkEditor({ widget, update }: { widget: CameraWidgetConfig; update: (p: Partial<WidgetConfig>) => void }) {
  return (
    <>
      <CameraEditor widget={widget} update={update} />
      <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
      <Field label="Talkback-Typ">
        <Select value={widget.talkType ?? 'instar'} options={[
          { value: 'instar', label: 'Instar (WebSocket PCM)' }, { value: 'reolink', label: 'Reolink (WebRTC)' },
        ]} onChange={v => update({ talkType: v } as Partial<CameraTalkWidgetConfig>)} />
      </Field>
      <Field label="Kamera-Basis-URL">
        <input value={widget.talkBaseUrl ?? ''} onChange={e => update({ talkBaseUrl: e.target.value } as Partial<CameraTalkWidgetConfig>)} style={inputStyle} placeholder="http://192.168.x.x" />
      </Field>
      <Field label="Benutzername">
        <input value={widget.talkUser ?? ''} onChange={e => update({ talkUser: e.target.value } as Partial<CameraTalkWidgetConfig>)} style={inputStyle} />
      </Field>
      <Field label="Passwort">
        <input type="password" value={widget.talkPass ?? ''} onChange={e => update({ talkPass: e.target.value } as Partial<CameraTalkWidgetConfig>)} style={inputStyle} />
      </Field>
    </>
  );
}

function SolarEditor({ widget, update }: { widget: SolarWidgetConfig; update: (p: Partial<WidgetConfig>) => void }) {
  const fields: [keyof SolarWidgetConfig, string][] = [
    ['pvStateId', 'PV-Leistung (W)'], ['homeStateId', 'Hausverbrauch (W)'],
    ['gridStateId', 'Netz (W)'], ['batteryStateId', 'Batterie (W)'],
    ['socStateId', 'Batterie SoC (%)'],
  ];
  return (
    <>
      {fields.map(([key, label]) => (
        <Field key={key} label={label}>
          <input value={(widget[key] as string) ?? ''} onChange={e => update({ [key]: e.target.value } as Partial<SolarWidgetConfig>)} style={inputStyle} placeholder="adapter.0...." />
        </Field>
      ))}
    </>
  );
}

function EnergyEditor({ widget, update }: { widget: EnergyWidgetConfig; update: (p: Partial<WidgetConfig>) => void }) {
  const fields: [keyof EnergyWidgetConfig, string][] = [
    ['pvStateId', 'PV (W)'], ['houseStateId', 'Haus (W)'],
    ['batteryStateId', 'Batterie (W)'], ['gridStateId', 'Netz (W)'],
    ['socStateId', 'SoC (%)'],
  ];
  return (
    <>
      {fields.map(([key, label]) => (
        <Field key={key} label={label}>
          <input value={(widget[key] as string) ?? ''} onChange={e => update({ [key]: e.target.value } as Partial<EnergyWidgetConfig>)} style={inputStyle} placeholder="adapter.0...." />
        </Field>
      ))}
    </>
  );
}

function WallboxEditor({ widget, update }: { widget: WallboxWidgetConfig; update: (p: Partial<WidgetConfig>) => void }) {
  const fields: [keyof WallboxWidgetConfig, string][] = [
    ['powerStateId', 'Leistung (W)'], ['socStateId', 'SoC (%)'],
    ['statusStateId', 'Status'], ['chargedStateId', 'Geladen (kWh)'],
    ['allowedCurrentStateId', 'Max. Strom lesen'], ['writeCurrentStateId', 'Max. Strom schreiben'],
    ['toggleStateId', 'Laden erlaubt'],
  ];
  return (
    <>
      {fields.map(([key, label]) => (
        <Field key={key} label={label}>
          <input value={(widget[key] as string) ?? ''} onChange={e => update({ [key]: e.target.value } as Partial<WallboxWidgetConfig>)} style={inputStyle} placeholder="goe-charger.0...." />
        </Field>
      ))}
    </>
  );
}

function HeatingEditor({ widget, update }: { widget: HeatingWidgetConfig; update: (p: Partial<WidgetConfig>) => void }) {
  const fields: [keyof HeatingWidgetConfig, string][] = [
    ['tempActualStateId', 'Ist-Temperatur'], ['tempSetStateId', 'Soll-Temperatur'],
    ['modeReadStateId', 'Modus lesen'], ['modeWriteStateId', 'Modus schreiben'],
    ['humidityStateId', 'Luftfeuchtigkeit'], ['valveStateId', 'Ventilposition'],
  ];
  return (
    <>
      {fields.map(([key, label]) => (
        <Field key={key} label={label}>
          <input value={(widget[key] as string) ?? ''} onChange={e => update({ [key]: e.target.value } as Partial<HeatingWidgetConfig>)} style={inputStyle} placeholder="adapter.0...." />
        </Field>
      ))}
      <Field label="Min Temp (°C)">
        <input type="number" value={widget.minTemp ?? 16} onChange={e => update({ minTemp: Number(e.target.value) } as Partial<HeatingWidgetConfig>)} style={inputStyle} />
      </Field>
      <Field label="Max Temp (°C)">
        <input type="number" value={widget.maxTemp ?? 28} onChange={e => update({ maxTemp: Number(e.target.value) } as Partial<HeatingWidgetConfig>)} style={inputStyle} />
      </Field>
    </>
  );
}

function GrafanaEditor({ widget, update }: { widget: GrafanaWidgetConfig; update: (p: Partial<WidgetConfig>) => void }) {
  return (
    <>
      <Field label="Snapshot-URL (Grafana /render/...)">
        <input value={widget.snapshotUrl ?? ''} onChange={e => update({ snapshotUrl: e.target.value } as Partial<GrafanaWidgetConfig>)} style={inputStyle} placeholder="http://grafana:3000/render/d-solo/..." />
      </Field>
      <Field label="Refresh (ms)">
        <input type="number" min={5000} step={1000} value={widget.refreshMs ?? 30000} onChange={e => update({ refreshMs: Number(e.target.value) } as Partial<GrafanaWidgetConfig>)} style={inputStyle} />
      </Field>
      <Field label="Breite (px, optional)">
        <input type="number" value={widget.width ?? 800} onChange={e => update({ width: Number(e.target.value) } as Partial<GrafanaWidgetConfig>)} style={inputStyle} />
      </Field>
      <Field label="Höhe (px, optional)">
        <input type="number" value={widget.height ?? 400} onChange={e => update({ height: Number(e.target.value) } as Partial<GrafanaWidgetConfig>)} style={inputStyle} />
      </Field>
    </>
  );
}

function WeatherEditor({ widget, update }: { widget: WeatherWidgetConfig; update: (p: Partial<WidgetConfig>) => void }) {
  return (
    <>
      <Field label="Quelle">
        <Select value={widget.source ?? 'open-meteo'} options={[
          { value: 'open-meteo', label: 'Open-Meteo (automatisch)' }, { value: 'iobroker', label: 'ioBroker States' },
        ]} onChange={v => update({ source: v } as Partial<WeatherWidgetConfig>)} />
      </Field>
      {(widget.source ?? 'open-meteo') === 'open-meteo' && (
        <>
          <Field label="Breitengrad">
            <input type="number" step={0.001} value={widget.latitude ?? 48.1} onChange={e => update({ latitude: Number(e.target.value) } as Partial<WeatherWidgetConfig>)} style={inputStyle} />
          </Field>
          <Field label="Längengrad">
            <input type="number" step={0.001} value={widget.longitude ?? 11.6} onChange={e => update({ longitude: Number(e.target.value) } as Partial<WeatherWidgetConfig>)} style={inputStyle} />
          </Field>
        </>
      )}
      {widget.source === 'iobroker' && (
        <>
          <Field label="Temperatur State-ID">
            <input value={widget.tempStateId ?? ''} onChange={e => update({ tempStateId: e.target.value } as Partial<WeatherWidgetConfig>)} style={inputStyle} placeholder="daswetter.0...." />
          </Field>
          <Field label="Wettercode State-ID">
            <input value={widget.conditionStateId ?? ''} onChange={e => update({ conditionStateId: e.target.value } as Partial<WeatherWidgetConfig>)} style={inputStyle} />
          </Field>
        </>
      )}
    </>
  );
}

function NumpadEditor({ widget, update }: { widget: NumpadWidgetConfig; update: (p: Partial<WidgetConfig>) => void }) {
  return (
    <>
      <Field label="State-ID (schreibbar)">
        <input value={widget.stateId ?? ''} onChange={e => update({ stateId: e.target.value } as Partial<NumpadWidgetConfig>)} style={inputStyle} placeholder="adapter.0.code" />
      </Field>
      <Field label="PIN-Modus (Eingabe verstecken)">
        <Toggle value={widget.pinMode ?? false} onChange={v => update({ pinMode: v } as Partial<NumpadWidgetConfig>)} />
      </Field>
      <Field label="Max. Stellen">
        <input type="number" min={1} max={20} value={widget.maxLength ?? 6} onChange={e => update({ maxLength: Number(e.target.value) } as Partial<NumpadWidgetConfig>)} style={inputStyle} />
      </Field>
    </>
  );
}

function LinkEditor({ widget, update }: { widget: LinkWidgetConfig; update: (p: Partial<WidgetConfig>) => void }) {
  return (
    <>
      <Field label="URL">
        <input value={widget.url ?? ''} onChange={e => update({ url: e.target.value } as Partial<LinkWidgetConfig>)} style={inputStyle} placeholder="https://..." />
      </Field>
      <Field label="In Overlay öffnen">
        <Toggle value={widget.openInOverlay ?? true} onChange={v => update({ openInOverlay: v } as Partial<LinkWidgetConfig>)} />
      </Field>
      <Field label="Icon-URL (optional)">
        <input value={widget.iconImage ?? ''} onChange={e => update({ iconImage: e.target.value } as Partial<LinkWidgetConfig>)} style={inputStyle} placeholder="https://..." />
      </Field>
      <Field label="Label">
        <input value={widget.label ?? ''} onChange={e => update({ label: e.target.value } as Partial<LinkWidgetConfig>)} style={inputStyle} />
      </Field>
    </>
  );
}

function LogEditor({ widget, update }: { widget: LogWidgetConfig; update: (p: Partial<WidgetConfig>) => void }) {
  return (
    <>
      <Field label="Log-Level Filter">
        <Select value={widget.minLevel ?? 'info'} options={[
          { value: 'debug', label: 'debug' }, { value: 'info', label: 'info' },
          { value: 'warn', label: 'warn' }, { value: 'error', label: 'error' },
        ]} onChange={v => update({ minLevel: v } as Partial<LogWidgetConfig>)} />
      </Field>
      <Field label="Max. Zeilen">
        <input type="number" min={10} max={200} value={widget.maxLines ?? 50} onChange={e => update({ maxLines: Number(e.target.value) } as Partial<LogWidgetConfig>)} style={inputStyle} />
      </Field>
      <Field label="Quellen-Filter (optional, kommagetrennt)">
        <input value={widget.sourceFilter ?? ''} onChange={e => update({ sourceFilter: e.target.value } as Partial<LogWidgetConfig>)} style={inputStyle} placeholder="adapter.x, script.js...." />
      </Field>
    </>
  );
}

function ScriptEditor({ widget, update }: { widget: ScriptWidgetConfig; update: (p: Partial<WidgetConfig>) => void }) {
  return (
    <>
      <Field label="Script-ID">
        <input value={widget.scriptId ?? ''} onChange={e => update({ scriptId: e.target.value } as Partial<ScriptWidgetConfig>)} style={inputStyle} placeholder="script.js.meinScript" />
      </Field>
      <Field label="Button-Label">
        <input value={widget.buttonLabel ?? 'Starten'} onChange={e => update({ buttonLabel: e.target.value } as Partial<ScriptWidgetConfig>)} style={inputStyle} />
      </Field>
    </>
  );
}

function SystemStatsEditor({ widget, update }: { widget: SystemStatsWidgetConfig; update: (p: Partial<WidgetConfig>) => void }) {
  return (
    <Field label="Refresh-Intervall (ms)">
      <input type="number" min={2000} step={1000} value={widget.refreshMs ?? 10000} onChange={e => update({ refreshMs: Number(e.target.value) } as Partial<SystemStatsWidgetConfig>)} style={inputStyle} />
    </Field>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: value ? 'var(--accent)' : 'var(--card)', position: 'relative', transition: 'background 0.2s' }}
    >
      <span style={{ position: 'absolute', top: 3, left: value ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
    </button>
  );
}

function Select({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text)', fontSize: 13,
  padding: '8px 12px', outline: 'none', width: '100%',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text-muted)', fontSize: 13,
  cursor: 'pointer', padding: '4px 10px',
};
