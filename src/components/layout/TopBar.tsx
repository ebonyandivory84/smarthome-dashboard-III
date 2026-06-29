import { motion } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { PageTabs } from './PageTabs';
import { playSound } from '../../utils/sounds';
import { useState } from 'react';

interface Props {
  onOpenSettings: () => void;
  onOpenLibrary: () => void;
}

export function TopBar({ onOpenSettings, onOpenLibrary }: Props) {
  const { config, conn, editMode, setEditMode, createPage } = useDashboard();
  const [addingPage, setAddingPage] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  const toggleEdit = () => {
    setEditMode(!editMode);
    playSound(editMode ? 'minimize' : 'maximize');
  };

  const handleAddPage = () => {
    if (newLabel.trim()) {
      createPage(newLabel.trim());
      setNewLabel('');
      setAddingPage(false);
      playSound('confirm');
    }
  };

  const dotColor = conn === 'online' ? '#6cff8f' : conn === 'connecting' ? '#ffd166' : '#ff6b7a';

  return (
    <div
      style={{
        height: 'var(--topbar-h)',
        background: 'var(--panel-2)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 12px',
        flexShrink: 0,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 40,
      }}
    >
      {/* Title + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text)' }}>
          {config.settings.title ?? 'SmartHome'}
        </span>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: dotColor,
          boxShadow: `0 0 6px ${dotColor}`,
          flexShrink: 0,
        }} />
      </div>

      {/* Page tabs — scrollable */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <PageTabs />
      </div>

      {/* Add page input */}
      {addingPage && (
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 140 }}
          style={{ overflow: 'hidden', display: 'flex', gap: 4 }}
        >
          <input
            autoFocus
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddPage(); if (e.key === 'Escape') setAddingPage(false); }}
            placeholder="Seitenname"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text)',
              fontSize: 12,
              padding: '4px 8px',
              width: '100%',
              outline: 'none',
            }}
          />
          <button onClick={handleAddPage} className="topbar-btn" style={{ background: 'var(--accent)' }}>✓</button>
        </motion.div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {editMode && (
          <>
            <TopBarBtn
              title="Seite hinzufügen"
              onClick={() => { setAddingPage(v => !v); playSound('tap3'); }}
            >
              <PlusIcon />
            </TopBarBtn>
            <TopBarBtn
              title="Widget hinzufügen"
              onClick={() => { onOpenLibrary(); playSound('tap3'); }}
            >
              <WidgetIcon />
            </TopBarBtn>
          </>
        )}
        <TopBarBtn
          title={editMode ? 'Bearbeitung beenden' : 'Layout bearbeiten'}
          onClick={toggleEdit}
          active={editMode}
        >
          <PencilIcon />
        </TopBarBtn>
        <TopBarBtn title="Einstellungen" onClick={() => { onOpenSettings(); playSound('tap3'); }}>
          <CogIcon />
        </TopBarBtn>
      </div>
    </div>
  );
}

function TopBarBtn({
  children, onClick, title, active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 32, height: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(92,124,255,0.2)' : 'var(--card)',
        border: `1px solid ${active ? 'rgba(92,124,255,0.5)' : 'var(--border)'}`,
        borderRadius: 8,
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        cursor: 'pointer',
        transition: 'background 0.15s',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const CogIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const WidgetIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
);
