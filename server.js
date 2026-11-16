// Hospitality Managers Challenge — serveur : sert le jeu et relaie les duels 2 joueurs en WebSocket.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
// Le jeu sait qu'il tourne sur ce serveur (mode duel disponible).
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8')
  .replace('<head>', '<head><script>window.DUEL=1</script>');

// Fichiers de l'app installable (icônes, manifeste, service worker)
const VERSION = process.env.RAILWAY_GIT_COMMIT_SHA ? process.env.RAILWAY_GIT_COMMIT_SHA.slice(0, 8) : String(Date.now());
const TYPES = { '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.js': 'text/javascript; charset=utf-8' };
const PUBLIC = {};
for (const f of fs.readdirSync(path.join(__dirname, 'public'))) {
  let body = fs.readFileSync(path.join(__dirname, 'public', f));
  if (f === 'sw.js') body = Buffer.from(body.toString().replace('__VERSION__', VERSION));
  PUBLIC['/' + f] = { body, type: TYPES[path.extname(f)] || 'application/octet-stream' };
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/health') { res.writeHead(200); res.end('ok'); return; }
  const file = PUBLIC[url];
  if (file) {
    res.writeHead(200, { 'Content-Type': file.type, 'Cache-Control': url === '/sw.js' ? 'no-cache' : 'public, max-age=86400' });
    res.end(file.body); return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(html);
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 });
const rooms = new Map(); // code -> { p: [ws, ws], names: [..], ready: Set }

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() {
  let c;
  do { c = Array.from({ length: 4 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join(''); }
  while (rooms.has(c));
  return c;
}
function send(ws, o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
function start(r) {
  r.ready = new Set();
  r.p.forEach((p, i) => send(p, { t: 'start', me: r.names[i], opp: r.names[1 - i], lvl: r.lvl, delay: 3500 }));
}
function leave(ws) {
  const c = ws.room; if (!c) return;
  ws.room = null;
  const r = rooms.get(c); if (!r) return;
  r.p.filter(p => p !== ws).forEach(p => { send(p, { t: 'left' }); p.room = null; });
  rooms.delete(c);
}

wss.on('connection', ws => {
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object') return;
    const name = String(m.name || 'HM').slice(0, 16);
    const r = ws.room && rooms.get(ws.room);
    const other = r && r.p.find(p => p !== ws);
    switch (m.t) {
      case 'create': {
        leave(ws);
        const c = newCode();
        const lvl = ['deb', 'conf', 'exp'].includes(m.lvl) ? m.lvl : 'deb';
        rooms.set(c, { p: [ws], names: [name], ready: new Set(), lvl });
        ws.room = c; send(ws, { t: 'created', code: c });
        break;
      }
      case 'join': {
        const c = String(m.code || '').toUpperCase().slice(0, 4);
        const room = rooms.get(c);
        if (!room) return send(ws, { t: 'error', msg: 'Code introuvable' });
        if (room.p.length !== 1) return send(ws, { t: 'error', msg: 'Partie déjà complète' });
        leave(ws);
        room.p.push(ws); room.names.push(name); ws.room = c;
        start(room);
        break;
      }
      case 'st':
        send(other, { t: 'opp', score: +m.score || 0, sat: +m.sat || 0, streak: +m.streak || 0 });
        break;
      case 'atk':
        send(other, { t: 'atk', kind: m.kind === 'vip' ? 'vip' : 'clumsy', from: r ? r.names[r.p.indexOf(ws)] : 'HM' });
        break;
      case 'end':
        send(other, { t: 'oppend', score: +m.score || 0 });
        break;
      case 'rematch':
        if (!r || r.p.length !== 2) return;
        r.ready.add(ws);
        if (r.ready.size === 2) start(r); else send(other, { t: 'rematchreq' });
        break;
      case 'leave':
        leave(ws);
        break;
    }
  });
  ws.on('close', () => leave(ws));
});

setInterval(() => wss.clients.forEach(ws => {
  if (!ws.alive) return ws.terminate();
  ws.alive = false; ws.ping();
}), 25000);

server.listen(PORT, () => console.log(`Hospitality Managers Challenge en ligne sur le port ${PORT}`));
