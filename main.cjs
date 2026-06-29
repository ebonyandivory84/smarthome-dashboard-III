'use strict';
const utils = require('@iobroker/adapter-core');
const express = require('express');
const http = require('http');
const https = require('https');
const ws = require('ws');
const path = require('path');
const fs = require('fs');
const url = require('url');

let adapter;

function startAdapter(options = {}) {
  adapter = utils.adapter({ ...options, name: 'smarthome-dashboard-iii' });
  adapter.on('ready', main);
  adapter.on('unload', (cb) => { try { server?.close(); cb(); } catch { cb(); } });
  return adapter;
}

if (require.main === module) startAdapter();
module.exports = startAdapter;

// ── Config ────────────────────────────────────────────────────────────────────
const CONFIG_STATE = 'smarthome-dashboard-iii.0.config';
const PORT = 8110;
const WWW = path.join(__dirname, 'adapter', 'www');

let app, server, wssStates, wssSnapshot;

async function main() {
  app = express();
  server = http.createServer(app);

  app.use(express.json({ limit: '10mb' }));

  // ── Static ────────────────────────────────────────────────────────────────
  app.use('/smarthome-dashboard-iii', express.static(WWW));
  app.get('/smarthome-dashboard-iii', (_, res) => res.sendFile(path.join(WWW, 'index.html')));
  app.get('/', (_, res) => res.redirect('/smarthome-dashboard-iii'));

  // ── Config CRUD ───────────────────────────────────────────────────────────
  app.get('/api/config', async (_, res) => {
    try {
      const state = await adapter.getForeignStateAsync(CONFIG_STATE);
      const cfg = state?.val ? JSON.parse(String(state.val)) : getDefaultConfig();
      res.json(cfg);
    } catch {
      res.json(getDefaultConfig());
    }
  });

  app.put('/api/config', async (req, res) => {
    try {
      await adapter.setForeignStateAsync(CONFIG_STATE, JSON.stringify(req.body), true);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // ── Named dashboards ───────────────────────────────────────────────────────
  const dashDir = path.join(__dirname, 'dashboards');
  if (!fs.existsSync(dashDir)) fs.mkdirSync(dashDir);

  app.get('/api/dashboards', (_, res) => {
    const names = fs.readdirSync(dashDir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.slice(0, -5));
    res.json(names);
  });

  app.get('/api/dashboards/:name', (req, res) => {
    const file = path.join(dashDir, `${req.params.name}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'not found' });
    res.json(JSON.parse(fs.readFileSync(file, 'utf8')));
  });

  app.put('/api/dashboards/:name', (req, res) => {
    const file = path.join(dashDir, `${req.params.name}.json`);
    fs.writeFileSync(file, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  });

  app.delete('/api/dashboards/:name', (req, res) => {
    const file = path.join(dashDir, `${req.params.name}.json`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    res.json({ ok: true });
  });

  // ── ioBroker States ────────────────────────────────────────────────────────
  app.get('/api/states/:id', async (req, res) => {
    try {
      const state = await adapter.getForeignStateAsync(decodeURIComponent(req.params.id));
      res.json(state ?? { val: null, ts: Date.now(), ack: false });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post('/api/states/:id', async (req, res) => {
    try {
      await adapter.setForeignStateAsync(decodeURIComponent(req.params.id), req.body.val, false);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // ── Objects ────────────────────────────────────────────────────────────────
  app.get('/api/objects', async (req, res) => {
    try {
      const q = req.query.q ? String(req.query.q) : '*';
      const objs = await adapter.getForeignObjectsAsync(q);
      res.json(objs);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // ── Host stats ─────────────────────────────────────────────────────────────
  app.get('/api/host-stats', (_, res) => {
    const os = require('os');
    const cpus = os.cpus();
    const total = os.totalmem();
    const free = os.freemem();
    res.json({
      cpu: cpus.reduce((acc, c) => acc + (1 - c.times.idle / Object.values(c.times).reduce((s, v) => s + v, 0)), 0) / cpus.length * 100,
      mem: (1 - free / total) * 100,
      disk: 0,
      uptime: os.uptime(),
    });
  });

  // ── Logs ───────────────────────────────────────────────────────────────────
  const logBuffer = [];
  const MAX_LOGS = 500;
  adapter.on('log', (msg) => {
    logBuffer.push({ ts: Date.now(), level: msg.severity, source: msg.from || 'system', message: msg.message });
    if (logBuffer.length > MAX_LOGS) logBuffer.shift();
  });
  app.get('/api/logs', (req, res) => {
    const limit = parseInt(String(req.query.limit ?? '100'));
    res.json(logBuffer.slice(-limit));
  });

  // ── Scripts ────────────────────────────────────────────────────────────────
  app.get('/api/scripts', async (_, res) => {
    try {
      const objs = await adapter.getForeignObjectsAsync('script.js.*', 'script');
      const scripts = Object.entries(objs).map(([id, obj]) => ({
        id, name: obj.common?.name ?? id, enabled: Boolean(obj.common?.enabled),
      }));
      res.json(scripts);
    } catch { res.json([]); }
  });

  app.post('/api/scripts/:id/run', async (req, res) => {
    const id = decodeURIComponent(req.params.id);
    try {
      await adapter.setForeignStateAsync(`${id}.run`, true, false);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // ── Camera snapshot proxy ──────────────────────────────────────────────────
  app.get('/api/camera-snapshot', (req, res) => {
    const camUrl = String(req.query.url ?? '');
    if (!camUrl) return res.status(400).end();
    proxyGet(camUrl, res, 'image/jpeg');
  });

  // ── Camera stream proxy ────────────────────────────────────────────────────
  app.get('/api/camera-stream', (req, res) => {
    const camUrl = String(req.query.url ?? '');
    const type = String(req.query.streamType ?? 'mjpeg');
    if (!camUrl) return res.status(400).end();
    if (type === 'mjpeg') {
      res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=--mjpegboundary');
      proxyStreamRaw(camUrl, res);
    } else {
      proxyStreamRaw(camUrl, res);
    }
  });

  // ── Grafana snapshot proxy ─────────────────────────────────────────────────
  app.get('/api/grafana-snapshot', (req, res) => {
    const grafUrl = String(req.query.url ?? '');
    if (!grafUrl) return res.status(400).end();
    proxyGet(grafUrl, res, 'image/png');
  });

  // ── Instar talkback ────────────────────────────────────────────────────────
  const instarSessions = new Map();

  app.post('/api/instar-talk/start', async (req, res) => {
    const { baseUrl, user, pass, channel = 0 } = req.body;
    const token = `instar-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    instarSessions.set(token, { baseUrl, user, pass, channel, ws: null });
    try {
      const wsUrl = `ws://${new URL(baseUrl).hostname}:7681/ws`;
      const auth = Buffer.from(`${user}:${pass}`).toString('base64');
      const socket = new ws.WebSocket(wsUrl, { headers: { Authorization: `Basic ${auth}` } });
      instarSessions.get(token).ws = socket;
      await new Promise((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('error', reject);
        setTimeout(() => reject(new Error('timeout')), 5000);
      });
      res.json({ token });
    } catch (e) {
      instarSessions.delete(token);
      res.status(500).json({ error: String(e) });
    }
  });

  app.post('/api/instar-talk/chunk', express.raw({ type: '*/*', limit: '1mb' }), (req, res) => {
    const token = req.headers['session'];
    const session = instarSessions.get(token);
    if (!session?.ws) return res.status(404).end();
    session.ws.send(req.body);
    res.json({ ok: true });
  });

  app.post('/api/instar-talk/stop', (req, res) => {
    const { token } = req.body;
    const session = instarSessions.get(token);
    session?.ws?.close();
    instarSessions.delete(token);
    res.json({ ok: true });
  });

  // ── Reolink talkback ───────────────────────────────────────────────────────
  const reolinkSessions = new Map();

  app.post('/api/reolink-talk/start', (req, res) => {
    const { url: rUrl, user, pass, channel = 0 } = req.body;
    const token = `reolink-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    reolinkSessions.set(token, { url: rUrl, user, pass, channel });
    res.json({ token });
  });

  app.post('/api/reolink-talk/stop', (req, res) => {
    reolinkSessions.delete(req.body.token);
    res.json({ ok: true });
  });

  // ── WebSocket: state push ─────────────────────────────────────────────────
  setupStatePushWS();

  // ── WebSocket: camera snapshot ─────────────────────────────────────────────
  setupCameraSnapshotWS();

  server.listen(PORT, () => {
    adapter.log.info(`SmartHome Dashboard III running on port ${PORT}`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket: state push
// ─────────────────────────────────────────────────────────────────────────────
function setupStatePushWS() {
  wssStates = new ws.WebSocketServer({ server, path: '/ws' });
  const subscriptions = new Map(); // clientId → Set<stateId>
  const refCount = new Map(); // stateId → count

  const stateListener = (id, obj) => {
    if (!obj) return;
    const msg = JSON.stringify({ type: 'state', id, state: obj });
    for (const client of wssStates.clients) {
      if (client.readyState === ws.WebSocket.OPEN && client._subs?.has(id)) {
        client.send(msg);
      }
    }
  };

  wssStates.on('connection', (socket) => {
    socket._subs = new Set();

    socket.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'watch' && Array.isArray(msg.stateIds)) {
          const newIds = msg.stateIds.filter(id => !socket._subs.has(id)).slice(0, 4000);
          for (const id of newIds) {
            socket._subs.add(id);
            const prev = refCount.get(id) ?? 0;
            if (prev === 0) adapter.subscribeForeignStates(id);
            refCount.set(id, prev + 1);
          }
          // Send initial snapshot
          const snapshot = {};
          await Promise.all(newIds.map(async (id) => {
            const s = await adapter.getForeignStateAsync(id).catch(() => null);
            if (s) snapshot[id] = s;
          }));
          socket.send(JSON.stringify({ type: 'snapshot', states: snapshot }));
        }
      } catch { /* ignore */ }
    });

    socket.on('close', () => {
      for (const id of socket._subs) {
        const cnt = (refCount.get(id) ?? 1) - 1;
        if (cnt <= 0) { refCount.delete(id); adapter.unsubscribeForeignStates(id); }
        else refCount.set(id, cnt);
      }
    });
  });

  adapter.on('stateChange', stateListener);
}

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket: camera snapshot push
// ─────────────────────────────────────────────────────────────────────────────
function setupCameraSnapshotWS() {
  wssSnapshot = new ws.WebSocketServer({ server, path: '/ws-camera-snapshot' });

  wssSnapshot.on('connection', (socket) => {
    let timer = null;

    socket.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'start' && msg.url) {
          const refreshMs = Math.max(500, msg.refreshMs ?? 5000);
          if (timer) clearInterval(timer);
          const send = () => {
            fetchSnapshot(msg.url, (err, buf) => {
              if (err || !buf) return;
              if (socket.readyState === ws.WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'snapshot', dataUrl: `data:image/jpeg;base64,${buf.toString('base64')}` }));
              }
            });
          };
          send();
          timer = setInterval(send, refreshMs);
        }
        if (msg.type === 'stop') { clearInterval(timer); timer = null; }
      } catch { /* ignore */ }
    });

    socket.on('close', () => { clearInterval(timer); });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function proxyGet(targetUrl, res, contentType) {
  const mod = targetUrl.startsWith('https') ? https : http;
  const req = mod.get(targetUrl, { timeout: 8000 }, (upstream) => {
    if (upstream.statusCode >= 300 && upstream.statusCode < 400 && upstream.headers.location) {
      return proxyGet(upstream.headers.location, res, contentType);
    }
    res.setHeader('Content-Type', upstream.headers['content-type'] ?? contentType);
    res.setHeader('Cache-Control', 'no-store');
    upstream.pipe(res);
  });
  req.on('error', (e) => res.status(502).end(String(e)));
  req.on('timeout', () => { req.destroy(); res.status(504).end('timeout'); });
}

function proxyStreamRaw(targetUrl, res) {
  const mod = targetUrl.startsWith('https') ? https : http;
  const req = mod.get(targetUrl, { timeout: 30000 }, (upstream) => {
    res.setHeader('Content-Type', upstream.headers['content-type'] ?? 'application/octet-stream');
    upstream.pipe(res);
    upstream.on('end', () => res.end());
  });
  req.on('error', (e) => { if (!res.headersSent) res.status(502).end(String(e)); });
  res.on('close', () => req.destroy());
}

function fetchSnapshot(targetUrl, cb) {
  const mod = targetUrl.startsWith('https') ? https : http;
  const chunks = [];
  const req = mod.get(targetUrl, { timeout: 5000 }, (r) => {
    r.on('data', d => chunks.push(d));
    r.on('end', () => cb(null, Buffer.concat(chunks)));
  });
  req.on('error', e => cb(e, null));
  req.on('timeout', () => { req.destroy(); cb(new Error('timeout'), null); });
}

function getDefaultConfig() {
  return {
    version: 3,
    settings: { title: 'SmartHome', homeLabel: 'Home', rowHeight: 120, soundSettings: { enabled: true, volume: 0.55 } },
    pages: [{ id: 'page-1', label: 'Home', widgets: [] }],
  };
}
