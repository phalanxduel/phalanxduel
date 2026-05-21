#!/usr/bin/env tsx

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const DEFAULT_PORT = 4321;
const HISTORY_JSON = 'docs/quality/ladder-history.json';
const ARTIFACT_JSON = 'artifacts/ladder/ladder-season.json';
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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background: #0d1117; color: #e6edf3; display: flex; align-items: flex-start; min-height: 100vh; }
    aside { width: 300px; flex-shrink: 0; padding: 1.25rem; border-right: 1px solid #21262d; display: flex; flex-direction: column; gap: 0.875rem; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
    main { flex: 1; min-width: 0; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
    h1 { font-size: 1rem; font-weight: 600; margin: 0; color: #f0f6fc; }
    h2 { font-size: 0.75rem; font-weight: 600; margin: 0 0 0.5rem; color: #8b949e; text-transform: uppercase; letter-spacing: 0.06em; }
    label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.83rem; color: #c9d1d9; }
    .hint { font-size: 0.72rem; color: #484f58; line-height: 1.3; }
    input[type=number], input[type=text] { background: #161b22; border: 1px solid #30363d; color: #e6edf3; padding: 0.38rem 0.6rem; border-radius: 4px; font-size: 0.85rem; width: 100%; }
    input:focus { outline: none; border-color: #58a6ff; }
    button.primary { background: #238636; color: #fff; border: none; padding: 0.55rem 1rem; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; width: 100%; }
    button.primary:hover:not(:disabled) { background: #2ea043; }
    button.primary:disabled { opacity: 0.5; cursor: not-allowed; }
    #log { background: #161b22; border: 1px solid #21262d; border-radius: 6px; padding: 0.65rem; font-family: ui-monospace, 'Cascadia Code', monospace; font-size: 0.76rem; color: #8b949e; min-height: 90px; max-height: 180px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; }
    #log.active { color: #e6edf3; }
    .status { font-size: 0.75rem; color: #8b949e; }
    .status.running { color: #58a6ff; }
    .status.done { color: #3fb950; }
    .status.error { color: #f85149; }

    /* Metric cards */
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.625rem; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 0.7rem 0.85rem; display: flex; flex-direction: column; gap: 0.2rem; border-left-width: 3px; }
    .card.good { border-left-color: #3fb950; }
    .card.warn { border-left-color: #d29922; }
    .card.bad  { border-left-color: #f85149; }
    .card.neutral { border-left-color: #30363d; }
    .card .val  { font-size: 1.35rem; font-weight: 700; color: #f0f6fc; line-height: 1; }
    .card .name { font-size: 0.72rem; color: #8b949e; font-weight: 500; }
    .card .note { font-size: 0.68rem; color: #484f58; margin-top: 0.1rem; }

    /* Standings table */
    .tbl-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th { text-align: left; padding: 0.4rem 0.6rem; color: #8b949e; font-weight: 600; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #21262d; white-space: nowrap; }
    td { padding: 0.38rem 0.6rem; border-bottom: 1px solid #161b22; color: #c9d1d9; white-space: nowrap; }
    tr.misrank td { background: #1c1a0e; }
    tr.misrank td.delta { color: #d29922; font-weight: 600; }
    tr:not(.misrank) td.delta { color: #3fb950; font-size: 0.72rem; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    td.top { color: #f0f6fc; font-weight: 600; }

    /* Shadow table */
    .shadow-row.best td.sp { color: #3fb950; font-weight: 700; }

    /* Legend */
    details { background: #161b22; border: 1px solid #21262d; border-radius: 6px; }
    summary { padding: 0.6rem 0.85rem; font-size: 0.8rem; font-weight: 600; color: #c9d1d9; cursor: pointer; user-select: none; list-style: none; display: flex; align-items: center; gap: 0.4rem; }
    summary::before { content: '▶'; font-size: 0.6rem; color: #8b949e; transition: transform 0.15s; }
    details[open] summary::before { transform: rotate(90deg); }
    .legend-body { padding: 0.75rem 0.85rem 0.85rem; display: flex; flex-direction: column; gap: 0.875rem; }
    .legend-section h3 { font-size: 0.75rem; font-weight: 600; color: #8b949e; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.4rem; }
    .legend-section p { font-size: 0.78rem; color: #8b949e; margin: 0 0 0.4rem; line-height: 1.5; }
    .legend-section table { font-size: 0.76rem; }
    .legend-section td, .legend-section th { padding: 0.28rem 0.5rem; }
    #cards-section, #standings-section, #shadow-section { display: none; }
  </style>
</head>
<body>
<aside>
  <h1>Ladder Simulation</h1>
  <form id="form" autocomplete="off">
    <div style="display:flex;flex-direction:column;gap:0.65rem">
      <label>Seed
        <input type="number" name="seed" value="20260521" />
        <span class="hint">Fixes all randomness — same seed always produces identical output</span>
      </label>
      <label>Players
        <input type="number" name="players" value="24" min="4" />
        <span class="hint">Synthetic player count. Larger pools need more matches to converge</span>
      </label>
      <label>Matches
        <input type="number" name="matches" value="240" min="1" />
        <span class="hint">Games played in the season. Aim for ≥10× the player count</span>
      </label>
      <label>Top-N window
        <input type="number" name="topN" value="" placeholder="default: top decile" />
        <span class="hint">Players compared at the top for overlap metric. Default: ⌈players/10⌉</span>
      </label>
      <label>Seeds (range or list)
        <input type="text" name="seeds" placeholder="e.g. 20260521:20260530 or 1,2,3" />
        <span class="hint">Run multiple seeds sequentially to build variance data. Overrides Seed above when set.</span>
      </label>
      <label>Shadow K-factors
        <input type="text" name="shadowKFactors" placeholder="e.g. 16,32,48" />
        <span class="hint">Compare multiple K-values on the same season. Production K is 32</span>
      </label>
    </div>
    <div style="margin-top:0.875rem;display:flex;flex-direction:column;gap:0.4rem">
      <button id="runBtn" class="primary" type="submit">Run simulation</button>
      <span id="status" class="status"></span>
    </div>
  </form>

  <div>
    <h2>Output</h2>
    <pre id="log">Ready.</pre>
  </div>

  <details>
    <summary>Deriving insights</summary>
    <div class="legend-body">
      <div class="legend-section">
        <h3>Reading the chart</h3>
        <p>A flat <em>production</em> line across runs means the rating system is stable. A sudden drop after a commit identifies the breaking change. Shadow lines above production mean that K-factor converges faster for this season length.</p>
      </div>
      <div class="legend-section">
        <h3>Calibrate K-factor</h3>
        <p>Enter <code style="background:#0d1117;padding:0.1em 0.3em;border-radius:3px;font-size:0.85em">16,32,48</code> in Shadow K-factors. If k=48 beats k=32 by &gt;0.02 Spearman, production K may be too conservative. If k=16 is within noise of k=32, the default is fine. Always check Avg volatility alongside Spearman — a tiny Spearman gain with much higher volatility is not worth it.</p>
      </div>
      <div class="legend-section">
        <h3>Find minimum season length</h3>
        <p>Hold seed and players fixed. Run the same seed at matches = 60, 120, 240, 480 in sequence. The inflection where Spearman stops improving is the minimum viable season length. Below it, ratings have not had enough information to converge — Spearman understates production quality.</p>
      </div>
      <div class="legend-section">
        <h3>Reading standings</h3>
        <p>Amber rows have |Δ| ≥ 3 — the player's rating rank is 3+ positions away from their true skill rank. A high Spearman with many amber rows means middle-pack order is good but the top/bottom tiers are being swapped. Check whether those players had unusually few games.</p>
      </div>
      <div class="legend-section">
        <h3>Did my change help?</h3>
        <p>Run before and after the change with the same seed. The seed fixes both the population and match schedule, so any Spearman difference is caused by the rating logic change, not chance.</p>
      </div>
      <div class="legend-section">
        <h3>Verify gate</h3>
        <p>Run <code style="background:#0d1117;padding:0.1em 0.3em;border-radius:3px;font-size:0.85em">pnpm qa:ladder:verify</code> in a terminal to confirm the production baseline still meets the thresholds (Spearman ≥ 0.72, Top-N ≥ 0.5).</p>
      </div>
    </div>
  </details>

  <details>
    <summary>Metric reference</summary>
    <div class="legend-body">
      <div class="legend-section">
        <h3>Spearman correlation</h3>
        <p>Rank correlation between final Elo ratings and hidden latent skill. Measures whether the ladder puts players in the right order, not whether the rating numbers are accurate.</p>
        <table>
          <tr><th>Value</th><th>Meaning</th></tr>
          <tr><td class="num">1.0</td><td>Perfect rank order</td></tr>
          <tr><td class="num">≥ 0.85</td><td>Strong — reliable ordering</td></tr>
          <tr><td class="num">≥ 0.72</td><td>Acceptable — verify gate passes</td></tr>
          <tr><td class="num">&lt; 0.72</td><td>Weak — ladder unreliable</td></tr>
        </table>
      </div>
      <div class="legend-section">
        <h3>Top-N overlap</h3>
        <p>Fraction of the N highest-skill players who appear in the top-N by rating. Captures precision at the top of the ladder — the most visible failure mode for competitive trust.</p>
        <p>Can diverge from Spearman: a ladder may rank the middle tier well (high Spearman) while consistently misranking elite players (low overlap).</p>
      </div>
      <div class="legend-section">
        <h3>Avg volatility</h3>
        <p>Mean point swing across each player's last few games. High volatility = ratings still moving; the season may be too short. Low volatility = ladder has settled.</p>
        <p>If volatility is still high at season end, add more matches before trusting the Spearman reading.</p>
      </div>
      <div class="legend-section">
        <h3>Largest gain / loss</h3>
        <p>Extreme single-season rating swings. Very high values (e.g. ±200) with few games usually means K is too large. Expected range at K=32 with 20 games: roughly ±80–150.</p>
      </div>
      <div class="legend-section">
        <h3>K-factor</h3>
        <p>Controls how much each game moves a rating. Higher K = faster convergence but more volatility.</p>
        <table>
          <tr><th>K</th><th>Behaviour</th></tr>
          <tr><td class="num">16</td><td>Slow, stable — suits sparse activity</td></tr>
          <tr><td class="num">32</td><td>Default — balanced for moderate volume</td></tr>
          <tr><td class="num">48</td><td>Fast — amplifies hot/cold streaks</td></tr>
        </table>
      </div>
      <div class="legend-section">
        <h3>Misranked rows (standings)</h3>
        <p>Rows highlighted in amber are players whose rating rank differs from their true skill rank by 3 or more positions. These are the ladder's visible errors.</p>
      </div>
    </div>
  </details>
</aside>

<main>
  <section>
    <h2>History — Spearman over time</h2>
    <div id="vis" style="min-height:240px"></div>
  </section>

  <section id="cards-section">
    <h2>Last run metrics</h2>
    <div class="cards" id="cards"></div>
  </section>

  <section id="standings-section">
    <h2>Standings <span id="standings-meta" style="font-size:0.72rem;color:#484f58;font-weight:400;text-transform:none;letter-spacing:0"></span></h2>
    <div class="tbl-wrap">
      <table id="standings-table">
        <thead><tr>
          <th>Rank</th><th>Skill rank</th><th>Δ</th>
          <th>Player</th>
          <th class="num">Rating</th><th class="num">Latent skill</th>
          <th class="num">Games</th><th>W-L-D</th>
        </tr></thead>
        <tbody id="standings-body"></tbody>
      </table>
    </div>
  </section>

  <section id="shadow-section">
    <h2>Shadow policy comparison</h2>
    <div class="tbl-wrap">
      <table id="shadow-table">
        <thead><tr>
          <th>Policy</th><th class="num">K</th>
          <th class="num">Spearman</th><th class="num">Top-N overlap</th>
          <th class="num">Avg volatility</th><th>Top player</th>
        </tr></thead>
        <tbody id="shadow-body"></tbody>
      </table>
    </div>
  </section>
</main>

<script>
  const PORT = ${port};

  // ---- History chart --------------------------------------------------------

  function buildSpec(rows, chartWidth) {
    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      data: { values: rows },
      width: chartWidth,
      height: 220,
      mark: { type: 'line', point: { filled: true, size: 70 } },
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

  function visWidth() {
    const vis = document.getElementById('vis');
    const container = vis.closest('section') ?? vis.parentElement ?? vis;
    return Math.max(container.getBoundingClientRect().width - 32, 400);
  }

  async function loadChart() {
    const vis = document.getElementById('vis');
    if (typeof vegaEmbed === 'undefined') {
      vis.innerHTML = '<p style="padding:1rem;color:#d29922;font-size:0.8rem">Vega-Embed did not load from CDN. Check network or browser console.</p>';
      return;
    }
    const res = await fetch('/api/history');
    const rows = await res.json();
    if (!rows || rows.length === 0) {
      vis.innerHTML = '<p style="padding:1rem;color:#484f58;font-size:0.8rem">No history yet — run a simulation first.</p>';
      return;
    }
    const spec = buildSpec(rows, visWidth());
    if (vegaView) { vegaView.finalize(); vegaView = null; }
    const result = await vegaEmbed('#vis', spec, {
      theme: 'dark',
      actions: { export: true, source: false, editor: true, compiled: false },
    });
    vegaView = result.view;
  }

  window.addEventListener('resize', () => {
    if (vegaView) vegaView.width(visWidth()).run();
  });

  // ---- Artifact panels ------------------------------------------------------

  function spearmanClass(v) {
    return v >= 0.85 ? 'good' : v >= 0.72 ? 'warn' : 'bad';
  }

  function overlapClass(v) {
    return v >= 0.8 ? 'good' : v >= 0.5 ? 'warn' : 'bad';
  }

  function renderCards(artifact) {
    const m = artifact.metrics;
    const cards = [
      {
        val: m.ratingSkillSpearman.toFixed(4),
        name: 'Spearman',
        note: 'Rating-to-skill rank correlation',
        cls: spearmanClass(m.ratingSkillSpearman),
      },
      {
        val: m.topNOverlap.toFixed(4),
        name: 'Top-N overlap',
        note: 'Elite skill → elite rating precision',
        cls: overlapClass(m.topNOverlap),
      },
      {
        val: m.averageRecentVolatility.toFixed(1),
        name: 'Avg volatility',
        note: 'High = season too short to converge',
        cls: 'neutral',
      },
      {
        val: '+' + m.largestRatingGain + ' / ' + m.largestRatingLoss,
        name: 'Largest swing',
        note: 'Max gain / max loss this season',
        cls: 'neutral',
      },
    ];
    document.getElementById('cards').innerHTML = cards
      .map(c => '<div class="card ' + c.cls + '"><div class="val">' + c.val + '</div><div class="name">' + c.name + '</div><div class="note">' + c.note + '</div></div>')
      .join('');
    document.getElementById('cards-section').style.display = 'block';
  }

  function renderStandings(artifact) {
    const rows = artifact.standings ?? [];
    const meta = 'seed=' + artifact.config.seed + '  players=' + artifact.config.players + '  matches=' + artifact.config.matches + '  K=' + artifact.config.kFactor;
    document.getElementById('standings-meta').textContent = meta;
    document.getElementById('standings-body').innerHTML = rows.slice(0, 12).map(p => {
      const delta = p.rank - p.skillRank;
      const misrank = Math.abs(delta) >= 3;
      const deltaStr = delta === 0 ? '—' : (delta > 0 ? '▼' + delta : '▲' + Math.abs(delta));
      return '<tr class="' + (misrank ? 'misrank' : '') + '">'
        + '<td class="num' + (p.rank <= 3 ? ' top' : '') + '">' + p.rank + '</td>'
        + '<td class="num">' + p.skillRank + '</td>'
        + '<td class="delta">' + deltaStr + '</td>'
        + '<td>' + p.name + '</td>'
        + '<td class="num">' + p.rating + '</td>'
        + '<td class="num">' + p.latentSkill + '</td>'
        + '<td class="num">' + p.games + '</td>'
        + '<td>' + p.wins + '-' + p.losses + '-' + p.draws + '</td>'
        + '</tr>';
    }).join('');
    document.getElementById('standings-section').style.display = 'block';
  }

  function renderShadow(artifact) {
    const policies = artifact.shadowPolicies ?? [];
    if (policies.length === 0) {
      document.getElementById('shadow-section').style.display = 'none';
      return;
    }
    const bestSpearman = Math.max(...policies.map(p => p.metrics.ratingSkillSpearman));
    document.getElementById('shadow-body').innerHTML = policies.map(p => {
      const isBest = p.metrics.ratingSkillSpearman === bestSpearman;
      return '<tr class="shadow-row' + (isBest ? ' best' : '') + '">'
        + '<td>' + p.label + '</td>'
        + '<td class="num">' + p.kFactor + '</td>'
        + '<td class="num sp">' + p.metrics.ratingSkillSpearman.toFixed(4) + '</td>'
        + '<td class="num">' + p.metrics.topNOverlap.toFixed(4) + '</td>'
        + '<td class="num">' + p.metrics.averageRecentVolatility.toFixed(1) + '</td>'
        + '<td>' + (p.topStanding?.name ?? '—') + '</td>'
        + '</tr>';
    }).join('');
    document.getElementById('shadow-section').style.display = 'block';
  }

  async function loadArtifact() {
    const res = await fetch('/api/artifact');
    if (!res.ok) return;
    const artifact = await res.json();
    if (!artifact?.metrics) return;
    renderCards(artifact);
    renderStandings(artifact);
    renderShadow(artifact);
  }

  // ---- Run simulation -------------------------------------------------------

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
        log.textContent = await res.text();
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
      await Promise.all([loadChart(), loadArtifact()]);
    } catch (err) {
      log.textContent += '\\nFailed: ' + String(err);
      setStatus('Error', 'error');
    } finally {
      btn.disabled = false;
      log.classList.remove('active');
    }
  });

  // ---- Initial load ---------------------------------------------------------

  Promise.all([
    loadChart().catch(() => {
      document.getElementById('log').textContent = 'No history yet. Run a simulation to start.';
    }),
    loadArtifact(),
  ]);
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// HTTP handlers
// ---------------------------------------------------------------------------

async function handleHistory(res: ServerResponse): Promise<void> {
  const raw = await readFile(HISTORY_JSON, 'utf8').catch(() => '[]');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(raw);
}

async function handleArtifact(res: ServerResponse): Promise<void> {
  const raw = await readFile(ARTIFACT_JSON, 'utf8').catch(() => 'null');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(raw);
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
  if (params.seeds?.trim()) args.push('--seeds', params.seeds.trim());
  else if (params.seed) args.push('--seed', params.seed);
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
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(buildUiHtml(DEFAULT_PORT));
    return;
  }
  if (method === 'GET' && url === '/api/history') {
    void handleHistory(res);
    return;
  }
  if (method === 'GET' && url === '/api/artifact') {
    void handleArtifact(res);
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
