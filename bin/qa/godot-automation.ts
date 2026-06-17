#!/usr/bin/env tsx

import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createInitialState, applyAction } from '../../engine/src/index.ts';
import { computeStateHash } from '../../shared/src/hash.ts';
import { GameScenarioSchema, generateScenario, loadScenario, type GameScenario } from './scenario';

type BotPlayer = 'bot-random' | 'bot-heuristic' | 'bot-mcts';
type DamageMode = 'classic' | 'cumulative';
type ManifestStatus = 'success' | 'failure';
type FailureReason = 'runtime_error' | 'missing_artifact';

interface GodotRunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

interface HarnessOutput {
  ok: boolean;
  errors?: string[];
  checkpoints?: { type?: string; sequence?: number; metadata?: Record<string, unknown> }[];
  scenario?: {
    id?: string;
    seed?: number;
    damageMode?: string;
    startingLifepoints?: number;
    actionCount?: number;
    turnCount?: number;
    finalStateHash?: string;
  };
}

interface RunEvent {
  at: string;
  type: 'state' | 'checkpoint' | 'result' | 'error';
  detail: string;
  turn?: number;
  phase?: string;
  checkpoint?: string;
  outcomeText?: string | null;
  winnerName?: string;
  lifepointsText?: string;
}

interface ScenarioOutcome {
  outcomeText: string | null;
  winnerName?: string;
  victorySummaryText?: string;
  lifepointsText?: string;
  finalLifepoints?: Record<string, number>;
  turnCount: number;
  finalStateHash?: string;
}

