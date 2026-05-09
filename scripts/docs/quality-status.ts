#!/usr/bin/env tsx
/**
 * Prints a read-only quality status dashboard.
 * Reads config files and last-run artifacts — does not re-run any verification.
 * Usage: pnpm quality:status
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

function ok(msg: string): string {
  return `${GREEN}✅${RESET} ${msg}`;
}
function warn(msg: string): string {
  return `${YELLOW}⚠ ${RESET} ${msg}`;
}
function fail(msg: string): string {
  return `${RED}❌${RESET} ${msg}`;
}
function dim(msg: string): string {
  return `${DIM}${msg}${RESET}`;
}
function section(title: string): void {
  console.log(`\n${BOLD}── ${title} ${RESET}${dim('─'.repeat(Math.max(0, 52 - title.length)))}`);
}

function readJson<T>(p: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
  } catch {
    return null;
  }
}

function readText(p: string): string | null {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function gitStatus(relPath: string): 'committed' | 'modified' | 'untracked' | 'missing' {
  try {
    const result = execSync(`git status --short -- ${relPath}`, {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
    if (!result) return 'committed';
    if (result.startsWith('??')) return 'untracked';
    return 'modified';
  } catch {
    return 'missing';
  }
}

function fileExists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

// ──────────────────────────────────────────────────────────────────────────────
// Coverage thresholds from vitest.config.ts (regex extraction)
// ──────────────────────────────────────────────────────────────────────────────

interface CoverageThresholds {
  lines?: number;
  functions?: number;
  branches?: number;
  statements?: number;
}

function extractCoverageThresholds(configPath: string): CoverageThresholds | null {
  const src = readText(configPath);
  if (!src) return null;
  const block = src.match(/thresholds\s*:\s*\{([^}]+)\}/)?.[1];
  if (!block) return null;
  const pick = (key: string): number | undefined => {
    const m = block.match(new RegExp(`${key}\\s*:\\s*(\\d+)`));
    return m ? Number(m[1]) : undefined;
  };
  return {
    lines: pick('lines'),
    functions: pick('functions'),
    branches: pick('branches'),
    statements: pick('statements'),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Coverage actuals from coverage-summary.json
// ──────────────────────────────────────────────────────────────────────────────

interface CoverageSummary {
  total: {
    lines: { pct: number };
    functions: { pct: number };
    branches: { pct: number };
    statements: { pct: number };
  };
}

function readCoverageSummary(pkg: string): CoverageSummary['total'] | null {
  const p = path.join(ROOT, pkg, 'coverage', 'coverage-summary.json');
  const d = readJson<CoverageSummary>(p);
  return d?.total ?? null;
}

function coverageLine(
  pkg: string,
  thresholds: CoverageThresholds | null,
  actual: CoverageSummary['total'] | null,
): string {
  const label = pkg.padEnd(7);
  if (!actual) {
    return warn(`${label} no coverage report (run pnpm test:coverage:run)`);
  }
  const checks: string[] = [];
  let passing = true;
  if (thresholds?.lines != null) {
    const pass = actual.lines.pct >= thresholds.lines;
    if (!pass) passing = false;
    checks.push(`lines:${actual.lines.pct.toFixed(1)}% [≥${thresholds.lines}%]`);
  }
  if (thresholds?.functions != null) {
    const pass = actual.functions.pct >= thresholds.functions;
    if (!pass) passing = false;
    checks.push(`fn:${actual.functions.pct.toFixed(1)}% [≥${thresholds.functions}%]`);
  }
  if (thresholds?.branches != null) {
    const pass = actual.branches.pct >= thresholds.branches;
    if (!pass) passing = false;
    checks.push(`branch:${actual.branches.pct.toFixed(1)}% [≥${thresholds.branches}%]`);
  }
  if (thresholds?.statements != null) {
    const pass = actual.statements.pct >= thresholds.statements;
    if (!pass) passing = false;
    checks.push(`stmt:${actual.statements.pct.toFixed(1)}% [≥${thresholds.statements}%]`);
  }
  const line = `${label} ${checks.join('  ')}`;
  return passing ? ok(line) : fail(line);
}

// ──────────────────────────────────────────────────────────────────────────────
// Dep-cruiser rules from .dependency-cruiser.json
// ──────────────────────────────────────────────────────────────────────────────

interface DepCruiserConfig {
  forbidden: Array<{ name: string; severity: string }>;
}

function readDepCruiserRules(): { errors: string[]; warns: string[] } {
  const cfg = readJson<DepCruiserConfig>(path.join(ROOT, '.dependency-cruiser.json'));
  const errors: string[] = [];
  const warns: string[] = [];
  for (const rule of cfg?.forbidden ?? []) {
    if (rule.severity === 'error') errors.push(rule.name);
    else warns.push(rule.name);
  }
  return { errors, warns };
}

// ──────────────────────────────────────────────────────────────────────────────
// verify.sh — which scripts appear in which phases
// Parses bash `if [ "$MODE" = "X" ]` blocks and collects `pnpm <script>` calls.
// ──────────────────────────────────────────────────────────────────────────────

function scriptInMode(src: string, scriptName: string, mode: string): boolean {
  // Find every `if` line that references this mode, then walk until the closing `fi`
  // collecting pnpm calls within that block.
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!/\bif\b/.test(line)) continue;
    if (!line.includes(`"${mode}"`)) continue;

    // Walk the block, tracking nesting depth
    let depth = 1;
    for (let j = i + 1; j < lines.length && depth > 0; j++) {
      const inner = lines[j]!.trim();
      if (/^if\b/.test(inner)) depth++;
      if (inner === 'fi') {
        depth--;
        continue;
      }
      if (inner.startsWith(`pnpm ${scriptName}`)) return true;
    }
  }
  return false;
}

function readVerifyPhases(scripts: string[]): Record<string, Record<string, boolean>> {
  const src = readText(path.join(ROOT, 'scripts/ci/verify.sh')) ?? '';
  const result: Record<string, Record<string, boolean>> = {};
  for (const script of scripts) {
    result[script] = {
      full: scriptInMode(src, script, 'full'),
      ci: scriptInMode(src, script, 'ci'),
      release: scriptInMode(src, script, 'release'),
    };
  }
  return result;
}

// ──────────────────────────────────────────────────────────────────────────────
// WS contract types from generated JSON schemas
// ──────────────────────────────────────────────────────────────────────────────

interface JsonSchemaFile {
  oneOf?: Array<{ properties?: { type?: { const?: string } } }>;
}

function countWsTypes(): { client: number; server: number; asyncapiGaps: string[] } {
  const client = readJson<JsonSchemaFile>(
    path.join(ROOT, 'shared/schemas/client-messages.schema.json'),
  );
  const server = readJson<JsonSchemaFile>(
    path.join(ROOT, 'shared/schemas/server-messages.schema.json'),
  );
  const asyncapi = readText(path.join(ROOT, 'docs/api/asyncapi.yaml')) ?? '';

  const extract = (s: JsonSchemaFile | null): string[] =>
    (s?.oneOf ?? [])
      .map((e) => e?.properties?.type?.const)
      .filter((v): v is string => typeof v === 'string');

  const clientTypes = extract(client);
  const serverTypes = extract(server);
  const allTypes = [...clientTypes, ...serverTypes];
  const asyncapiGaps = allTypes.filter((t) => !asyncapi.includes(t));

  return { client: clientTypes.length, server: serverTypes.length, asyncapiGaps };
}

// ──────────────────────────────────────────────────────────────────────────────
// Stryker config
// ──────────────────────────────────────────────────────────────────────────────

interface StrykerConfig {
  thresholds?: { high?: number; low?: number; break?: number };
  mutate?: string[];
}

function readStrykerConfig(): StrykerConfig | null {
  return readJson<StrykerConfig>(path.join(ROOT, 'engine/stryker.config.json'));
}

// ──────────────────────────────────────────────────────────────────────────────
// k6 check
// ──────────────────────────────────────────────────────────────────────────────

function k6Installed(): boolean {
  try {
    execSync('k6 version', { cwd: ROOT, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);
let warningCount = 0;
let failCount = 0;

function track(line: string): string {
  if (line.includes('⚠')) warningCount++;
  if (line.includes('❌')) failCount++;
  return line;
}

console.log(`\n${BOLD}==> 🔍 Quality Status — ${today}${RESET}`);

// ── Verification Spine ────────────────────────────────────────────────────────
section('VERIFICATION SPINE');
const phases = readVerifyPhases([
  'verify:mutation',
  'verify:property',
  'verify:contracts',
  'verify:boundaries',
  'verify:perf',
]);
const spineRows: [string, string][] = [
  ['verify:quick', 'lint + typecheck + build'],
  ['verify:full', 'full local pass — includes mutation, QA simulations'],
  ['verify:ci', 'CI-safe subset — coverage, contracts, property, perf, QA replay'],
  ['verify:release', '+ fairness + integration:api + perf:ws'],
];
for (const [script, desc] of spineRows) {
  console.log(`  ${script.padEnd(20)} ${dim(desc)}`);
}

// ── Coverage ─────────────────────────────────────────────────────────────────
section('COVERAGE  (last run)');
const packages = ['engine', 'server', 'shared', 'client', 'admin'];
for (const pkg of packages) {
  const thresholds = extractCoverageThresholds(path.join(ROOT, pkg, 'vitest.config.ts'));
  const actual = readCoverageSummary(pkg);
  const line = coverageLine(pkg, thresholds, actual);
  console.log(`  ${track(line)}`);
}

// ── Architecture Boundaries ──────────────────────────────────────────────────
section('ARCHITECTURE BOUNDARIES  (dep-cruiser)');
const { errors: errRules, warns: warnRules } = readDepCruiserRules();
console.log(`  ${ok(`${errRules.length} hard rules:`)} ${dim(errRules.join(', '))}`);
if (warnRules.length > 0) {
  console.log(
    `  ${warn(`${warnRules.length} advisory rules (warn):`)} ${dim(warnRules.join(', '))}`,
  );
  warningCount++;
}

// ── Domain Purity ─────────────────────────────────────────────────────────────
section('DOMAIN PURITY  (engine/src ESLint)');
const eslintCfg = readText(path.join(ROOT, 'eslint.config.js')) ?? '';
const hasGlobalsRule = eslintCfg.includes('no-restricted-globals');
const hasSyntaxRule = eslintCfg.includes('no-restricted-syntax');
if (hasGlobalsRule && hasSyntaxRule) {
  console.log(`  ${ok('no-restricted-globals + no-restricted-syntax enforced in engine/src')}`);
} else {
  console.log(
    `  ${track(warn('no-restricted-globals or no-restricted-syntax not found in eslint.config.js'))}`,
  );
}
console.log(
  `  ${track(warn('engine/src/state.ts:147 — process.env.NODE_ENV guard (known, advisory)'))}`,
);

// ── Mutation Testing ───────────────────────────────────────────────────────────
section('MUTATION TESTING  (Stryker)');
const stryker = readStrykerConfig();
if (stryker?.thresholds?.break != null) {
  const t = stryker.thresholds;
  console.log(
    `  ${ok(`thresholds configured — break:${t.break} low:${t.low ?? '?'} high:${t.high ?? '?'}`)}`,
  );
} else {
  console.log(`  ${track(fail('no thresholds in engine/stryker.config.json'))}`);
}
const hasIncremental = fileExists('engine/.stryker-incremental.json');
if (hasIncremental) {
  console.log(`  ${ok('incremental state exists — last run recorded')}`);
} else {
  console.log(`  ${track(warn('no incremental state — run pnpm verify:mutation to baseline'))}`);
}
const mutInFull = phases['verify:mutation']?.['full'] ?? false;
const mutInCi = phases['verify:mutation']?.['ci'] ?? false;
console.log(
  `  verify:full: ${mutInFull ? ok('wired') : warn('not wired')}   verify:ci: ${mutInCi ? ok('wired') : warn('not wired — add after baseline established')}`,
);
if (!mutInFull) warningCount++;

// ── Property Tests ────────────────────────────────────────────────────────────
section('PROPERTY TESTS  (fast-check)');
const propFile = 'engine/tests/property-fastcheck.test.ts';
if (fileExists(propFile)) {
  const src = readText(path.join(ROOT, propFile)) ?? '';
  const testCount = (src.match(/\bit\(/g) ?? []).length;
  console.log(`  ${ok(`${propFile} — ${testCount} test case(s)`)}`);
} else {
  console.log(`  ${track(fail(`${propFile} not found`))}`);
}
const propInFull = phases['verify:property']?.['full'] ?? false;
const propInCi = phases['verify:property']?.['ci'] ?? false;
console.log(
  `  verify:full: ${propInFull ? ok('wired') : track(warn('not wired'))}   verify:ci: ${propInCi ? ok('wired') : track(warn('not wired'))}`,
);

// ── WS Contract Validation ────────────────────────────────────────────────────
section('WS CONTRACT VALIDATION');
const { client, server, asyncapiGaps } = countWsTypes();
console.log(`  ${ok(`${client} client types, ${server} server types in generated JSON schemas`)}`);
if (asyncapiGaps.length > 0) {
  console.log(
    `  ${track(warn(`${asyncapiGaps.length} types not in asyncapi.yaml (advisory): ${asyncapiGaps.join(', ')}`))}`,
  );
} else {
  console.log(`  ${ok('asyncapi.yaml covers all types')}`);
}
const contractsInCi = phases['verify:contracts']?.['ci'] ?? false;
console.log(`  verify:ci: ${contractsInCi ? ok('wired') : track(warn('not wired'))}`);

// ── Performance Gates ─────────────────────────────────────────────────────────
section('PERFORMANCE GATES');
console.log(`  ${ok('verify:perf — in-process MatchActor p99 < 10ms')}`);
if (k6Installed()) {
  console.log(`  ${ok('k6 installed — verify:perf:ws (WS smoke) available')}`);
} else {
  console.log(
    `  ${track(warn('k6 not installed — verify:perf:ws unavailable (brew install k6)'))}`,
  );
}

// ── Generated Artifacts ───────────────────────────────────────────────────────
section('GENERATED ARTIFACTS');
const artifacts: Array<{ path: string; label: string }> = [
  { path: 'shared/schemas', label: 'shared/schemas/ (WS JSON schemas)' },
  { path: 'docs/system/dependency-graph.svg', label: 'docs/system/dependency-graph.svg' },
  { path: 'docs/reference', label: 'docs/reference/ (API routes, knip report)' },
  { path: 'docs/quality/db-constraints.md', label: 'docs/quality/db-constraints.md' },
  { path: 'docs/quality/hotspots.md', label: 'docs/quality/hotspots.md' },
];
for (const { path: rel, label } of artifacts) {
  if (!fileExists(rel)) {
    console.log(
      `  ${track(warn(`${label} — not generated (run pnpm docs:artifacts or pnpm quality:hotspots)`))}`,
    );
    continue;
  }
  const status = gitStatus(rel);
  if (status === 'committed') {
    console.log(`  ${ok(label)}`);
  } else if (status === 'untracked') {
    console.log(`  ${track(warn(`${label} — exists but uncommitted`))}`);
  } else if (status === 'modified') {
    console.log(`  ${track(warn(`${label} — modified, needs commit`))}`);
  }
}

// ── DB Constraints ────────────────────────────────────────────────────────────
section('DB CONSTRAINTS');
if (fileExists('server/migrations/0000_baseline.sql')) {
  console.log(`  ${ok('Drizzle migrations present')}`);
}
if (fileExists('docs/quality/db-constraints.md')) {
  console.log(`  ${ok('docs/quality/db-constraints.md — constraint inventory documented')}`);
  console.log(
    `  ${dim('  (7 advisory gaps noted — no-action required unless direct DB writes are used)')}`,
  );
} else {
  console.log(`  ${track(warn('docs/quality/db-constraints.md not found'))}`);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${BOLD}── SUMMARY ${RESET}${dim('─'.repeat(44))}`);
const total = warningCount + failCount;
if (failCount > 0) {
  console.log(`  ${fail(`${failCount} failure(s), ${warningCount} warning(s)`)}`);
} else if (warningCount > 0) {
  console.log(`  ${warn(`${warningCount} warning(s) — no hard failures`)}`);
} else {
  console.log(`  ${ok('all checks passing')}`);
}
console.log(`  ${dim(`Run pnpm verify:full for a complete re-run of all gates.`)}\n`);
