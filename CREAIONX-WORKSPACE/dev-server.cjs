const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8080);
const ROOT = __dirname;
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxWZLpE9APX0G9K1YPSFknwt_uHuuWaRQB96I28x3wlSTaAv6qb6vV6Go7iOyeeDWffTA/exec';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(body));
}

async function proxyWorkspace(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
    return;
  }

  let body = '';
  for await (const chunk of req) body += chunk;

  try {
    const upstream = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      redirect: 'follow'
    });

    const text = await upstream.text();
    res.writeHead(upstream.ok ? 200 : upstream.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(text);
  } catch (error) {
    sendJson(res, 502, {
      ok: false,
      error: 'Unable to reach the CREAIONX Workspace backend.',
      detail: error && error.message ? error.message : String(error)
    });
  }
}

function serveStatic(req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname);
  } catch {
    res.writeHead(400); res.end('Bad request'); return;
  }

  if (pathname === '/') pathname = '/index.html';
  let filePath = path.join(ROOT, pathname);

  if (!path.extname(filePath)) {
    const htmlPath = `${filePath}.html`;
    if (fs.existsSync(htmlPath)) filePath = htmlPath;
  }

  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(path.normalize(ROOT))) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.stat(normalized, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': MIME[path.extname(normalized).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(normalized).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
  if (pathname === '/api/workspace') {
    await proxyWorkspace(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`CREAIONX WORKSPACE dev server running on http://0.0.0.0:${PORT}`);
  console.log('Static frontend + /api/workspace proxy are active.');
});
