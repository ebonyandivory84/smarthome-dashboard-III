import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/iobroker';
import { playSound } from '../../utils/sounds';
import type { CameraWidgetConfig } from '../../types/dashboard';

interface Props { widget: CameraWidgetConfig }

type TalkState = 'idle' | 'connecting' | 'active' | 'error';

export default function CameraTalkWidget({ widget }: Props) {
  const [talkState, setTalkState] = useState<TalkState>('idle');
  const [fullscreen, setFullscreen] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const isReolink = Boolean(widget.reolinkTalkUrl);
  const isInstar = Boolean(widget.instarBaseUrl);
  const hasTalkback = isReolink || isInstar;

  // cleanup on unmount
  useEffect(() => () => { stopTalk(); }, []); // eslint-disable-line

  async function startTalk() {
    if (talkState !== 'idle') return;
    setTalkState('connecting');
    playSound('tap3');
    try {
      if (isReolink && widget.reolinkTalkUrl) {
        const res = await api.reolinkTalkStart({
          url: widget.reolinkTalkUrl,
          user: widget.reolinkUser ?? '',
          pass: widget.reolinkPass ?? '',
          channel: widget.reolinkChannel,
        });
        tokenRef.current = res.token;
      } else if (isInstar && widget.instarBaseUrl) {
        const res = await api.instarTalkStart({
          baseUrl: widget.instarBaseUrl,
          user: widget.instarUser ?? '',
          pass: widget.instarPass ?? '',
          channel: widget.instarChannel,
        });
        tokenRef.current = res.token;
        // capture mic and stream chunks
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRef.current = stream;
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=pcm' });
        recorder.ondataavailable = async (e) => {
          if (e.data.size > 0 && tokenRef.current) {
            const buf = await e.data.arrayBuffer();
            await api.instarTalkChunk(tokenRef.current, buf);
          }
        };
        recorder.start(200);
      }
      setTalkState('active');
      playSound('confirm');
    } catch {
      setTalkState('error');
      playSound('error');
      setTimeout(() => setTalkState('idle'), 2000);
    }
  }

  async function stopTalk() {
    mediaRef.current?.getTracks().forEach(t => t.stop());
    mediaRef.current = null;
    if (tokenRef.current) {
      if (isReolink) await api.reolinkTalkStop(tokenRef.current).catch(() => {});
      else if (isInstar) await api.instarTalkStop(tokenRef.current).catch(() => {});
      tokenRef.current = null;
    }
    setTalkState('idle');
    playSound('minimize');
  }

  const talkColor = talkState === 'active' ? '#6cff8f' : talkState === 'error' ? '#ff6b7a' : talkState === 'connecting' ? '#ffd166' : '#8c94ad';

  return (
    <>
      <div className="widget-card" style={{ position: 'relative' }}>
        {widget.showTitle !== false && <div className="widget-title">{widget.title}</div>}
        {/* Camera preview */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: 'pointer' }} onClick={() => { setFullscreen(true); playSound('maximize'); }}>
          {/* reuse snapshot/mjpeg/flv from CameraWidget internals — simplified inline */}
          <CameraPreviewInline widget={widget} />
        </div>

        {/* Talkback button */}
        {hasTalkback && (
          <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'center' }}>
            <AnimatePresence mode="wait">
              <motion.button
                key={talkState}
                onClick={talkState === 'active' ? stopTalk : startTalk}
                disabled={talkState === 'connecting' || talkState === 'error'}
                whileTap={{ scale: 0.92 }}
                style={{
                  padding: '8px 20px',
                  borderRadius: 20,
                  border: `1.5px solid ${talkColor}`,
                  background: talkState === 'active' ? 'rgba(108,255,143,0.15)' : 'var(--card)',
                  color: talkColor,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <MicIcon active={talkState === 'active'} />
                {talkState === 'idle' && 'Sprechen'}
                {talkState === 'connecting' && 'Verbinde…'}
                {talkState === 'active' && 'Beenden'}
                {talkState === 'error' && 'Fehler'}
              </motion.button>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Fullscreen — reuse CameraWidget component */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#000' }}
            onClick={() => { setFullscreen(false); playSound('minimize'); }}
          >
            <CameraPreviewInline widget={widget} full />
            <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
              {hasTalkback && (
                <button
                  onClick={e => { e.stopPropagation(); talkState === 'active' ? stopTalk() : startTalk(); }}
                  style={{
                    padding: '10px 28px', borderRadius: 24,
                    border: `1.5px solid ${talkColor}`,
                    background: 'rgba(0,0,0,0.7)',
                    color: talkColor, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {talkState === 'active' ? '■ Stopp' : '🎤 Sprechen'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function CameraPreviewInline({ widget, full = false }: { widget: CameraWidgetConfig; full?: boolean }) {
  const mode = (full ? widget.fullscreenMode : widget.previewMode) ?? 'snapshot';
  const url = full
    ? (mode === 'snapshot' ? (widget.fullscreenSnapshotUrl ?? widget.snapshotUrl) : mode === 'mjpeg' ? (widget.fullscreenMjpegUrl ?? widget.mjpegUrl) : (widget.fullscreenFlvUrl ?? widget.flvUrl))
    : (mode === 'snapshot' ? widget.snapshotUrl : mode === 'mjpeg' ? widget.mjpegUrl : widget.flvUrl);

  if (!url) return <div style={{ flex: 1, background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>URL fehlt</div>;

  if (mode === 'snapshot') {
    return <ImgSnapshot url={url} refreshMs={widget.refreshMs} full={full} />;
  }
  if (mode === 'mjpeg') {
    const proxied = `/api/camera-stream?streamType=mjpeg&url=${encodeURIComponent(url)}`;
    return <img src={proxied} alt="" style={{ width: '100%', height: '100%', objectFit: full ? 'contain' : 'cover' }} />;
  }
  return null;
}

function ImgSnapshot({ url, refreshMs = 5000, full }: { url: string; refreshMs?: number; full?: boolean }) {
  const [src, setSrc] = useState(() => `/api/camera-snapshot?url=${encodeURIComponent(url)}&t=${Date.now()}`);
  useEffect(() => {
    const t = setInterval(() => setSrc(`/api/camera-snapshot?url=${encodeURIComponent(url)}&t=${Date.now()}`), refreshMs);
    return () => clearInterval(t);
  }, [url, refreshMs]);
  return <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: full ? 'contain' : 'cover' }} />;
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {active
        ? <><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/></>
        : <><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/></>}
    </svg>
  );
}
