import { useEffect, useRef, useState } from 'react';

export function useCameraSnapshot(url: string | undefined, refreshMs = 5000, active = true) {
  const [src, setSrc] = useState<string | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!url || !active) { setSrc(undefined); return; }

    const refresh = () => {
      setSrc(`/api/camera-snapshot?url=${encodeURIComponent(url)}&t=${Date.now()}`);
      timerRef.current = setTimeout(refresh, refreshMs);
    };

    refresh();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [url, refreshMs, active]);

  return src;
}
