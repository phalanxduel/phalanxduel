#!/usr/bin/env tsx

import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { GameScenarioSchema, generateScenario, loadScenario } from './scenario';

type BotPlayer = 'bot-random' | 'bot-heuristic' | 'bot-mcts';
type DamageMode = 'classic' | 'cumulative';

interface GodotRunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

interface HarnessOutput {
  ok: boolean;
  errors?: string[];
  checkpoints?: { type?: string }[];
  scenario?: {
    id?: string;
    actionCount?: number;
    finalStateHash?: string;
  };
}

const { values } = parseArgs({
  options: {
    scenario: { type: 'string' },
    seed: { type: 'string', default: '1000' },
    'damage-mode': { type: 'string', default: 'classic' },
    'starting-lp': { type: 'string', default: '20' },
    p1: { type: 'string', default: 'bot-heuristic' },
    p2: { type: 'string', default: 'bot-heuristic' },
    'godot-bin': { type: 'string' },
    'out-dir': { type: 'string', default: 'artifacts/godot-automation' },
    'keep-temp': { type: 'boolean', default: false },
  },
});

function parseInteger(name: string, raw: string): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`--${name} must be an integer`);
  }
  return parsed;
}

function parseDamageMode(raw: string): DamageMode {
  if (raw === 'classic' || raw === 'cumulative') return raw;
  throw new Error('--damage-mode must be classic or cumulative');
}

function parseBotPlayer(name: string, raw: string): BotPlayer {
  if (raw === 'bot-random' || raw === 'bot-heuristic' || raw === 'bot-mcts') return raw;
  throw new Error(`--${name} must be bot-random, bot-heuristic, or bot-mcts`);
}

function runGodot(args: string[], homeDir: string, godotBin: string): Promise<GodotRunResult> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(godotBin, args, {
      env: { ...process.env, HOME: homeDir },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolveRun({ code, stdout, stderr });
    });
  });
}

async function readHarnessOutput(path: string): Promise<HarnessOutput> {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw) as HarnessOutput;
}

async function main(): Promise<void> {
  const projectDir = resolve('godot/client');
  const outDir = resolve(values['out-dir'] ?? 'artifacts/godot-automation');
  const runId = `godot-${Date.now()}`;
  const runDir = join(outDir, runId);
  const tempHome = await mkdtemp(join(tmpdir(), 'phx-godot-home-'));

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await mkdir(runDir, { recursive: true });

  const scenario = values.scenario
    ? await loadScenario(values.scenario)
    : GameScenarioSchema.parse(
        generateScenario(
          parseInteger('seed', values.seed ?? '1000'),
          parseDamageMode(values['damage-mode'] ?? 'classic'),
          parseInteger('starting-lp', values['starting-lp'] ?? '20'),
          parseBotPlayer('p1', values.p1 ?? 'bot-heuristic'),
          parseBotPlayer('p2', values.p2 ?? 'bot-heuristic'),
        ),
      );

  const inputPath = join(runDir, 'input.json');
  const outputPath = join(runDir, 'result.json');
  const logPath = join(runDir, 'godot.log');
  const harnessInput = {
    version: 1,
    source: values.scenario ? 'scenario-file' : 'generated-scenario',
    expectedCheckpoints: ['connected', 'hydrated', 'animation_idle'],
    scenario,
  };

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await writeFile(inputPath, JSON.stringify(harnessInput, null, 2));

  const godotBin = values['godot-bin'] ?? process.env.GODOT_BIN ?? 'godot';
  const godotArgs = [
    '--headless',
    '--path',
    projectDir,
    '--script',
    'res://scripts/AutomationHarness.gd',
    '--log-file',
    logPath,
    '--',
    '--input',
    inputPath,
    '--output',
    outputPath,
  ];

  try {
    const run = await runGodot(godotArgs, tempHome, godotBin);
    if (run.stdout.trim()) console.log(run.stdout.trim());
    if (run.stderr.trim()) console.error(run.stderr.trim());

    let harnessOutput: HarnessOutput | null = null;
    try {
      harnessOutput = await readHarnessOutput(outputPath);
    } catch (err) {
      console.error(`Unable to read Godot harness output at ${outputPath}`);
      if (err instanceof Error) console.error(err.message);
    }

    if (run.code !== 0 || harnessOutput?.ok !== true) {
      const errors = harnessOutput?.errors?.length ? `: ${harnessOutput.errors.join('; ')}` : '';
      console.error(`Godot automation failed${errors}`);
      process.exit(run.code && run.code !== 0 ? run.code : 1);
    }

    const checkpoints = harnessOutput.checkpoints?.map((checkpoint) => checkpoint.type).join(', ');
    console.log(
      `Godot automation passed: ${harnessOutput.scenario?.id ?? scenario.id} ` +
        `actions=${harnessOutput.scenario?.actionCount ?? scenario.actions.length} ` +
        `checkpoints=${checkpoints ?? 'none'}`,
    );
    console.log(`Artifacts: ${runDir}`);
  } finally {
    if (!values['keep-temp']) {
      await rm(tempHome, { recursive: true, force: true });
    } else {
      console.log(`Temporary Godot HOME retained: ${tempHome}`);
    }
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
