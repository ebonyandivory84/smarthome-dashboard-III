import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../services/iobroker';
import type { SystemStatsWidgetConfig } from '../../types/dashboard';

interface Props { widget: SystemStatsWidgetConfig }

type Stats = { cpu: number; mem: number; disk: number; uptime: number };

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 7, background: 'var(--card)', borderRadius: 4, overflow: 'hidden' }}>
      <motion.div
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ height: '100%', background: color, borderRadius: 4 }}
      />
    </div>
  );
}

function fmtUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function SystemStatsWidget({ widget }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const refresh = () => api.getHostStats().then(setStats).catch(() => {});
    refresh();
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, []);

  const rows = [
    { label: 'CPU', value: stats?.cpu ?? 0, color: '#5c7cff', unit: '%' },
    { label: 'RAM', value: stats?.mem ?? 0, color: '#ff4db8', unit: '%' },
    { label: 'Disk', value: stats?.disk ?? 0, color: '#ffd166', unit: '%' },
  ];

  return (
    <div className="widget-card">
      {widget.showTitle !== false && <div className="widget-title">{widget.title ?? 'System'}</div>}
      <div className="widget-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(row => (
          <div key={row.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: row.color }}>
                {stats ? `${Math.round(row.value)}${row.unit}` : '–'}
              </span>
            </div>
            <Bar value={row.value} color={row.color} />
          </div>
        ))}
        {stats?.uptime != null && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 2 }}>
            Uptime: <span style={{ color: 'var(--text)' }}>{fmtUptime(stats.uptime)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
