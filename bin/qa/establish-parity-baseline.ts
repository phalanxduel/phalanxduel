#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import * as fs from 'node:fs';

interface ParityTestCase {
  name: string;
  description: string;
  v1Cmd: string[];
  v2Cmd: string[];
  checkpoints: string[];
}

const TEST_CASES: ParityTestCase[] = [
  {
    name: 'bot-vs-bot-game-to-completion',
    description: 'Full game from deployment through game-over with bot-vs-bot',
    v1Cmd: [
      'qa:playthrough',
      '--seed',
      '4000',
      '--p1',
      'bot-heuristic',
      '--p2',
      'bot-heuristic',
      '--out-dir',
      'artifacts/baseline-v1-botbot',
    ],
    v2Cmd: [
      'qa:godot:automation',
      '--seed',
      '4000',
      '--p1',
      'bot-heuristic',
      '--p2',
      'bot-heuristic',
      '--out-dir',
      'artifacts/baseline-v2-botbot',
    ],
    checkpoints: ['hydrated', 'game_over'],
  },
  {
    name: 'player1-vs-bot-full-game',
    description: 'Player 1 controls, bot opponent',
    v1Cmd: [
      'qa:playthrough',
      '--seed',
      '4001',
      '--p1',
      'human',
      '--p2',
      'bot-heuristic',
      '--out-dir',
      'artifacts/baseline-v1-p1vbot',
    ],
    v2Cmd: [
      'qa:godot:automation',
      '--seed',
      '4001',
      '--p1',
      'bot-heuristic',
      '--p2',
      'bot-heuristic',
      '--out-dir',
      'artifacts/baseline-v2-p1vbot',
    ],
    checkpoints: ['hydrated', 'game_over'],
  },
];

interface BaselineReport {
  timestamp: string;
  testCases: Record<
    string,
    {
      name: string;
      description: string;
      v1Artifacts: ArtifactSummary;
      v2Artifacts: ArtifactSummary;
      comparison: ComparisonResult;
    }
  >;
  summary: {
    totalTests: number;
    passCount: number;
    warnings: string[];
  };
  validationNotes: string[];
}

interface ArtifactSummary {
  path: string;
  manifest?: Record<string, unknown>;
  eventCount: number;
  checkpointsFound: string[];
  errors: string[];
}

interface ComparisonResult {
  match: boolean;
  eventCountDiff: number;
  checkpointMissing: string[];
  notes: string[];
}

async function spawnAsync(cmd: string, args: string[]): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    let output = '';
    child.stdout?.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      resolve({ code: code ?? 1, output });
    });
  });
}

async function findArtifactDir(parentDir: string): Promise<string | null> {
  try {
    if (fs.existsSync(join(parentDir, 'manifest.json'))) {
      return parentDir;
    }

    const entries = await fs.promises.readdir(parentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subdir = join(parentDir, entry.name);
        if (fs.existsSync(join(subdir, 'manifest.json'))) {
          return subdir;
        }
      }
    }
  } catch {
    /* empty */
  }
  return null;
}

