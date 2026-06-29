import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { playSound } from '../../utils/sounds';

interface Props { open: boolean; onClose: () => void }

export function SettingsModal({ open, onClose }: Props) {
  const { config, updateSettings, savedNames, saveDashboard, loadDashboard, deleteSavedDashboard } = useDashboard();
  const [tab, setTab] = useState<'general' | 'sound' | 'save'>('general');
  const [saveName, setSaveName] = useState('');
  const s = config.settings;

  const handleClose = () => { onClose(); playSound('minimize'); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end' }}
          onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
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
              maxHeight: '85dvh',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>Einstellungen</span>
              <button onClick={handleClose} style={closeBtnStyle}>✕</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {(['general', 'sound', 'save'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                    background: tab === t ? 'rgba(92,124,255,0.2)' : 'var(--card)',
                    border: `1px solid ${tab === t ? 'rgba(92,124,255,0.4)' : 'var(--border)'}`,
                    color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {{ general: 'Allgemein', sound: 'Sound', save: 'Dashboards' }[t]}
                </button>
              ))}
            </div>

            {/* General */}
            {tab === 'general' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="Titel">
                  <input
                    value={s.title ?? ''}
                    onChange={e => updateSettings({ title: e.target.value })}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Row-Höhe (px)">
                  <input
                    type="number" min={60} max={300}
                    value={s.rowHeight}
                    onChange={e => updateSettings({ rowHeight: Number(e.target.value) })}
                    style={inputStyle}
                  />
                </Field>
              </div>
            )}

            {/* Sound */}
            {tab === 'sound' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="Sound aktiviert">
                  <Toggle
                    value={s.soundSettings?.enabled ?? true}
                    onChange={v => updateSettings({ soundSettings: { ...s.soundSettings!, enabled: v } })}
                  />
                </Field>
                <Field label={`Lautstärke: ${Math.round((s.soundSettings?.volume ?? 0.55) * 100)}%`}>
                  <input
                    type="range" min={0} max={1} step={0.05}
                    value={s.soundSettings?.volume ?? 0.55}
                    onChange={e => updateSettings({ soundSettings: { ...s.soundSettings!, volume: Number(e.target.value) } })}
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                  />
                </Field>
                <button
                  onClick={() => playSound('confirm')}
                  style={{ ...closeBtnStyle, background: 'var(--card)', padding: '8px 14px', borderRadius: 8 }}
                >
                  Test-Sound abspielen
                </button>
              </div>
            )}

            {/* Saved dashboards */}
            {tab === 'save' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    placeholder="Dashboard-Name"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={() => { if (saveName.trim()) { saveDashboard(saveName.trim()); setSaveName(''); playSound('confirm'); } }}
                    style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--accent)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  >
                    Speichern
                  </button>
                </div>
                {savedNames.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Keine gespeicherten Dashboards</div>}
                {savedNames.map(name => (
                  <div key={name} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{name}</span>
                    <button onClick={() => { loadDashboard(name); handleClose(); playSound('tap3'); }} style={smallBtnStyle}>Laden</button>
                    <button onClick={() => { deleteSavedDashboard(name); playSound('tap5'); }} style={{ ...smallBtnStyle, color: 'var(--accent-red)', borderColor: 'rgba(255,107,122,0.3)' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: value ? 'var(--accent)' : 'var(--card)',
        position: 'relative', transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: value ? 22 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
      }} />
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text)',
  fontSize: 13, padding: '8px 12px', outline: 'none', width: '100%',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text-muted)', fontSize: 13,
  cursor: 'pointer', padding: '4px 10px',
};

const smallBtnStyle: React.CSSProperties = {
  padding: '5px 10px', borderRadius: 6, fontSize: 11,
  background: 'var(--card)', border: '1px solid var(--border)',
  color: 'var(--text-muted)', cursor: 'pointer',
};
