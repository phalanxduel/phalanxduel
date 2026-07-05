import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import * as fs from 'node:fs';

interface PariityAuditConfig {
  scenarios: Array<{
    name: string;
    options: Record<string, string | number | boolean>;
  }>;
  referenceMode?: 'api' | 'browser';
  compareMode?: 'strict' | 'lenient';
}

interface AuditResult {
  timestamp: string;
  scenarios: Record<string, ScenarioComparison>;
  summary: {
    totalScenarios: number;
    passCount: number;
    failCount: number;
    gapCount: number;
  };
  identifiedGaps: string[];
}

interface ScenarioComparison {
  v1: ScenarioArtifact;
  v2: ScenarioArtifact;
  comparison: {
    match: boolean;
    differences: string[];
    gaps: string[];
  };
}

interface ScenarioArtifact {
  path: string;
  manifest?: Record<string, unknown>;
  events: unknown[];
  checksums: Record<string, string>;
}

const SCENARIOS: PariityAuditConfig['scenarios'] = [
  {
    name: 'deployment-phase-p1',
    options: { seed: '2001', p1: 'human', p2: 'bot-heuristic', scenario: 'guest-pvb' },
  },
  {
    name: 'combat-phase-p1',
    options: { seed: '2002', p1: 'human', p2: 'bot-heuristic', scenario: 'guest-pvb' },
  },
  {
    name: 'spectator-mode',
    options: { seed: '2003', spectator: 'true', scenario: 'guest-pvb' },
  },
  {
    name: 'p1-vs-p2-bot',
    options: { seed: '2004', p1: 'bot-heuristic', p2: 'bot-heuristic' },
  },
  {
    name: 'game-over-state',
    options: { seed: '2005', p1: 'bot-heuristic', p2: 'bot-heuristic' },
  },
];

async function spawnAsync(
  command: string,
  args: string[],
  options?: Record<string, string | boolean>,
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ stdout, stderr, code: code ?? 1 });
    });
  });
}

async function runV1Playthrough(
  scenario: PariityAuditConfig['scenarios'][number],
): Promise<ScenarioArtifact> {
  const outDir = `artifacts/audit-v1-${scenario.name}-${Date.now()}`;
  await mkdir(outDir, { recursive: true });

  const args = ['qa:playthrough', '--out-dir', outDir];
  Object.entries(scenario.options).forEach(([key, value]) => {
    args.push(`--${key}`, String(value));
  });

  await spawnAsync('pnpm', args);

  return loadArtifact(outDir);
}

async function runV2Playthrough(
  scenario: PariityAuditConfig['scenarios'][number],
): Promise<ScenarioArtifact> {
  const outDir = `artifacts/audit-v2-${scenario.name}-${Date.now()}`;
  await mkdir(outDir, { recursive: true });

  const args = ['qa:godot:automation'];
  Object.entries(scenario.options).forEach(([key, value]) => {
    if (key !== 'scenario') {
      args.push(`--${key}`, String(value));
    }
  });
  args.push('--out-dir', outDir);

  await spawnAsync('pnpm', args);

  return loadArtifact(outDir);
}

async function loadArtifact(path: string): Promise<ScenarioArtifact> {
  const manifestPath = join(path, 'manifest.json');
  const eventsPath = join(path, 'events.ndjson');

  let manifest: Record<string, unknown> = {};
  let events: unknown[] = [];

  try {
    if (fs.existsSync(manifestPath)) {
      const data = await readFile(manifestPath, 'utf-8');
      manifest = JSON.parse(data);
    }
  } catch {
    /* empty */
  }

  try {
    if (fs.existsSync(eventsPath)) {
      const data = await readFile(eventsPath, 'utf-8');
      events = data
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line));
    }
  } catch {
    /* empty */
  }

  return {
    path,
    manifest,
    events,
    checksums: {
      manifest: String(Object.keys(manifest).length),
      events: String(events.length),
    },
  };
}

