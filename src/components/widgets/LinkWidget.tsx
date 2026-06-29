import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '../../utils/sounds';
import type { LinkWidgetConfig } from '../../types/dashboard';

interface Props { widget: LinkWidgetConfig }

export default function LinkWidget({ widget }: Props) {
  const [open, setOpen] = useState(false);

  const handlePress = () => {
    playSound(widget.sounds?.press ?? 'tap1');
    if (widget.openInOverlay) { setOpen(true); playSound('maximize'); }
    else window.open(widget.url, '_blank');
  };

  return (
    <>
      <div
        className="widget-card"
        onClick={handlePress}
        style={{ cursor: 'pointer', alignItems: 'center', justifyContent: 'center' }}
      >
        {widget.iconImage && (
          <img
            src={widget.iconImage}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, opacity: 0.7 }}
            draggable={false}
          />
        )}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: 12 }}>
          {widget.showTitle !== false && (
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              {widget.label ?? widget.title}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {new URL(widget.url).hostname}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#000', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 8, background: 'var(--panel-2)' }}>
              <button
                onClick={() => { setOpen(false); playSound('minimize'); }}
                style={{ padding: '6px 14px', borderRadius: 8, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 12 }}
              >
                ✕ Schließen
              </button>
            </div>
            <iframe src={widget.url} style={{ flex: 1, border: 'none' }} title={widget.title} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
