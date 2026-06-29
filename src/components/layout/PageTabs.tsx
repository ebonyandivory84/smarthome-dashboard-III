import { motion } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { playSound } from '../../utils/sounds';

export function PageTabs() {
  const { pages, activePageId, setActivePageId, editMode, deletePage } = useDashboard();

  const handleTabClick = (id: string) => {
    if (id !== activePageId) {
      setActivePageId(id);
      playSound('tap2');
    }
  };

  return (
    <div style={{
      display: 'flex',
      gap: 4,
      overflowX: 'auto',
      scrollbarWidth: 'none',
      alignItems: 'center',
    }}>
      {pages.map(page => {
        const active = page.id === activePageId;
        return (
          <motion.div
            key={page.id}
            layout
            style={{ position: 'relative', flexShrink: 0 }}
          >
            <button
              onClick={() => handleTabClick(page.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--text)' : 'var(--text-muted)',
                background: active ? 'rgba(92,124,255,0.15)' : 'transparent',
                border: active ? '1px solid rgba(92,124,255,0.3)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
              }}
            >
              {page.label}
              {editMode && pages.length > 1 && (
                <span
                  onClick={e => { e.stopPropagation(); deletePage(page.id); playSound('minimize'); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 14, height: 14,
                    borderRadius: '50%',
                    background: 'rgba(255,107,122,0.2)',
                    color: 'var(--accent-red)',
                    fontSize: 10,
                    cursor: 'pointer',
                    lineHeight: 1,
                  }}
                >
                  ×
                </span>
              )}
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