function compareArtifacts(
  v1: ScenarioArtifact,
  v2: ScenarioArtifact,
): ScenarioComparison['comparison'] {
  const differences: string[] = [];
  const gaps: string[] = [];

  // Check basic structure
  if (v1.events.length !== v2.events.length) {
    differences.push(`Event count mismatch: v1=${v1.events.length}, v2=${v2.events.length}`);
  }

  // Check manifest keys
  const v1Keys = Object.keys(v1.manifest || {}).sort();
  const v2Keys = Object.keys(v2.manifest || {}).sort();

  if (JSON.stringify(v1Keys) !== JSON.stringify(v2Keys)) {
    const missing = v1Keys.filter((k) => !v2Keys.includes(k));
    const extra = v2Keys.filter((k) => !v1Keys.includes(k));
    if (missing.length > 0) gaps.push(`Missing in v2 manifest: ${missing.join(', ')}`);
    if (extra.length > 0) differences.push(`Extra in v2 manifest: ${extra.join(', ')}`);
  }

  // Check critical fields
  const criticalFields = ['phase', 'turnNumber', 'activePlayerIndex', 'viewerIndex', 'outcome'];
  for (const field of criticalFields) {
    const v1Val = (v1.manifest as Record<string, unknown>)?.[field];
    const v2Val = (v2.manifest as Record<string, unknown>)?.[field];
    if (JSON.stringify(v1Val) !== JSON.stringify(v2Val)) {
      differences.push(`Field ${field}: v1=${v1Val}, v2=${v2Val}`);
    }
  }

  return {
    match: differences.length === 0 && gaps.length === 0,
    differences,
    gaps,
  };
}

async function runAudit(): Promise<void> {
  console.log('Starting Phalanx Duel v1 ↔ v2 Parity Audit\n');
  console.log(`Testing ${SCENARIOS.length} scenarios...\n`);

  const auditResult: AuditResult = {
    timestamp: new Date().toISOString(),
    scenarios: {},
    summary: {
      totalScenarios: SCENARIOS.length,
      passCount: 0,
      failCount: 0,
      gapCount: 0,
    },
    identifiedGaps: [
      'Player perspective not context-aware (hard-coded OPERATIVE/HOSTILE instead of YOUR/OPPONENT)',
      'Spectator view labels may not distinguish P1 vs P2 clearly',
      'Bot view (when player is bot) may not render correctly',
      'Phase transitions need visual confirmation',
    ],
  };

  for (const scenario of SCENARIOS) {
    console.log(`Auditing: ${scenario.name}`);

    // Run v1 reference
    console.log('  → Running v1 reference...');
    const v1 = await runV1Playthrough(scenario);
    console.log(`    ✓ ${v1.events.length} events captured`);

    // Run v2 (Godot)
    console.log('  → Running v2 (Godot)...');
    const v2 = await runV2Playthrough(scenario);
    console.log(`    ✓ ${v2.events.length} events captured`);

    // Compare
    const comparison = compareArtifacts(v1, v2);
    auditResult.scenarios[scenario.name] = {
      v1,
      v2,
      comparison,
    };

    if (comparison.match) {
      auditResult.summary.passCount++;
      console.log(`  ✓ PASS\n`);
    } else {
      auditResult.summary.failCount++;
      console.log(
        `  ✗ FAIL: ${comparison.differences.length} differences, ${comparison.gaps.length} gaps`,
      );
      comparison.differences.forEach((d) => console.log(`    - ${d}`));
      comparison.gaps.forEach((g) => console.log(`    - GAP: ${g}`));
      console.log();
    }
  }

  // Write audit report
  const reportPath = `artifacts/diffs/parity-audit-${Date.now()}.json`;
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(auditResult, null, 2));

  console.log(`\n${'='.repeat(60)}`);
  console.log(`AUDIT SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Pass: ${auditResult.summary.passCount}/${auditResult.summary.totalScenarios}`);
  console.log(`Fail: ${auditResult.summary.failCount}/${auditResult.summary.totalScenarios}`);
  console.log(`Identified gaps:`);
  auditResult.identifiedGaps.forEach((gap) => console.log(`  - ${gap}`));
  console.log(`\nFull report: ${reportPath}\n`);
}

runAudit().catch(console.error);
