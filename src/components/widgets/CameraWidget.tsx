import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCameraSnapshot } from '../../hooks/useCameraSnapshot';
import { useIoBrokerState } from '../../hooks/useIoBrokerStates';
import { playSound } from '../../utils/sounds';
import type { CameraWidgetConfig } from '../../types/dashboard';

interface Props { widget: CameraWidgetConfig }

export default function CameraWidget({ widget }: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const maxState = useIoBrokerState(widget.maximizeStateId);
  useEffect(() => {
    if (widget.maximizeStateId && maxState?.val) setFullscreen(true);
  }, [maxState, widget.maximizeStateId]);

  const mode = widget.previewMode ?? 'snapshot';
  const fMode = widget.fullscreenMode ?? mode;

  const open = () => { setFullscreen(true); playSound('maximize'); };
  const close = () => { setFullscreen(false); playSound('minimize'); };
  const refresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    playSound('tap4');
    setRefreshTick(t => t + 1);
  };

  return (
    <>
      <div className="widget-card" style={{ cursor: 'pointer', padding: 0 }} onClick={open}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#000' }}>
          <CameraPreview
            key={refreshTick}
            mode={mode}
            snapshotUrl={widget.snapshotUrl}
            mjpegUrl={widget.mjpegUrl}
            flvUrl={widget.flvUrl}
            refreshMs={widget.refreshMs}
            active
          />

          {widget.showTitle !== false && (
            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              padding: '24px 14px 10px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)',
              pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{widget.title}</div>
            </div>
          )}

          <button
            onClick={refresh}
            style={{
              position: 'absolute', top: 10, right: 10,
              width: 30, height: 30, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', cursor: 'pointer',
              backdropFilter: 'blur(4px)',
            }}
          >
            <RefreshIcon />
          </button>
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

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
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
      style={{ width: '100%', height: '100%', objectFit: 'contain', ...style }}
      draggable={false}
    />
  );
}

// ── MJPEG ─────────────────────────────────────────────────────────────────────
function MjpegView({ url, style }: { url?: string; style?: React.CSSProperties }) {
  if (!url) return <Placeholder text="MJPEG-URL fehlt" />;
  const proxied = `/api/camera-stream?streamType=mjpeg&url=${encodeURIComponent(url)}`;
  return <img src={proxied} alt="camera" style={{ width: '100%', height: '100%', objectFit: 'contain', ...style }} />;
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
      style={{ width: '100%', height: '100%', objectFit: 'contain', ...style }}
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
