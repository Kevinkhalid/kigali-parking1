// server.mjs
import { createServer } from 'node:http';
import { readFile, writeFile, access } from 'node:fs/promises';
import { scryptSync, randomBytes } from 'node:crypto';
import { extname, join } from 'node:path';

const PUBLIC_DIR = process.cwd(); // serves files from project root

function contentTypeFromPath(p) {
  const ext = extname(p).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
  }[ext] || 'application/octet-stream';
}

async function readJSON(file) {
  try {
    const txt = await readFile(file, 'utf8');
    return JSON.parse(txt);
  } catch (e) {
    return null;
  }
}

async function writeJSON(file, obj) {
  await writeFile(file, JSON.stringify(obj, null, 2), 'utf8');
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + derived;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, derived] = parts;
  const check = scryptSync(password, salt, 64).toString('hex');
  return check === derived;
}

function sanitizeUser(u) {
  const copy = Object.assign({}, u);
  delete copy.password;
  return copy;
}

const DB_PATH = join(PUBLIC_DIR, 'data', 'db.json');

const server = createServer(async (req, res) => {
  try {
    const rawUrl = req.url.split('?')[0];
    const url = decodeURIComponent(rawUrl);

    // Simple JSON API routes under /api/*
    if (url.startsWith('/api/')) {
      // ensure DB exists
      try { await access(DB_PATH); } catch (e) { await writeJSON(DB_PATH, { owner: {}, zones: [], nextZoneId: 1 }); }
      const db = await readJSON(DB_PATH) || { owner: {}, zones: [], nextZoneId: 1 };

      // helper to collect body
      const getBody = async () => {
        return new Promise((resolve, reject) => {
          let body = '';
          req.on('data', (c) => body += c);
          req.on('end', () => {
            try { resolve(body ? JSON.parse(body) : null); } catch (e) { resolve(null); }
          });
          req.on('error', reject);
        });
      };

      // GET /api/owner
      if (url === '/api/owner' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.owner || {}));
        return;
      }

      // POST /api/owner -> update owner
      if (url === '/api/owner' && req.method === 'POST') {
        const payload = await getBody();
        db.owner = Object.assign(db.owner || {}, payload || {});
        await writeJSON(DB_PATH, db);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.owner));
        return;
      }

      // GET /api/zones
      if (url === '/api/zones' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.zones || []));
        return;
      }

      // POST /api/login -> authenticate
      if (url === '/api/login' && req.method === 'POST') {
        const payload = await getBody();
        const email = (payload && payload.email || '').toLowerCase();
        const password = payload && payload.password;
        if (!email || !password) { res.writeHead(422, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'email and password required' })); return; }
        const user = (db.users || []).find(u => (u.email || '').toLowerCase() === email);
        if (!user || !verifyPassword(password, user.password)) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'invalid credentials' })); return; }
        // simple session token (not secure) — random bytes base64
        const token = randomBytes(18).toString('hex');
        // store token in-memory on user for this simple demo
        user._token = token;
        await writeJSON(DB_PATH, db);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ token, user: sanitizeUser(user) }));
        return;
      }

      // POST /api/register -> create user (with password hashing)
      if (url === '/api/register' && req.method === 'POST') {
        const payload = await getBody();
        const email = (payload && payload.email || '').toLowerCase();
        if (!email || !payload.password) {
          res.writeHead(422, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'email and password required' }));
          return;
        }
        db.users = db.users || [];
        // uniqueness check
        if (db.users.find(u => (u.email || '').toLowerCase() === email)) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'email already registered' }));
          return;
        }
        const u = Object.assign({}, payload || {});
        u.email = email;
        u.id = db.nextUserId = (db.nextUserId || 1);
        db.nextUserId++;
        u.createdAt = new Date().toISOString();
        // hash password
        u.password = hashPassword(payload.password);
        db.users.push(u);
        await writeJSON(DB_PATH, db);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(sanitizeUser(u)));
        return;
      }

      // GET /api/users -> list users (sanitized)
      if (url === '/api/users' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify((db.users || []).map(sanitizeUser)));
        return;
      }

      // POST /api/zones -> add zone
      if (url === '/api/zones' && req.method === 'POST') {
        const payload = await getBody();
        const z = Object.assign({}, payload || {});
        z.id = db.nextZoneId = (db.nextZoneId || 1);
        db.nextZoneId++;
        db.zones = db.zones || [];
        db.zones.push(z);
        await writeJSON(DB_PATH, db);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(z));
        return;
      }

      // PUT /api/zones/:id -> update
      if (url.startsWith('/api/zones/') && req.method === 'PUT') {
        const id = parseInt(url.split('/').pop(), 10);
        const payload = await getBody();
        const idx = (db.zones || []).findIndex(z => z.id === id);
        if (idx === -1) { res.writeHead(404); res.end('Not found'); return; }
        db.zones[idx] = Object.assign(db.zones[idx], payload || {});
        await writeJSON(DB_PATH, db);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.zones[idx]));
        return;
      }

      // DELETE /api/zones/:id
      if (url.startsWith('/api/zones/') && req.method === 'DELETE') {
        const id = parseInt(url.split('/').pop(), 10);
        const before = db.zones.length;
        db.zones = (db.zones || []).filter(z => z.id !== id);
        if (db.zones.length === before) { res.writeHead(404); res.end('Not found'); return; }
        await writeJSON(DB_PATH, db);
        res.writeHead(204); res.end(); return;
      }

      // Unknown API route
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('API route not found');
      return;
    }

    // Serve static files (existing behavior)
    let filePath = url === '/' ? '/MOVE1.HTML' : url;
    // Prevent path traversal
    if (filePath.includes('..')) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad request');
      return;
    }
    const absPath = join(PUBLIC_DIR, filePath.replace(/^\//, ''));
    const data = await readFile(absPath);
    const ct = contentTypeFromPath(absPath);
    res.writeHead(200, { 'Content-Type': ct });
    res.end(data);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

// starts a simple http server locally on port 3000
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
server.listen(PORT, HOST, () => {
  console.log(`Listening on ${HOST}:${PORT}`);
});

// run with `node server.mjs`
