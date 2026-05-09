#!/usr/bin/env tsx
/**
 * Produces a ranked hotspot report: docs/quality/hotspots.md
 *
 * Score = churn(0.4) + size(0.3) + fan-in(0.3), each normalized 0–1 across all files.
 * Higher score = more attention warranted.
 *
 * Usage: pnpm quality:hotspots [--days <n>] [--top <n>]
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    days: { type: 'string', default: '90' },
    top: { type: 'string', default: '25' },
  },
  strict: false,
});

const LOOKBACK_DAYS = Number(values.days);
const TOP_N = Number(values.top);
const OUTPUT_PATH = path.join(ROOT, 'docs/quality/hotspots.md');

const SOURCE_DIRS = ['engine/src', 'server/src', 'client/src', 'shared/src', 'admin/src'];

// --- Step 1: git churn (commit count per file) ---

function getChurn(): Map<string, number> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const raw = execSync(
    `git log --since="${since}" --name-only --format="" -- ${SOURCE_DIRS.join(' ')}`,
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
  );
  const churn = new Map<string, number>();
  for (const line of raw.split('\n')) {
    const f = line.trim();
    if (f.endsWith('.ts') || f.endsWith('.tsx')) {
      churn.set(f, (churn.get(f) ?? 0) + 1);
    }
  }
  return churn;
}

// --- Step 2: file size (line count) ---

function getLineCounts(files: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    try {
      const content = fs.readFileSync(abs, 'utf8');
      counts.set(rel, content.split('\n').length);
    } catch {
      counts.set(rel, 0);
    }
  }
  return counts;
}

// --- Step 3: dep-cruiser fan-in (modules that import each file) ---

function getFanIn(files: Set<string>): Map<string, number> {
  const fanIn = new Map<string, number>();
  let cruiserOutput: { modules?: Array<{ source: string; dependents?: string[] }> };
  try {
    const raw = execSync(
      `npx --no-install depcruise --output-type json --config .dependency-cruiser.json ${SOURCE_DIRS.join(' ')}`,
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
    );
    cruiserOutput = JSON.parse(raw) as typeof cruiserOutput;
  } catch {
    return fanIn;
  }

  for (const mod of cruiserOutput.modules ?? []) {
    const rel = mod.source;
    if (files.has(rel)) {
      fanIn.set(rel, (mod.dependents ?? []).length);
    }
  }
  return fanIn;
}

// --- Step 4: normalize and score ---

function normalize(values: number[]): number[] {
  const max = Math.max(...values, 1);
  return values.map((v) => v / max);
}

interface HotspotEntry {
  file: string;
  score: number;
  churn: number;
  lines: number;
  fanIn: number;
}

function computeScores(
  files: string[],
  churnMap: Map<string, number>,
  lineMap: Map<string, number>,
  fanInMap: Map<string, number>,
): HotspotEntry[] {
  const churns = files.map((f) => churnMap.get(f) ?? 0);
  const lines = files.map((f) => lineMap.get(f) ?? 0);
  const fanIns = files.map((f) => fanInMap.get(f) ?? 0);

  const normChurn = normalize(churns);
  const normLines = normalize(lines);
  const normFanIn = normalize(fanIns);

  return files.map((file, i) => ({
    file,
    score: (normChurn[i] ?? 0) * 0.4 + (normLines[i] ?? 0) * 0.3 + (normFanIn[i] ?? 0) * 0.3,
    churn: churns[i] ?? 0,
    lines: lines[i] ?? 0,
    fanIn: fanIns[i] ?? 0,
  }));
}

// --- Main ---

console.log(`==> 📊 Computing quality hotspots (last ${LOOKBACK_DAYS} days)...`);

const churnMap = getChurn();

// Collect all source files that appear in churn or exist on disk
const allFiles = new Set<string>([...churnMap.keys()]);
for (const dir of SOURCE_DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  const walk = (d: string): void => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        allFiles.add(path.relative(ROOT, full));
      }
    }
  };
  walk(abs);
}

const fileList = [...allFiles];
const lineMap = getLineCounts(fileList);
const fanInMap = getFanIn(allFiles);

const scored = computeScores(fileList, churnMap, lineMap, fanInMap)
  .sort((a, b) => b.score - a.score)
  .slice(0, TOP_N);

// --- Write report ---

const now = new Date().toISOString().slice(0, 10);
const rows = scored
  .map(
    (e, i) =>
      `| ${i + 1} | \`${e.file}\` | ${e.score.toFixed(3)} | ${e.churn} | ${e.lines} | ${e.fanIn} |`,
  )
  .join('\n');

const report = `# Quality Hotspots

Generated: ${now} — last ${LOOKBACK_DAYS} days of git history

Score = churn × 0.4 + lines × 0.3 + fan-in × 0.3 (each normalized 0–1).
This report is informational only and does not gate CI.

## Top ${TOP_N} Files

| Rank | File | Score | Commits | Lines | Fan-in |
|---|---|---|---|---|---|
${rows}

## How to use this report

High-score files benefit most from:
- additional unit tests targeting their branch coverage gaps
- property-based test coverage of their domain invariants
- complexity refactoring if ESLint max-complexity is near the cap
- reviewer attention on incoming PRs

Run \`pnpm quality:hotspots\` to refresh after merging a batch of PRs.
`;

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, report);
console.log(`✅ Report written to ${path.relative(ROOT, OUTPUT_PATH)}`);
console.log(
  `   Top file: ${scored[0]?.file ?? 'none'} (score ${scored[0]?.score.toFixed(3) ?? '0'})`,
);
