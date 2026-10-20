#!/usr/bin/env node
/**
 * Minimal static server for previewing dist/ locally: `npm run preview`.
 * Not for production use.
 */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DIST = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const PORT = Number(process.env.PORT) || 4173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'none'; frame-ancestors 'none'; frame-src 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self'",
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

const RELOAD_CLIENT = `<script src="/__dev/reload.js"></script>`;
const RELOAD_SCRIPT = `new EventSource('/__dev/events').addEventListener('reload',()=>location.reload());`;

export function createPreviewServer({ liveReload = false, port = PORT } = {}) {
  if (!existsSync(DIST)) throw new Error('dist/ not found. Run `npm run build` first.');

  const clients = new Set();
  const server = createServer((req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');

    if (liveReload && pathname === '/__dev/events') {
      res.writeHead(200, {
        ...SECURITY_HEADERS,
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream',
      });
      res.write(': connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (liveReload && pathname === '/__dev/reload.js') {
      res.writeHead(200, { ...SECURITY_HEADERS, 'Cache-Control': 'no-store', 'Content-Type': TYPES['.js'] });
      res.end(RELOAD_SCRIPT);
      return;
    }

    let file = join(DIST, normalize(decodeURIComponent(pathname)));
    const fileRelativeToDist = relative(DIST, file);

    if (fileRelativeToDist.startsWith('..') || fileRelativeToDist.includes(':')) {
      res.writeHead(403, SECURITY_HEADERS).end('Forbidden');
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');

    if (!existsSync(file)) {
      res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': TYPES['.txt'] }).end('Not found');
      return;
    }

    const type = TYPES[extname(file)] ?? 'application/octet-stream';
    const cacheControl = liveReload ? 'no-store' : 'no-cache';
    if (liveReload && extname(file) === '.html') {
      const html = readFileSync(file, 'utf8').replace('</body>', `${RELOAD_CLIENT}\n</body>`);
      res.writeHead(200, { ...SECURITY_HEADERS, 'Cache-Control': cacheControl, 'Content-Type': type });
      res.end(html);
      return;
    }

    res.writeHead(200, { ...SECURITY_HEADERS, 'Cache-Control': cacheControl, 'Content-Type': type });
    createReadStream(file).pipe(res);
  });

  server.reload = () => {
    for (const client of clients) client.write('event: reload\ndata: update\n\n');
  };
  server.closeLiveReloadClients = () => {
    for (const client of clients) client.end();
    clients.clear();
  };
  server.listen(port, () => console.log(`Preview: http://localhost:${port}${liveReload ? ' (watching for changes)' : ''}`));
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    createPreviewServer();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
