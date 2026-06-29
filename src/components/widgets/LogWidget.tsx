import { useEffect, useState, useRef } from 'react';
import { api } from '../../services/iobroker';
import type { LogWidgetConfig } from '../../types/dashboard';

interface Props { widget: LogWidgetConfig }

type LogEntry = { ts: number; level: string; source: string; message: string };

const LEVEL_COLOR: Record<string, string> = {
  debug: '#8c94ad',
  info: '#5c7cff',
  warn: '#ffd166',
  error: '#ff6b7a',
};

export default function LogWidget({ widget }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refresh = () => {
      api.getLogs(widget.maxLines ?? 60).then(entries => {
        let filtered = entries;
        if (widget.levelFilter?.length) filtered = filtered.filter(e => widget.levelFilter!.includes(e.level as never));
        if (widget.sourceFilter) filtered = filtered.filter(e => e.source.includes(widget.sourceFilter!));
        setLogs(filtered.slice(-(widget.maxLines ?? 60)));
      }).catch(() => {});
    };
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [widget.levelFilter, widget.sourceFilter, widget.maxLines]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="widget-card">
      {widget.showTitle !== false && <div className="widget-title">{widget.title}</div>}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 8px', fontFamily: 'monospace' }}>
        {logs.map((log, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, fontSize: 10, lineHeight: '18px', alignItems: 'flex-start' }}>
            <span style={{ color: LEVEL_COLOR[log.level] ?? '#8c94ad', flexShrink: 0, fontWeight: 600, width: 36 }}>
              {log.level.toUpperCase().slice(0, 4)}
            </span>
            <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              {new Date(log.ts).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span style={{ color: 'var(--text)', wordBreak: 'break-word' }}>{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
