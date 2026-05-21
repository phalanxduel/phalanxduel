#!/usr/bin/env tsx

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const DEFAULT_HISTORY_JSON = 'docs/quality/ladder-history.json';
const DEFAULT_OUT_DIR = 'artifacts/ladder';
const DEFAULT_VIEW_FILE = 'history-view.html';

interface HistoryRow {
  timestamp: string;
  sha: string;
  seed: number;
  players: number;
  matches: number;
  kFactor: number;
  label: string;
  spearman: number;
  topNOverlap: number;
}

function buildSpec(rows: HistoryRow[]): object {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: { values: rows },
    width: 'container',
    height: 350,
    mark: { type: 'line', point: { filled: true, size: 80 } },
    encoding: {
      x: {
        field: 'timestamp',
        type: 'temporal',
        title: 'Run date',
        axis: { format: '%Y-%m-%d', labelAngle: -30 },
      },
      y: {
        field: 'spearman',
        type: 'quantitative',
        title: 'Rating-to-skill Spearman',
        scale: { domain: [0, 1] },
      },
      color: { field: 'label', type: 'nominal', title: 'Policy' },
      tooltip: [
        { field: 'timestamp', type: 'temporal', title: 'Date', format: '%Y-%m-%d %H:%M' },
        { field: 'sha', type: 'nominal', title: 'Commit' },
        { field: 'label', type: 'nominal', title: 'Policy' },
        { field: 'kFactor', type: 'quantitative', title: 'K-factor' },
        { field: 'seed', type: 'quantitative', title: 'Seed' },
        { field: 'spearman', type: 'quantitative', title: 'Spearman', format: '.4f' },
        { field: 'topNOverlap', type: 'quantitative', title: 'Top-N overlap', format: '.4f' },
      ],
    },
  };
}

function renderHtml(rows: HistoryRow[], spec: object): string {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const runCount = new Set(rows.map((r) => r.timestamp)).size;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Ladder Simulation History</title>
  <script src="https://cdn.jsdelivr.net/npm/vega@5"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-lite@5"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-embed@6"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 2rem; background: #0d1117; color: #e6edf3; }
    h1 { font-size: 1.1rem; font-weight: 600; margin: 0 0 1.5rem; color: #f0f6fc; }
    #vis { width: 100%; }
    .meta { font-size: 0.78rem; color: #8b949e; margin-top: 1.25rem; }
    code { background: #161b22; padding: 0.1em 0.35em; border-radius: 3px; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Ladder Simulation History</h1>
  <div id="vis"></div>
  <p class="meta">
    Generated ${timestamp}
    &middot; ${rows.length} rows across ${runCount} run${runCount !== 1 ? 's' : ''}
    &middot; <code>pnpm qa:ladder:simulate -- --view</code> to add and refresh
  </p>
  <script>
    vegaEmbed('#vis', ${JSON.stringify(spec)}, {
      theme: 'dark',
      actions: { export: true, source: false, editor: true, compiled: false },
    }).catch(console.error);
  </script>
</body>
</html>
`;
}

function openBrowser(filePath: string): void {
  const absPath = filePath.startsWith('/') ? filePath : join(process.cwd(), filePath);
  const url = `file://${absPath}`;
  const cmd =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  try {
    execSync(cmd, { stdio: 'ignore' });
  } catch {
    console.log(`Open manually: ${url}`);
  }
}

export async function openHistoryView(
  historyJson: string = DEFAULT_HISTORY_JSON,
  outDir: string = DEFAULT_OUT_DIR,
  viewFile: string = DEFAULT_VIEW_FILE,
): Promise<string> {
  const raw = await readFile(historyJson, 'utf8').catch(() => '[]');
  const rows: HistoryRow[] = JSON.parse(raw) as HistoryRow[];
  const spec = buildSpec(rows);
  const html = renderHtml(rows, spec);
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, viewFile);
  await writeFile(outPath, html);
  openBrowser(outPath);
  return outPath;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((a) => a !== '--'),
    options: {
      'history-json': { type: 'string', default: DEFAULT_HISTORY_JSON },
      'out-dir': { type: 'string', default: DEFAULT_OUT_DIR },
      'view-file': { type: 'string', default: DEFAULT_VIEW_FILE },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help) {
    console.log(`Usage: tsx bin/qa/ladder-view.ts [OPTIONS]

Options:
  --history-json PATH   Source JSON array (default: ${DEFAULT_HISTORY_JSON})
  --out-dir PATH        Output directory for generated HTML (default: ${DEFAULT_OUT_DIR})
  --view-file NAME      HTML filename (default: ${DEFAULT_VIEW_FILE})
  --help                Show this help
`);
    return;
  }

  const outPath = await openHistoryView(
    values['history-json'] ?? DEFAULT_HISTORY_JSON,
    values['out-dir'] ?? DEFAULT_OUT_DIR,
    values['view-file'] ?? DEFAULT_VIEW_FILE,
  );
  console.log(`view=${outPath}`);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
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
}
