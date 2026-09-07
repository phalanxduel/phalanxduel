import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import { runAllEndpointChecks } from '../tournament/endpoint-accessibility.js';
import { generateLibraryHtml } from './generate-library.js';

// Ponytail rule: zero external dependencies, native Node.js HTTP server.

const PORT = Number.parseInt(process.env.PORT || '3334', 10);
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  // CORS headers for local LAN exploration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === '/api/status') {
    try {
      const report = await runAllEndpointChecks();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(report));
    } catch (err: unknown) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    }
    return;
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    try {
      const html = await generateLibraryHtml();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (err: unknown) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Failed to render library: ${err}`);
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, HOST, () => {
  console.log(`\n📚 Phalanx Duel Documentation & Architecture Library`);
  console.log(` • Local:   http://localhost:${PORT}`);
  console.log(` • LAN:     http://lan.phalanxduel.com:${PORT} (or active LAN IP)`);
  console.log(` • API:     http://localhost:${PORT}/api/status`);
  console.log(`Press Ctrl+C to stop.\n`);
});
