import type { DashboardConfig, IoBrokerState } from '../types/dashboard';

const BASE = '/api';

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Config ────────────────────────────────────────────────────────────────────
export const api = {
  getConfig: () => apiFetch<DashboardConfig>('/config'),
  saveConfig: (cfg: DashboardConfig) =>
    apiFetch<void>('/config', { method: 'PUT', body: JSON.stringify(cfg) }),

  listDashboards: () => apiFetch<string[]>('/dashboards'),
  loadDashboard: (name: string) => apiFetch<DashboardConfig>(`/dashboards/${name}`),
  saveDashboard: (name: string, cfg: DashboardConfig) =>
    apiFetch<void>(`/dashboards/${name}`, { method: 'PUT', body: JSON.stringify(cfg) }),
  deleteDashboard: (name: string) =>
    apiFetch<void>(`/dashboards/${name}`, { method: 'DELETE' }),

  // ── States ──────────────────────────────────────────────────────────────────
  getState: (id: string) => apiFetch<IoBrokerState>(`/states/${encodeURIComponent(id)}`),
  setState: (id: string, val: unknown) =>
    apiFetch<void>(`/states/${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify({ val }),
    }),

  // ── Objects ─────────────────────────────────────────────────────────────────
  getObjects: (query?: string) =>
    apiFetch<Record<string, unknown>>(`/objects${query ? `?q=${encodeURIComponent(query)}` : ''}`),

  // ── Logs ────────────────────────────────────────────────────────────────────
  getLogs: (limit = 100) => apiFetch<{ ts: number; level: string; source: string; message: string }[]>(`/logs?limit=${limit}`),

  // ── Scripts ─────────────────────────────────────────────────────────────────
  getScripts: () => apiFetch<{ id: string; name: string; enabled: boolean }[]>('/scripts'),
  runScript: (id: string) =>
    apiFetch<void>(`/scripts/${encodeURIComponent(id)}/run`, { method: 'POST' }),

  // ── Host stats ───────────────────────────────────────────────────────────────
  getHostStats: () =>
    apiFetch<{ cpu: number; mem: number; disk: number; uptime: number }>('/host-stats'),

  // ── Camera snapshot proxy URL (used as <img src> directly) ──────────────────
  cameraSnapshotUrl: (url: string, ts?: number) =>
    `${BASE}/camera-snapshot?url=${encodeURIComponent(url)}&t=${ts ?? Date.now()}`,

  // ── Instar talkback ───────────────────────────────────────────────────────────
  instarTalkStart: (opts: { baseUrl: string; user: string; pass: string; channel?: number }) =>
    apiFetch<{ token: string }>('/instar-talk/start', { method: 'POST', body: JSON.stringify(opts) }),
  instarTalkChunk: (token: string, data: ArrayBuffer) =>
    fetch(`${BASE}/instar-talk/chunk`, {
      method: 'POST',
      headers: { 'Session': token, 'Content-Type': 'application/octet-stream' },
      body: data,
    }),
  instarTalkStop: (token: string) =>
    apiFetch<void>('/instar-talk/stop', { method: 'POST', body: JSON.stringify({ token }) }),

  // ── Reolink talkback ──────────────────────────────────────────────────────────
  reolinkTalkStart: (opts: { url: string; user: string; pass: string; channel?: number }) =>
    apiFetch<{ token: string }>('/reolink-talk/start', { method: 'POST', body: JSON.stringify(opts) }),
  reolinkTalkStop: (token: string) =>
    apiFetch<void>('/reolink-talk/stop', { method: 'POST', body: JSON.stringify({ token }) }),
};

// ── WebSocket state push ──────────────────────────────────────────────────────
export type StateListener = (id: string, state: IoBrokerState) => void;

export class StatePushWS {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<StateListener>>();
  private subscribed = new Set<string>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private dead = false;

  connect() {
    if (this.dead) return;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this.ws = new WebSocket(`${proto}://${location.host}/ws`);

    this.ws.onopen = () => {
      if (this.subscribed.size > 0) {
        this.ws!.send(JSON.stringify({ type: 'watch', stateIds: [...this.subscribed] }));
      }
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        if (msg.type === 'state' || msg.type === 'snapshot') {
          const states: Record<string, IoBrokerState> = msg.states ?? { [msg.id]: msg.state };
          for (const [id, state] of Object.entries(states)) {
            this.listeners.get(id)?.forEach(fn => fn(id, state));
          }
        }
      } catch { /* ignore */ }
    };

    this.ws.onclose = () => {
      if (!this.dead) {
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      }
    };

    this.ws.onerror = () => this.ws?.close();
  }

  subscribe(ids: string[], listener: StateListener) {
    const newIds: string[] = [];
    for (const id of ids) {
      if (!this.listeners.has(id)) this.listeners.set(id, new Set());
      this.listeners.get(id)!.add(listener);
      if (!this.subscribed.has(id)) { this.subscribed.add(id); newIds.push(id); }
    }
    if (newIds.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'watch', stateIds: newIds }));
    }
  }

  unsubscribe(ids: string[], listener: StateListener) {
    for (const id of ids) {
      this.listeners.get(id)?.delete(listener);
      if (this.listeners.get(id)?.size === 0) {
        this.listeners.delete(id);
        this.subscribed.delete(id);
      }
    }
  }

  destroy() {
    this.dead = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}

export const statePush = new StatePushWS();
