#!/usr/bin/env node

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const [quicklinksFile, logDirectory, rawPort = '3333'] = process.argv.slice(2);
const port = Number.parseInt(rawPort, 10);
const allowedServices = new Set(['server', 'client', 'admin']);
const probeTargets = new Map([
  ['app-health', 'http://127.0.0.1:3001/health'],
  ['app-stats', 'http://127.0.0.1:3001/api/stats'],
  ['admin-health', 'http://127.0.0.1:3102/health'],
  ['client', 'http://127.0.0.1:5173/'],
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
