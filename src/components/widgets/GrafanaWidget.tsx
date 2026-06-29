import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '../../utils/sounds';
import type { GrafanaWidgetConfig } from '../../types/dashboard';

interface Props { widget: GrafanaWidgetConfig }

export default function GrafanaWidget({ widget }: Props) {
  const [ts, setTs] = useState(Date.now());
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!widget.refreshMs) return;
    const t = setInterval(() => setTs(Date.now()), widget.refreshMs);
    return () => clearInterval(t);
  }, [widget.refreshMs]);

  // Grafana render URL: /render/d-solo/... → returns PNG snapshot
  const src = `/api/grafana-snapshot?url=${encodeURIComponent(widget.snapshotUrl)}&t=${ts}`;

  return (
    <>
      <div className="widget-card" style={{ cursor: 'pointer' }} onClick={() => { setFullscreen(true); playSound('maximize'); }}>
        {widget.showTitle !== false && <div className="widget-title">{widget.title}</div>}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <img
            src={src}
            alt="Grafana"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            draggable={false}
          />
        </div>
      </div>

      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setFullscreen(false); playSound('minimize'); }}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: '#000',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <img
              src={widget.fullscreenUrl ? `/api/grafana-snapshot?url=${encodeURIComponent(widget.fullscreenUrl)}&t=${ts}` : src}
              alt="Grafana"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              draggable={false}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
