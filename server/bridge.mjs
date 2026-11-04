import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

/**
 * 大肥鱼 · 状态桥
 *
 * 作用等价于清单里的「ws-push + VariableStore」：
 *   1. 托管海景小屋前端（dist/）
 *   2. 维护一份当前状态，写入 state/dfy-state.json（重启不丢）
 *   3. WebSocket 把状态实时推给前端
 *   4. 提供 HTTP 接口，外部 Agent（DSH / AstrBot / 脚本）可直接写入状态
 *
 * 用 法：
 *   node server/bridge.mjs
 *   POST http://127.0.0.1:5275/state  {"pos":"沙发","action":"发呆","mood":62,"energy":55,"full":68}
 *   前端连接 ws://127.0.0.1:5275/ws
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const STATE_DIR = path.join(ROOT, 'state');
const STATE_FILE = path.join(STATE_DIR, 'dfy-state.json');
const PORT = Number(process.env.DFY_PORT || 5275);

const DEFAULT_STATE = {
  pos: '窗边',
  action: '看海',
  mood: 62,
  energy: 72,
  full: 68,
  updatedAt: Date.now(),
};

function loadState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

let state = loadState();

function saveState() {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.warn('[bridge] 状态落盘失败:', e.message);
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(body);
}

function serveStatic(req, res) {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';

  const file = path.join(DIST, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    const index = path.join(DIST, 'index.html');
    if (fs.existsSync(index)) {
      res.writeHead(200, { 'Content-Type': MIME['.html'] });
      res.end(fs.readFileSync(index));
      return;
    }
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
}

const server = http.createServer((req, res) => {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/state')) {
    sendJson(res, 200, state);
    return;
  }

  if (req.method === 'POST' && req.url.startsWith('/state')) {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try {
        const patch = JSON.parse(body || '{}');
        const next = { ...state };
        if (typeof patch.pos === 'string') next.pos = patch.pos;
        if (typeof patch.action === 'string') next.action = patch.action;
        ['mood', 'energy', 'full'].forEach((k) => {
          if (typeof patch[k] === 'number') next[k] = Math.max(0, Math.min(100, patch[k]));
        });
        next.updatedAt = Date.now();
        state = next;
        saveState();
        broadcast();
        sendJson(res, 200, { ok: true, state });
      } catch (e) {
        sendJson(res, 400, { ok: false, error: e.message });
      }
    });
    return;
  }

  if (req.url.startsWith('/health')) {
    sendJson(res, 200, { ok: true, clients: wss.clients.size, state });
    return;
  }

  serveStatic(req, res);
});

const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast() {
  const msg = JSON.stringify({ type: 'state', data: state });
  for (const c of wss.clients) {
    if (c.readyState === 1) c.send(msg);
  }
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'state', data: state }));
  ws.on('message', (raw) => {
    // 允许前端反向上报本地状态（可选）
    try {
      const m = JSON.parse(raw.toString());
      if (m && m.type === 'report' && m.data) {
        state = { ...state, ...m.data, updatedAt: Date.now() };
        saveState();
      }
    } catch {
      /* ignore */
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[bridge] 海景小屋 + 状态桥已启动`);
  console.log(`[bridge] 前端   http://127.0.0.1:${PORT}`);
  console.log(`[bridge] WS     ws://127.0.0.1:${PORT}/ws`);
  console.log(`[bridge] 状态   POST http://127.0.0.1:${PORT}/state`);
  console.log(`[bridge] 持久化 ${STATE_FILE}`);
});
