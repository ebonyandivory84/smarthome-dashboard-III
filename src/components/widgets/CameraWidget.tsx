import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCameraSnapshot } from '../../hooks/useCameraSnapshot';
import { useIoBrokerState } from '../../hooks/useIoBrokerStates';
import { playSound } from '../../utils/sounds';
import type { CameraWidgetConfig } from '../../types/dashboard';

interface Props { widget: CameraWidgetConfig }

export default function CameraWidget({ widget }: Props) {
  const [fullscreen, setFullscreen] = useState(false);

  const maxState = useIoBrokerState(widget.maximizeStateId);
  useEffect(() => {
    if (widget.maximizeStateId && maxState?.val) setFullscreen(true);
  }, [maxState, widget.maximizeStateId]);

  const mode = widget.previewMode ?? 'snapshot';
  const fMode = widget.fullscreenMode ?? mode;

  const open = () => { setFullscreen(true); playSound('maximize'); };
  const close = () => { setFullscreen(false); playSound('minimize'); };

  return (
    <>
      <div className="widget-card" style={{ cursor: 'pointer' }} onClick={open}>
        {widget.showTitle !== false && <div className="widget-title">{widget.title}</div>}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <CameraPreview
            mode={mode}
            snapshotUrl={widget.snapshotUrl}
            mjpegUrl={widget.mjpegUrl}
            flvUrl={widget.flvUrl}
            refreshMs={widget.refreshMs}
            active
          />
        </div>
      </div>

      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: '#000',
              display: 'flex', flexDirection: 'column',
            }}
            onClick={close}
          >
            <div style={{
              flex: 1, position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CameraPreview
                mode={fMode}
                snapshotUrl={widget.fullscreenSnapshotUrl ?? widget.snapshotUrl}
                mjpegUrl={widget.fullscreenMjpegUrl ?? widget.mjpegUrl}
                flvUrl={widget.fullscreenFlvUrl ?? widget.flvUrl}
                refreshMs={widget.refreshMs}
                active
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div style={{ padding: '12px 20px', background: 'rgba(0,0,0,0.8)', color: 'var(--text-muted)', fontSize: 12 }}>
              {widget.title} — tippen zum Schließen
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── CameraPreview ─────────────────────────────────────────────────────────────
interface PreviewProps {
  mode: string;
  snapshotUrl?: string;
  mjpegUrl?: string;
  flvUrl?: string;
  refreshMs?: number;
  active?: boolean;
  style?: React.CSSProperties;
}

function CameraPreview({ mode, snapshotUrl, mjpegUrl, flvUrl, refreshMs, active, style }: PreviewProps) {
  if (mode === 'snapshot') {
    return <SnapshotView url={snapshotUrl} refreshMs={refreshMs} active={active} style={style} />;
  }
  if (mode === 'mjpeg') {
    return <MjpegView url={mjpegUrl} style={style} />;
  }
  if (mode === 'flv') {
    return <FlvView url={flvUrl} style={style} />;
  }
  return <Placeholder text="Kein Modus" />;
}

// ── Snapshot ──────────────────────────────────────────────────────────────────
function SnapshotView({ url, refreshMs = 5000, active, style }: { url?: string; refreshMs?: number; active?: boolean; style?: React.CSSProperties }) {
  const src = useCameraSnapshot(url, refreshMs, active);
  if (!url) return <Placeholder text="Snapshot-URL fehlt" />;
  if (!src) return <Placeholder text="Lädt…" />;
  return (
    <img
      src={src}
      alt="camera"
      style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }}
      draggable={false}
    />
  );
}

// ── MJPEG ─────────────────────────────────────────────────────────────────────
function MjpegView({ url, style }: { url?: string; style?: React.CSSProperties }) {
  if (!url) return <Placeholder text="MJPEG-URL fehlt" />;
  const proxied = `/api/camera-stream?streamType=mjpeg&url=${encodeURIComponent(url)}`;
  return <img src={proxied} alt="camera" style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }} />;
}

// ── FLV ───────────────────────────────────────────────────────────────────────
function FlvView({ url, style }: { url?: string; style?: React.CSSProperties }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!url || !videoRef.current) return;
    let destroyed = false;

    import('flv.js').then(({ default: flvjs }) => {
      if (destroyed || !flvjs.isSupported() || !videoRef.current) return;
      const proxied = `/api/camera-stream?streamType=flv&url=${encodeURIComponent(url)}`;
      const player = flvjs.createPlayer({ type: 'flv', url: proxied, isLive: true });
      player.attachMediaElement(videoRef.current);
      player.load();
      player.play();
      return () => { destroyed = true; player.destroy(); };
    });

    return () => { destroyed = true; };
  }, [url]);

  if (!url) return <Placeholder text="FLV-URL fehlt" />;
  return (
    <video
      ref={videoRef}
      autoPlay muted playsInline
      style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }}
    />
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-alt)',
      color: 'var(--text-muted)', fontSize: 12,
    }}>
      {text}
    </div>
  );
}