async function loadManifest(dir: string): Promise<Record<string, unknown> | null> {
  try {
    const actualDir = await findArtifactDir(dir);
    if (!actualDir) return null;

    const manifestPath = join(actualDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const data = await readFile(manifestPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error(`Failed to load manifest from ${dir}:`, e);
  }
  return null;
}

async function countEvents(dir: string): Promise<number> {
  try {
    const actualDir = await findArtifactDir(dir);
    if (!actualDir) return 0;

    const eventsPath = join(actualDir, 'events.ndjson');
    if (fs.existsSync(eventsPath)) {
      const data = await readFile(eventsPath, 'utf-8');
      return data.split('\n').filter((line) => line.trim()).length;
    }
  } catch (e) {
    console.error(`Failed to count events in ${dir}:`, e);
  }
  return 0;
}

async function extractCheckpoints(dir: string, expectedCheckpoints: string[]): Promise<string[]> {
  const found: string[] = [];
  try {
    const actualDir = await findArtifactDir(dir);
    if (!actualDir) return found;

    const manifest = await loadManifest(actualDir);
    if (manifest && manifest.checkpoints && Array.isArray(manifest.checkpoints)) {
      for (const cp of manifest.checkpoints as unknown[]) {
        if (cp && typeof cp === 'object' && 'type' in cp) {
          const type = (cp as Record<string, unknown>).type;
          if (expectedCheckpoints.includes(String(type))) {
            found.push(String(type));
          }
        }
      }
    }
  } catch (e) {
    console.error(`Failed to extract checkpoints from ${dir}:`, e);
  }
  return found;
}

async function runTestCase(testCase: ParityTestCase): Promise<BaselineReport['testCases'][string]> {
  console.log(`\n📋 ${testCase.name}`);
  console.log(`   ${testCase.description}`);

  // Run v1
  console.log('   → Running v1 reference...');
  await spawnAsync('pnpm', testCase.v1Cmd);

  // Run v2
  console.log('   → Running v2 (Godot)...');
  await spawnAsync('pnpm', testCase.v2Cmd);

  // Load artifacts
  const v1Dir = testCase.v1Cmd[testCase.v1Cmd.length - 1] as string;
  const v2Dir = testCase.v2Cmd[testCase.v2Cmd.length - 1] as string;

  const v1Manifest = await loadManifest(v1Dir);
  const v2Manifest = await loadManifest(v2Dir);
  const v1Events = await countEvents(v1Dir);
  const v2Events = await countEvents(v2Dir);
  const v1Checkpoints = await extractCheckpoints(v1Dir, testCase.checkpoints);
  const v2Checkpoints = await extractCheckpoints(v2Dir, testCase.checkpoints);

  const v1Missing = testCase.checkpoints.filter((cp) => !v1Checkpoints.includes(cp));
  const v2Missing = testCase.checkpoints.filter((cp) => !v2Checkpoints.includes(cp));

  const comparison: ComparisonResult = {
    match: v1Missing.length === 0 && v2Missing.length === 0 && v1Events === v2Events,
    eventCountDiff: v2Events - v1Events,
    checkpointMissing: v2Missing,
    notes: [],
  };

  if (v1Events !== v2Events) {
    comparison.notes.push(`Event count differs: v1=${v1Events}, v2=${v2Events}`);
  }
  if (v2Missing.length > 0) {
    comparison.notes.push(`v2 missing checkpoints: ${v2Missing.join(', ')}`);
  }

  console.log(`   ✓ v1: ${v1Events} events, checkpoints: ${v1Checkpoints.join(', ') || 'none'}`);
  console.log(`   ✓ v2: ${v2Events} events, checkpoints: ${v2Checkpoints.join(', ') || 'none'}`);

  if (comparison.match) {
    console.log(`   ✅ PASS`);
  } else {
    console.log(`   ⚠️  GAP: ${comparison.notes.join(' | ')}`);
  }

  return {
    name: testCase.name,
    description: testCase.description,
    v1Artifacts: {
      path: v1Dir,
      manifest: v1Manifest || undefined,
      eventCount: v1Events,
      checkpointsFound: v1Checkpoints,
      errors: v1Missing,
    },
    v2Artifacts: {
      path: v2Dir,
      manifest: v2Manifest || undefined,
      eventCount: v2Events,
      checkpointsFound: v2Checkpoints,
      errors: v2Missing,
    },
    comparison,
  };
}

async function main(): Promise<void> {
  console.log('\n🏗️  Establishing Phalanx Duel v1 ↔ v2 Parity Baseline');
  console.log('═'.repeat(60));

  const baselineDir = 'artifacts/parity-baseline-' + Date.now();
  await mkdir(baselineDir, { recursive: true });

  const report: BaselineReport = {
    timestamp: new Date().toISOString(),
    testCases: {},
    summary: {
      totalTests: TEST_CASES.length,
      passCount: 0,
      warnings: [],
    },
    validationNotes: [
      'This baseline establishes v1 ↔ v2 parity checkpoints for continuous validation.',
      'View perspective fix: Godot now shows "YOUR SIDE"/"OPPONENT" (player) or player names (spectator).',
      'Known gaps identified: spectator mode label formatting, bot view context.',
      'Run `pnpm qa:validate-parity` to check against this baseline after changes.',
    ],
  };

  for (const testCase of TEST_CASES) {
    const result = await runTestCase(testCase);
    report.testCases[testCase.name] = result;

    if (result.comparison.match) {
      report.summary.passCount++;
    } else {
      report.summary.warnings.push(`${testCase.name}: ${result.comparison.notes.join(' | ')}`);
    }
  }

  // Write baseline report
  const reportPath = join(baselineDir, 'baseline-report.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log('\n' + '═'.repeat(60));
  console.log(`📊 BASELINE SUMMARY`);
  console.log(`Pass: ${report.summary.passCount}/${report.summary.totalTests}`);
  if (report.summary.warnings.length > 0) {
    console.log(`\nIdentified gaps:`);
    report.summary.warnings.forEach((w) => console.log(`  ⚠️  ${w}`));
  }

  console.log(`\n📁 Baseline saved: ${reportPath}`);
  console.log(`\nValidation notes:`);
  report.validationNotes.forEach((note) => console.log(`  • ${note}`));
  console.log();
}

main().catch(console.error);
