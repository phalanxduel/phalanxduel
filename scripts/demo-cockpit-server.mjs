#!/usr/bin/env node

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');

const [quicklinksFile, logDirectory, rawPort = '3333'] = process.argv.slice(2);
const port = Number.parseInt(rawPort, 10);
const allowedServices = new Set(['server', 'client', 'admin']);
const probeTargets = new Map([
  ['app-health', `${process.env.PHALANX_DEMO_APP_URL || 'http://localhost:3001'}/health`],
  ['app-stats', `${process.env.PHALANX_DEMO_APP_URL || 'http://localhost:3001'}/api/stats`],
  ['admin-health', `${process.env.PHALANX_DEMO_ADMIN_API_URL || 'http://localhost:3102'}/health`],
  ['client', `${process.env.PHALANX_DEMO_CLIENT_URL || 'http://localhost:5173'}/`],
]);

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage: node scripts/demo-cockpit-server.mjs <quicklinks-file> <log-directory> [port]

Serves the generated local demo cockpit and read-only live log endpoints.
  GET /                  Cockpit HTML
  GET /health            Local readiness probe
  GET /api/logs/<service>  Tail server, client, or admin logs

The server binds to 127.0.0.1 only. Log tails are capped at 240 lines.`);
  process.exit(0);
}

if (!quicklinksFile || !logDirectory || !Number.isInteger(port)) {
  console.error('Usage: demo-cockpit-server.mjs <quicklinks-file> <log-directory> [port]');
  process.exit(64);
}

function json(response, status, value) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(value));
}

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
}

async function tailLog(service, requestedLines) {
  const lines = Math.min(Math.max(Number.parseInt(requestedLines || '80', 10) || 80, 10), 240);
  const file = join(resolve(logDirectory), `${service}.log`);
  try {
    const contents = await readFile(file, 'utf8');
    return stripAnsi(contents).split(/\r?\n/).filter(Boolean).slice(-lines);
  } catch (error) {
    return [`[log unavailable: ${basename(file)}]`, `[${error.code || 'read error'}]`];
  }
}

async function proxyProbe(name, response) {
  const target = probeTargets.get(name);
  if (!target) {
    json(response, 404, { error: 'probe not found' });
    return;
  }

  try {
    const upstream = await fetch(target, { signal: AbortSignal.timeout(2000) });
    const body = await upstream.text();
    response.writeHead(upstream.status, {
      'content-type': upstream.headers.get('content-type') || 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    });
    response.end(body);
  } catch (error) {
    json(response, 502, {
      error: 'upstream unavailable',
      detail: error.code || error.name || 'fetch failed',
    });
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.log': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.vtt': 'text/vtt; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

function resolveSafePath(requested) {
  if (!requested || typeof requested !== 'string') return null;
  const clean = requested.split('?')[0].trim();
  if (!clean) return null;
  let resolved;
  if (clean.startsWith('file://')) {
    try {
      resolved = fileURLToPath(clean);
    } catch {
      return null;
    }
  } else if (clean.startsWith('/')) {
    resolved = resolve(clean);
  } else {
    resolved = resolve(repoRoot, clean);
  }
  const swiftuiRoot = resolve(repoRoot, '../game-swiftui');
  const allowed = resolved.startsWith(repoRoot) || resolved.startsWith(swiftuiRoot);
  if (!allowed || !existsSync(resolved)) return null;
  return resolved;
}

function serveFile(filePath, request, response) {
  try {
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      json(response, 403, { error: 'directory listing not allowed' });
      return;
    }
    const ext = extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'text/plain; charset=utf-8';
    const totalSize = stat.size;

    const range = request.headers.range;
    if (range && (ext === '.webm' || ext === '.mp4')) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
      if (start >= totalSize || end >= totalSize || start > end) {
        response.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
        response.end();
        return;
      }
      const chunkSize = end - start + 1;
      response.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
      });
      createReadStream(filePath, { start, end }).pipe(response);
    } else {
      response.writeHead(200, {
        'Content-Length': totalSize,
        'Accept-Ranges': 'bytes',
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache',
      });
      createReadStream(filePath).pipe(response);
    }
  } catch (error) {
    json(response, 500, { error: 'failed to read file', detail: error.message });
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);

  if (url.pathname === '/' || url.pathname === '/quicklinks.html') {
    try {
      const html = await readFile(quicklinksFile);
      response.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      });
      response.end(html);
    } catch {
      json(response, 404, { error: 'quicklinks page unavailable' });
    }
    return;
  }

  if (url.pathname === '/view' || url.pathname === '/api/view' || url.pathname === '/api/file') {
    const fileParam = url.searchParams.get('file') || url.searchParams.get('path');
    const safe = resolveSafePath(fileParam);
    if (!safe) {
      json(response, 404, { error: 'file not found or access denied' });
      return;
    }
    serveFile(safe, request, response);
    return;
  }

  if (url.pathname.startsWith('/files/')) {
    const fileParam = decodeURIComponent(url.pathname.slice('/files/'.length));
    const safe = resolveSafePath(fileParam);
    if (!safe) {
      json(response, 404, { error: 'file not found or access denied' });
      return;
    }
    serveFile(safe, request, response);
    return;
  }

  const probe = url.pathname.match(/^\/api\/probe\/([a-z-]+)$/);
  if (probe) {
    await proxyProbe(probe[1], response);
    return;
  }

  const match = url.pathname.match(/^\/api\/logs\/([a-z]+)$/);
  if (match && allowedServices.has(match[1])) {
    json(response, 200, {
      service: match[1],
      lines: await tailLog(match[1], url.searchParams.get('lines')),
    });
    return;
  }

  if (url.pathname === '/health') {
    json(response, 200, { status: 'ok', service: 'phx-demo-cockpit' });
    return;
  }

  json(response, 404, { error: 'not found' });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Demo cockpit listening on http://127.0.0.1:${port}/`);
});