interface GodotManifest {
  seed: number;
  startAt: string;
  endAt: string;
  durationMs: number;
  baseUrl: string;
  damageMode: DamageMode;
  startingLifepoints: number;
  status: ManifestStatus;
  failureReason?: FailureReason;
  failureMessage?: string;
  turnCount: number;
  actionCount: number;
  screenshotCount: number;
  screenshots: string[];
  outcomeText: string | null;
  winnerName?: string;
  victorySummaryText?: string;
  lifepointsText?: string;
  finalLifepoints?: Record<string, number>;
  screenshotMode: 'checkpoint';
  p1: BotPlayer;
  p2: BotPlayer;
  runId: string;
  scenarioId: string;
  scenarioPath?: string;
  finalStateHash?: string;
  client: 'godot';
  headed: false;
  checkpoints: NonNullable<HarnessOutput['checkpoints']>;
  godot: {
    projectDir: string;
    resultPath: string;
    logPath: string;
    stdout: string;
    stderr: string;
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
  strict: false,
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

function botStrategyName(player: BotPlayer): 'random' | 'heuristic' | 'mcts' {
  if (player === 'bot-heuristic') return 'heuristic';
  if (player === 'bot-mcts') return 'mcts';
  return 'random';
}

function victoryLabel(victoryType: string | undefined): string | undefined {
  if (!victoryType) return undefined;
  const labels: Record<string, string> = {
    lpDepletion: 'LP Depletion',
    cardDepletion: 'Card Depletion',
    passLimit: 'Pass Limit Exceeded',
    forfeit: 'Forfeit',
  };
  return labels[victoryType] ?? victoryType;
}

function deriveScenarioOutcome(scenario: GameScenario): ScenarioOutcome {
  const p1Strategy = botStrategyName(scenario.p1);
  const p2Strategy = botStrategyName(scenario.p2);
  const initialState = createInitialState({
    matchId: `scenario-${scenario.seed}`,
    players: [
      { id: 'bot-p1', name: `Bot-${p1Strategy}` },
      { id: 'bot-p2', name: `Bot-${p2Strategy}` },
    ],
    rngSeed: scenario.seed,
    gameOptions: {
      damageMode: scenario.damageMode,
      startingLifepoints: scenario.startingLifepoints,
      classicDeployment: true,
      quickStart: true,
    },
  });

  let state = applyAction(
    initialState,
    {
      type: 'system:init',
      timestamp: '1970-01-01T00:00:00.000Z',
    },
    { allowSystemInit: true, hashFn: computeStateHash },
  );

  for (const action of scenario.actions) {
    state = applyAction(state, action, { hashFn: computeStateHash });
  }

  const baseNames = state.players.map(
    (player, index) => player?.player.name ?? `Player ${index + 1}`,
  );
  const names = baseNames.map((name, index) =>
    baseNames.filter((candidate) => candidate === name).length > 1 ? `P${index + 1} ${name}` : name,
  );
  const outcome = state.outcome;
  const winnerName = outcome?.winnerIndex !== undefined ? names[outcome.winnerIndex] : undefined;
  const label = victoryLabel(outcome?.victoryType);
  const lifepointsText = state.players
    .map((player, index) => `${names[index]}: ${player?.lifepoints ?? 0} LP`)
    .join(' | ');
  const finalLifepoints = Object.fromEntries(
    state.players.map((player, index) => [names[index], player?.lifepoints ?? 0]),
  );
  const lastTx = state.transactionLog?.at(-1);

  return {
    outcomeText: winnerName ? `${winnerName} Wins!` : state.phase === 'gameOver' ? 'Draw' : null,
    winnerName,
    victorySummaryText:
      label && outcome ? `${label} on turn ${outcome.turnNumber ?? state.turnNumber}` : undefined,
    lifepointsText,
    finalLifepoints,
    turnCount: state.turnNumber,
    finalStateHash: lastTx?.stateHashAfter ?? computeStateHash(state),
  };
}

function buildEvents(
  scenario: GameScenario,
  harnessOutput: HarnessOutput | null,
  outcome: ScenarioOutcome,
  errors: string[],
): RunEvent[] {
  const events: RunEvent[] = [
    {
      at: new Date().toISOString(),
      type: 'state',
      detail: `start scenario=${scenario.id}`,
      turn: 0,
      phase: 'automation',
    },
  ];

  for (const checkpoint of harnessOutput?.checkpoints ?? []) {
    const checkpointType = checkpoint.type ?? 'unknown';
    events.push({
      at: new Date().toISOString(),
      type: 'checkpoint',
      detail: checkpointType,
      checkpoint: checkpointType,
      turn:
        typeof checkpoint.metadata?.turnCount === 'number'
          ? checkpoint.metadata.turnCount
          : scenario.turnCount,
      phase: 'automation',
    });
  }

  if (errors.length > 0) {
    events.push({
      at: new Date().toISOString(),
      type: 'error',
      detail: errors.join('; '),
      turn: outcome.turnCount,
      phase: 'automation',
    });
    return events;
  }

  events.push({
    at: new Date().toISOString(),
    type: 'result',
    detail: outcome.outcomeText ?? 'No terminal outcome',
    turn: outcome.turnCount,
    phase: 'gameOver',
    outcomeText: outcome.outcomeText,
    winnerName: outcome.winnerName,
    lifepointsText: outcome.lifepointsText,
  });
  return events;
}

async function writeEvents(path: string, events: RunEvent[]): Promise<void> {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await writeFile(path, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);
}

async function collectRequiredArtifactErrors(runDir: string): Promise<string[]> {
  const errors: string[] = [];
  for (const file of ['manifest.json', 'events.ndjson']) {
    try {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await stat(join(runDir, file));
    } catch {
      errors.push(`missing ${file}`);
    }
  }

  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const screenshots = await stat(join(runDir, 'screenshots'));
    if (!screenshots.isDirectory()) errors.push('screenshots is not a directory');
  } catch {
    errors.push('missing screenshots/');
  }
  return errors;
}

async function main(): Promise<void> {
  const projectDir = resolve('godot/client');
  const outDir = resolve(values['out-dir'] ?? 'artifacts/godot-automation');
  const runId = `godot-${Date.now()}`;
  const runDir = join(outDir, runId);
  const screenshotsDir = join(runDir, 'screenshots');
  const tempHome = await mkdtemp(join(tmpdir(), 'phx-godot-home-'));
  const start = new Date();

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await mkdir(screenshotsDir, { recursive: true });

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
  const manifestPath = join(runDir, 'manifest.json');
  const eventsPath = join(runDir, 'events.ndjson');
  const outcome = deriveScenarioOutcome(scenario);
  const harnessInput = {
    version: 1,
    source: values.scenario ? 'scenario-file' : 'generated-scenario',
    expectedCheckpoints: ['connected', 'hydrated', 'game_over'],
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
    const errors: string[] = [];
    try {
      harnessOutput = await readHarnessOutput(outputPath);
    } catch (err) {
      console.error(`Unable to read Godot harness output at ${outputPath}`);
      if (err instanceof Error) console.error(err.message);
      errors.push(err instanceof Error ? err.message : String(err));
    }

    if (run.code !== 0) {
      errors.push(`Godot exited with code ${run.code ?? 'unknown'}`);
    }
    if (harnessOutput?.ok !== true) {
      errors.push(...(harnessOutput?.errors ?? ['Godot harness did not report ok=true']));
    }
    if (outcome.finalStateHash && outcome.finalStateHash !== scenario.finalStateHash) {
      errors.push(
        `Scenario finalStateHash mismatch: expected ${scenario.finalStateHash}, got ${outcome.finalStateHash}`,
      );
    }

    const end = new Date();
    let manifest: GodotManifest = {
      seed: scenario.seed,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      durationMs: end.getTime() - start.getTime(),
      baseUrl: 'godot://local',
      damageMode: scenario.damageMode,
      startingLifepoints: scenario.startingLifepoints,
      status: errors.length > 0 ? 'failure' : 'success',
      failureReason: errors.length > 0 ? 'runtime_error' : undefined,
      failureMessage: errors.length > 0 ? errors.join('; ') : undefined,
      turnCount: outcome.turnCount,
      actionCount: scenario.actions.length,
      screenshotCount: 0,
      screenshots: [],
      outcomeText: outcome.outcomeText,
      winnerName: outcome.winnerName,
      victorySummaryText: outcome.victorySummaryText,
      lifepointsText: outcome.lifepointsText,
      finalLifepoints: outcome.finalLifepoints,
      screenshotMode: 'checkpoint',
      p1: scenario.p1,
      p2: scenario.p2,
      runId,
      scenarioId: scenario.id,
      scenarioPath: values.scenario,
      finalStateHash: outcome.finalStateHash,
      client: 'godot',
      headed: false,
      checkpoints: harnessOutput?.checkpoints ?? [],
      godot: {
        projectDir,
        resultPath: outputPath,
        logPath,
        stdout: run.stdout,
        stderr: run.stderr,
      },
    };

    await writeEvents(eventsPath, buildEvents(scenario, harnessOutput, outcome, errors));
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    const artifactErrors = await collectRequiredArtifactErrors(runDir);
    if (artifactErrors.length > 0) {
      manifest = {
        ...manifest,
        status: 'failure',
        failureReason: 'missing_artifact',
        failureMessage: [...errors, ...artifactErrors].join('; '),
      };
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    }

    if (manifest.status !== 'success') {
      console.error(`Godot automation failed: ${manifest.failureMessage ?? 'unknown error'}`);
      process.exit(run.code && run.code !== 0 ? run.code : 1);
    }

    const checkpoints = harnessOutput?.checkpoints?.map((checkpoint) => checkpoint.type).join(', ');
    console.log(
      `Godot automation passed: ${harnessOutput?.scenario?.id ?? scenario.id} ` +
        `actions=${harnessOutput?.scenario?.actionCount ?? scenario.actions.length} ` +
        `checkpoints=${checkpoints ?? 'none'}`,
    );
    console.log(`Artifacts: ${runDir}`);
    console.log(`Manifest: ${manifestPath}`);
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
