#!/usr/bin/env tsx

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const DEFAULT_PORT = 4321;
const HISTORY_JSON = 'docs/quality/ladder-history.json';
const LADDER_SCRIPT = 'bin/qa/ladder-season.ts';

// ---------------------------------------------------------------------------
// HTML UI
// ---------------------------------------------------------------------------

function buildUiHtml(port: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Ladder Simulation</title>
  <script src="https://cdn.jsdelivr.net/npm/vega@5"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-lite@5"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-embed@6"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background: #0d1117; color: #e6edf3; display: grid; grid-template-columns: 300px 1fr; min-height: 100vh; }
    aside { padding: 1.5rem; border-right: 1px solid #21262d; display: flex; flex-direction: column; gap: 1rem; }
    main { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    h1 { font-size: 1rem; font-weight: 600; margin: 0; color: #f0f6fc; }
    h2 { font-size: 0.8rem; font-weight: 600; margin: 0 0 0.5rem; color: #8b949e; text-transform: uppercase; letter-spacing: 0.05em; }
    label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.83rem; color: #c9d1d9; }
    input[type=number], input[type=text] { background: #161b22; border: 1px solid #30363d; color: #e6edf3; padding: 0.4rem 0.6rem; border-radius: 4px; font-size: 0.85rem; width: 100%; }
    input:focus { outline: none; border-color: #58a6ff; }
    button { background: #238636; color: #fff; border: none; padding: 0.55rem 1rem; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; width: 100%; }
    button:hover:not(:disabled) { background: #2ea043; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    #log { background: #161b22; border: 1px solid #21262d; border-radius: 6px; padding: 0.75rem; font-family: ui-monospace, 'Cascadia Code', monospace; font-size: 0.78rem; color: #8b949e; min-height: 120px; max-height: 220px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; }
    #log.active { color: #e6edf3; }
    #vis { flex: 1; min-height: 340px; }
    .status { font-size: 0.75rem; color: #8b949e; }
    .status.running { color: #58a6ff; }
    .status.done { color: #3fb950; }
    .status.error { color: #f85149; }
  </style>
</head>
<body>
  <aside>
    <h1>Ladder Simulation</h1>
    <form id="form" autocomplete="off">
      <div style="display:flex;flex-direction:column;gap:0.75rem">
        <label>Seed<input type="number" name="seed" value="20260521" /></label>
        <label>Players<input type="number" name="players" value="24" min="4" /></label>
        <label>Matches<input type="number" name="matches" value="240" min="1" /></label>
        <label>Top-N window<input type="number" name="topN" value="" placeholder="default: top decile" /></label>
        <label>Shadow K-factors<input type="text" name="shadowKFactors" placeholder="e.g. 16,32,48" /></label>
      </div>
      <div style="margin-top:1rem;display:flex;flex-direction:column;gap:0.5rem">
        <button id="runBtn" type="submit">Run simulation</button>
        <span id="status" class="status"></span>
      </div>
    </form>
    <div>
      <h2>Output</h2>
      <pre id="log">Ready.</pre>
    </div>
  </aside>
  <main>
    <h2>History</h2>
    <div id="vis"></div>
  </main>
  <script>
    const PORT = ${port};

    function buildSpec(rows) {
      return {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        data: { values: rows },
        width: 'container',
        height: 320,
        mark: { type: 'line', point: { filled: true, size: 80 } },
        encoding: {
          x: { field: 'timestamp', type: 'temporal', title: 'Run date', axis: { format: '%m-%d %H:%M', labelAngle: -30 } },
          y: { field: 'spearman', type: 'quantitative', title: 'Spearman', scale: { domain: [0, 1] } },
          color: { field: 'label', type: 'nominal', title: 'Policy' },
          tooltip: [
            { field: 'timestamp', type: 'temporal', title: 'Date', format: '%Y-%m-%d %H:%M' },
            { field: 'sha', type: 'nominal', title: 'Commit' },
            { field: 'label', type: 'nominal', title: 'Policy' },
            { field: 'kFactor', type: 'quantitative', title: 'K' },
            { field: 'seed', type: 'quantitative', title: 'Seed' },
            { field: 'spearman', type: 'quantitative', title: 'Spearman', format: '.4f' },
            { field: 'topNOverlap', type: 'quantitative', title: 'Top-N', format: '.4f' },
          ],
        },
      };
    }

    let vegaView = null;

    async function loadChart() {
      const res = await fetch('/api/history');
      const rows = await res.json();
      const spec = buildSpec(rows);
      if (vegaView) {
        vegaView.finalize();
        vegaView = null;
      }
      const result = await vegaEmbed('#vis', spec, {
        theme: 'dark',
        actions: { export: true, source: false, editor: true, compiled: false },
      });
      vegaView = result.view;
    }

    function setStatus(msg, cls) {
      const el = document.getElementById('status');
      el.textContent = msg;
      el.className = 'status' + (cls ? ' ' + cls : '');
    }

    document.getElementById('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      const btn = document.getElementById('runBtn');
      const log = document.getElementById('log');
      btn.disabled = true;
      log.textContent = '';
      log.classList.add('active');
      setStatus('Running…', 'running');

      try {
        const res = await fetch('/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.text();
          log.textContent = err;
          setStatus('Error', 'error');
          return;
        }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          log.textContent += dec.decode(value);
          log.scrollTop = log.scrollHeight;
        }
        setStatus('Done', 'done');
        await loadChart();
      } catch (err) {
        log.textContent += '\\nFailed: ' + String(err);
        setStatus('Error', 'error');
      } finally {
        btn.disabled = false;
        log.classList.remove('active');
      }
    });

    loadChart().catch(() => {
      document.getElementById('log').textContent = 'No history yet. Run a simulation to start.';
    });
  </script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// HTTP handlers
// ---------------------------------------------------------------------------

async function handleHistory(res: ServerResponse): Promise<void> {
  try {
    const raw = await readFile(HISTORY_JSON, 'utf8').catch(() => '[]');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(raw);
  } catch {
    res.writeHead(500);
    res.end('[]');
  }
}

async function handleSimulate(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body = '';
  for await (const chunk of req) body += chunk;

  let params: Record<string, string>;
  try {
    params = JSON.parse(body) as Record<string, string>;
  } catch {
    res.writeHead(400);
    res.end('Invalid JSON');
    return;
  }

  const args: string[] = [];
  if (params.seed) args.push('--seed', params.seed);
  if (params.players) args.push('--players', params.players);
  if (params.matches) args.push('--matches', params.matches);
  if (params.topN) args.push('--top-n', params.topN);
  if (params.shadowKFactors?.trim()) args.push('--shadow-k-factors', params.shadowKFactors.trim());

  const tsx = resolve('node_modules/.bin/tsx');
  const child = spawn(tsx, [LADDER_SCRIPT, ...args], {
    cwd: process.cwd(),
    env: process.env,
  });

  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Transfer-Encoding': 'chunked',
  });

  child.stdout.on('data', (chunk: Buffer) => {
    res.write(chunk);
  });
  child.stderr.on('data', (chunk: Buffer) => {
    res.write(chunk);
  });
  child.on('close', (code) => {
    res.write(`\nExited with code ${code ?? 0}\n`);
    res.end();
  });
}

function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  const url = req.url ?? '/';
  const method = req.method ?? 'GET';

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (method === 'GET' && url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(buildUiHtml(DEFAULT_PORT));
    return;
  }
  if (method === 'GET' && url === '/api/history') {
    void handleHistory(res);
    return;
  }
  if (method === 'POST' && url === '/api/simulate') {
    void handleSimulate(req, res);
    return;
  }
  res.writeHead(404);
  res.end('Not found');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function openBrowser(url: string): void {
  const cmd =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  try {
    execSync(cmd, { stdio: 'ignore' });
  } catch {
    // browser open is best-effort
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((a) => a !== '--'),
    options: {
      port: { type: 'string', default: String(DEFAULT_PORT) },
      'no-open': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help) {
    console.log(`Usage: tsx bin/qa/ladder-serve.ts [OPTIONS]

Options:
  --port NUMBER    Port to listen on (default: ${DEFAULT_PORT})
  --no-open        Do not open browser automatically
  --help           Show this help
`);
    return;
  }

  const port = Number(values.port ?? DEFAULT_PORT);
  const server = createServer(handleRequest);

  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}`;
    console.log(`Ladder simulation server running at ${url}`);
    console.log('Press Ctrl-C to stop.');
    if (!values['no-open']) openBrowser(url);
  });

  process.on('SIGINT', () => {
    server.close();
    process.exit(0);
  });
}

try {
  await main();
} catch (err) {
  if (err instanceof Error && err.message.includes('Unknown option')) {
    console.error(`${err.message}\nRun with --help for usage.`);
    process.exitCode = 1;
  } else {
    throw err;
  }
}
