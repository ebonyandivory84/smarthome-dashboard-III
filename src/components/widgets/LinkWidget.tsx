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
        style={{
          cursor: 'pointer', padding: 0,
          alignItems: widget.iconImage ? 'stretch' : 'center',
          justifyContent: widget.iconImage ? 'flex-end' : 'center',
        }}
      >
        {widget.iconImage && (
          <img
            src={widget.iconImage}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
            draggable={false}
          />
        )}
        <div style={{
          position: 'relative', zIndex: 1,
          textAlign: widget.iconImage ? 'left' : 'center',
          padding: widget.iconImage ? '24px 14px 10px' : 12,
          background: widget.iconImage ? 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' : undefined,
        }}>
          {widget.showTitle !== false && (
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
              {widget.label ?? widget.title}
            </div>
          )}
          <div style={{ fontSize: 11, color: widget.iconImage ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginTop: 4 }}>
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
                style={{ padding: '6px 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 12 }}
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
