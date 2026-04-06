#!/usr/bin/env tsx
/**
 * API-Only Playthrough — TASK-122
 *
 * Drives a full Phalanx Duel game lifecycle using only WebSocket messages.
 * No Playwright, no browser, no DOM. Two WS clients simulate two players.
 *
 * Usage:
 *   tsx bin/qa/api-playthrough.ts [options]
 *   pnpm qa:api:run
 *   pnpm qa:api:run -- --batch 5 --seed 42
 *   pnpm qa:api:matrix
 */

import '../../scripts/instrument-cli.js';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — ws is a dependency of @phalanxduel/server, available via pnpm hoisting
import WebSocket from 'ws';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs, type ParseArgsConfig } from 'node:util';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { context, trace, SpanKind, type Attributes } from '@opentelemetry/api';
import type { ClientMessage } from '@phalanxduel/shared';
import { createInitialState, applyAction as engineApplyAction } from '@phalanxduel/engine';
import type { GameConfig } from '@phalanxduel/engine';
import { computeStateHash } from '@phalanxduel/shared/hash';
import { loadScenario, type GameScenario } from './scenario';
import { beginQaRun, type QaRun } from './telemetry.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DamageMode = 'classic' | 'cumulative';
type BotStrategy = 'random' | 'heuristic';

interface CliOptions {
  baseUrl: string;
  seed?: number;
  batch: number;
  maxTurns: number;
  maxRuns?: number;
  outDir: string;
  damageModes: DamageMode[];
  startingLifepoints: number[];
  strategy: BotStrategy;
  continuous: boolean;
  untilFailure: boolean;
  scenarioPath?: string;
}

interface RunManifest {
  runId: string;
  matchId: string | null;
  seed: number;
  startAt: string;
  endAt: string;
  durationMs: number;
  baseUrl: string;
  damageMode: DamageMode;
  startingLifepoints: number;
  strategy: BotStrategy;
  status: 'success' | 'failure';
  failureReason?: string;
  failureMessage?: string;
  turnCount: number;
  actionCount: number;
  outcomeText: string | null;
  phases: string[];
  finalStateHash: string | null;
}

interface RunEvent {
  at: string;
  type: 'action' | 'state' | 'result' | 'error';
  actor?: 'P1' | 'P2';
  detail: string;
}

/** Parsed server message (loosely typed — we validate structurally) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServerMsg = Record<string, any>;

const tracer = trace.getTracer('phx-qa-api-playthrough');

// ---------------------------------------------------------------------------
// CLI Parsing
// ---------------------------------------------------------------------------

const argConfig: ParseArgsConfig = {
  options: {
    'base-url': { type: 'string', default: 'ws://127.0.0.1:3001/ws' },
    seed: { type: 'string' },
    batch: { type: 'string', default: '1' },
    'max-turns': { type: 'string', default: '300' },
    'max-runs': { type: 'string' },
    'out-dir': { type: 'string', default: 'artifacts/playthrough-api' },
    'damage-modes': { type: 'string', default: 'classic' },
    'starting-lps': { type: 'string', default: '20' },
    strategy: { type: 'string', default: 'random' },
    continuous: { type: 'boolean', default: false },
    'until-failure': { type: 'boolean', default: false },
    scenario: { type: 'string' },
    help: { type: 'boolean', default: false },
  },
  strict: true,
};

function parseCliOptions(): CliOptions {
  const { values } = parseArgs(argConfig);

  if (values.help) {
    console.log(`
api-playthrough - Run API-only game playthroughs via WebSocket

Options:
  --base-url <url>       WebSocket URL (default: ws://127.0.0.1:3001/ws)
  --seed <number>        Fixed RNG seed for reproducibility
  --batch <n>            Number of games to run (default: 1)
  --max-turns <n>        Max turns before declaring timeout (default: 300)
  --max-runs <n>         Bound continuous mode to N runs before success exit
  --out-dir <path>       Output directory (default: artifacts/playthrough-api)
  --damage-modes <csv>   Comma-separated: classic,cumulative (default: classic)
  --starting-lps <csv>   Comma-separated starting LP values (default: 20)
  --strategy <type>      Bot strategy: random or heuristic (default: random)
  --continuous           Alias for --until-failure
  --until-failure        Repeat cases until a failure or --max-runs limit
  --scenario <path>      Path to a generated scenario.json file to validate
  --help                 Show this help
`);
    process.exit(0);
  }

  return {
    baseUrl: (values['base-url'] as string) ?? 'ws://127.0.0.1:3001/ws',
    seed: values.seed ? Number(values.seed) : undefined,
    batch: Number(values.batch ?? '1'),
    maxTurns: Number(values['max-turns'] ?? '300'),
    maxRuns: values['max-runs'] ? Number(values['max-runs']) : undefined,
    outDir: (values['out-dir'] as string) ?? 'artifacts/playthrough-api',
    damageModes: ((values['damage-modes'] as string) ?? 'classic').split(',') as DamageMode[],
    startingLifepoints: ((values['starting-lps'] as string) ?? '20').split(',').map(Number),
    strategy: (values.strategy as BotStrategy) ?? 'random',
    continuous: Boolean(values.continuous),
    untilFailure: Boolean(values['until-failure']),
    scenarioPath: values.scenario as string | undefined,
  };
}

// ---------------------------------------------------------------------------
// WebSocket Helpers
// ---------------------------------------------------------------------------

function connectWs(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const connectSpan = tracer.startSpan('ws.connect', {
      kind: SpanKind.CLIENT,
      attributes: wsEndpointAttrs(url),
    });
    const ws = new WebSocket(url, {
      headers: { origin: 'http://127.0.0.1:3001' },
    });
    ws.on('open', () => {
      connectSpan.end();
      resolve(ws);
    });
    ws.on('error', (err: Error) => {
      connectSpan.recordException(err);
      connectSpan.end();
      reject(new Error(`Failed to connect to ${url}: ${err.message}`));
    });
  });
}

function sendJson(ws: WebSocket, qaRun: QaRun, msg: ClientMessage): void {
  const reliableMessage =
    msg.type !== 'ack' &&
    msg.type !== 'ping' &&
    msg.type !== 'pong' &&
    (typeof msg.msgId !== 'string' || msg.msgId.length === 0)
      ? { ...msg, msgId: crypto.randomUUID() }
      : msg;
  const wrapped = qaRun.wrapClientMessage(reliableMessage);
  const sendSpan = tracer.startSpan(
    `ws.send.${msg.type}`,
    {
      kind: SpanKind.CLIENT,
      attributes: {
        ...wsEndpointAttrs(ws.url),
        ...(msg.type === 'action' ? { 'action.type': msg.action.type } : {}),
        ...('matchId' in msg && typeof msg.matchId === 'string' ? { 'match.id': msg.matchId } : {}),
        'qa.run_id': qaRun.runId,
      },
    },
    context.active(),
  );
  ws.send(JSON.stringify(wrapped));
  sendSpan.end();
}

function wsEndpointAttrs(url: string): Attributes {
  const attrs: Attributes = {
    'network.protocol.name': 'websocket',
    'url.full': url,
    'peer.service': 'phx-server',
  };

  try {
    const parsed = new URL(url);
    attrs['server.address'] = parsed.hostname;
    if (parsed.port) {
      attrs['server.port'] = Number(parsed.port);
    }
    attrs['url.scheme'] = parsed.protocol.replace(/:$/u, '');
    attrs['url.path'] = parsed.pathname;
  } catch {
    attrs['server.address'] = url;
  }

  return attrs;
}

function waitForMessage(
  ws: WebSocket,
  predicate: (msg: ServerMsg) => boolean,
  timeoutMs = 10000,
): Promise<ServerMsg> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.off('message', handler);
      reject(new Error(`Timed out waiting for message (${timeoutMs}ms)`));
    }, timeoutMs);

    function handler(data: WebSocket.Data) {
      const parsed = JSON.parse(data.toString()) as ServerMsg;
      if (predicate(parsed)) {
        clearTimeout(timeout);
        ws.off('message', handler);
        resolve(parsed);
      }
    }
    ws.on('message', handler);
  });
}

function drainMessages(ws: WebSocket, durationMs = 200): Promise<ServerMsg[]> {
  return new Promise((resolve) => {
    const msgs: ServerMsg[] = [];
    function handler(data: WebSocket.Data) {
      msgs.push(JSON.parse(data.toString()) as ServerMsg);
    }
    ws.on('message', handler);
    setTimeout(() => {
      ws.off('message', handler);
      resolve(msgs);
    }, durationMs);
  });
}

// ---------------------------------------------------------------------------
// Bot Strategy — picks from validActions
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickAction(validActions: any[], strategy: BotStrategy, _phase: string): any {
  if (!validActions || validActions.length === 0) return null;

  const playable = validActions.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any) => a.type !== 'forfeit',
  );

  if (playable.length === 0) return null;

  if (strategy === 'random') {
    return playable[Math.floor(Math.random() * playable.length)];
  }

  // Heuristic: prefer attack > deploy > reinforce > pass > system:init
  const priority: Record<string, number> = {
    attack: 0,
    deploy: 1,
    reinforce: 2,
    pass: 3,
    'system:init': 4,
  };
  playable.sort(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any, b: any) => (priority[a.type] ?? 99) - (priority[b.type] ?? 99),
  );
  return playable[0];
}

// ---------------------------------------------------------------------------
// Single Game Run
// ---------------------------------------------------------------------------

async function runSingleGame(
  opts: CliOptions,
  seed: number,
  damageMode: DamageMode,
  startingLp: number,
  scenarioData?: GameScenario,
): Promise<RunManifest> {
  const startAt = new Date().toISOString();
  const startMs = Date.now();
  const qaRunId = `api-${seed}-${Date.now()}`;
  const qaRun = beginQaRun({
    tool: 'api-playthrough',
    runId: qaRunId,
    baseUrl: opts.baseUrl,
    seed,
    damageMode,
    startingLifepoints: startingLp,
    p1: 'api-p1',
    p2: `api-${opts.strategy}`,
    scenarioPath: opts.scenarioPath,
  });
  const events: RunEvent[] = [];
  const phasesVisited = new Set<string>();
  let actionCount = 0;
  let turnCount = 0;
  let outcomeText: string | null = null;
  let finalStateHash: string | null = null;

  const log = (actor: 'P1' | 'P2' | undefined, type: RunEvent['type'], detail: string) => {
    events.push({ at: new Date().toISOString(), type, actor, detail });
    const prefix = actor ? `[${actor}]` : '[SYS]';
    console.log(`  ${prefix} ${detail}`);
  };

  let ws1: WebSocket | null = null;
  let ws2: WebSocket | null = null;

  try {
    // 1. Connect both WS clients
    log(undefined, 'state', `Connecting to ${opts.baseUrl}...`);
    ws1 = await connectWs(opts.baseUrl);
    ws2 = await connectWs(opts.baseUrl);
    log(undefined, 'state', 'Both WebSocket clients connected');

    // 2. P1 creates match
    const createMsg = {
      type: 'createMatch',
      playerName: 'API-P1',
      rngSeed: seed,
      gameOptions: {
        damageMode,
        startingLifepoints: startingLp,
      },
    };
    sendJson(ws1, qaRun, createMsg);
    log('P1', 'action', `createMatch (seed=${seed}, damage=${damageMode}, lp=${startingLp})`);

    const matchCreated = await waitForMessage(ws1, (m) => m.type === 'matchCreated');
    const matchId = matchCreated.matchId as string;
    const p1Id = matchCreated.playerId as string;
    qaRun.bindMatch(matchId, {
      'qa.p1_id': p1Id,
      'qa.p1_index': Number(matchCreated.playerIndex ?? 0),
    });
    log('P1', 'state', `Match created: ${matchId} (playerIndex=${matchCreated.playerIndex})`);

    // 4. Register gameState listeners BEFORE sending joinMatch so we don't miss the broadcast
    // that the server sends immediately after joinMatch (in the same TCP packet on fast paths).
    const vm1Promise = waitForMessage(ws1, (m) => m.type === 'gameState');
    const vm2Promise = waitForMessage(ws2, (m) => m.type === 'gameState');

    // 3. P2 joins match
    sendJson(ws2, qaRun, { type: 'joinMatch', matchId, playerName: 'API-P2' });
    log('P2', 'action', `joinMatch ${matchId}`);

    const matchJoined = await waitForMessage(ws2, (m) => m.type === 'matchJoined');
    const p2Id = matchJoined.playerId as string;
    qaRun.annotate('qa.player.joined', {
      'qa.p2_id': p2Id,
      'qa.p2_index': Number(matchJoined.playerIndex ?? 1),
    });
    log('P2', 'state', `Joined as playerIndex=${matchJoined.playerIndex}`);
    const [vm1Msg, vm2Msg] = await Promise.all([vm1Promise, vm2Promise]);

    let vm1 = vm1Msg.viewModel;
    let vm2 = vm2Msg.viewModel;

    // ---------------------------------------------------------------------------
    // Bootstrap local engine for per-action state drift detection (TASK-126)
    // ---------------------------------------------------------------------------
    const localGameConfig: GameConfig = {
      matchId,
      players: [
        { id: p1Id, name: 'API-P1' },
        { id: p2Id, name: 'API-P2' },
      ],
      rngSeed: seed,
      gameOptions: { damageMode, startingLifepoints: startingLp },
    };
    let localState = createInitialState(localGameConfig);

    // Apply system:init using the exact timestamp the server used (from the first txLog entry)
    const initTxEntry = vm1?.state?.transactionLog?.[0];
    if (initTxEntry?.action?.type === 'system:init') {
      localState = engineApplyAction(localState, initTxEntry.action, {
        hashFn: computeStateHash,
      });
      const localInitHash = localState.transactionLog?.at(-1)?.stateHashAfter ?? '';
      if (
        localInitHash &&
        initTxEntry.stateHashAfter &&
        localInitHash !== initTxEntry.stateHashAfter
      ) {
        log(
          undefined,
          'error',
          `STATE_DRIFT on system:init: local=${localInitHash} server=${initTxEntry.stateHashAfter}`,
        );
        throw new Error('STATE_DRIFT: initial state hash mismatch after system:init');
      }
      log(
        undefined,
        'state',
        `Local engine bootstrapped (init hash: ${localInitHash.slice(0, 12)}…)`,
      );
    } else {
      log(
        undefined,
        'error',
        'Could not find system:init entry in initial transactionLog — drift detection disabled for this run',
      );
    }

    // GameViewModel has .state, TurnViewModel has .postState
    let p1ValidActions = vm1?.validActions ?? [];
    let p2ValidActions = vm2?.validActions ?? [];
    let currentPhase = vm1?.state?.phase ?? vm1?.postState?.phase ?? 'unknown';
    phasesVisited.add(currentPhase);
    log(
      undefined,
      'state',
      `Initial phase: ${currentPhase}, P1 actions: ${p1ValidActions.length}, P2 actions: ${p2ValidActions.length}`,
    );

    // 5. Game loop
    const playerWs = [ws1, ws2];
    const playerIds = [p1Id, p2Id];
    const playerNames: Array<'P1' | 'P2'> = ['P1', 'P2'];

    while (
      currentPhase !== 'gameOver' &&
      actionCount < Math.min(opts.maxTurns, scenarioData?.actions.length ?? opts.maxTurns)
    ) {
      // Both players may have actions (e.g. DeploymentPhase overriding activePlayerIndex)
      // We see who has playable actions.
      const p1Playable = p1ValidActions.filter((a: any) => a.type !== 'forfeit');
      const p2Playable = p2ValidActions.filter((a: any) => a.type !== 'forfeit');

      let activeIndex = vm1?.state?.activePlayerIndex ?? 0;
      let activeValidActions = p1ValidActions;

      // Override if the engine explicitly gives play to the non-turn player
      if (p1Playable.length === 0 && p2Playable.length > 0) {
        activeIndex = 1;
        activeValidActions = p2ValidActions;
      } else if (activeIndex === 1) {
        activeValidActions = p2ValidActions;
      }

      const activeWs = playerWs[activeIndex]!;
      const activeName = playerNames[activeIndex]!;

      // Pick an action from scenario or fallback to strategy
      let chosenAction = null;
      if (scenarioData) {
        if (actionCount < scenarioData.actions.length) {
          chosenAction = scenarioData.actions[actionCount];
        }
      } else {
        chosenAction = pickAction(activeValidActions, opts.strategy, currentPhase);
      }

      if (!chosenAction) {
        log(
          activeName,
          'error',
          `No valid actions in phase ${currentPhase}! API gap detected. Available: ${JSON.stringify(activeValidActions)}`,
        );
        throw new Error(`API_GAP: No valid actions for ${activeName} in phase ${currentPhase}`);
      }

      // Ensure timestamp is fresh
      chosenAction.timestamp = new Date().toISOString();

      // Send action
      sendJson(activeWs, qaRun, { type: 'action', matchId, action: chosenAction });
      actionCount++;
      const actionSummary =
        chosenAction.type === 'deploy'
          ? `deploy col=${chosenAction.column} card=${String(chosenAction.cardId).slice(-8)}`
          : chosenAction.type === 'attack'
            ? `attack col=${chosenAction.attackingColumn}→${chosenAction.defendingColumn}`
            : chosenAction.type === 'reinforce'
              ? `reinforce card=${String(chosenAction.cardId).slice(-8)}`
              : chosenAction.type;
      log(activeName, 'action', `${actionSummary} (phase=${currentPhase})`);
      qaRun.annotate('qa.action', {
        'action.type': chosenAction.type as string,
        'game.phase': currentPhase,
      });

      // 5b. Wait for updated gameState on both clients
      // If either receives an actionError, we want to reject immediately rather than hanging on Promise.all
      const nextVm1Promise = waitForMessage(
        ws1,
        (m) =>
          m.type === 'actionError' ||
          m.type === 'matchError' ||
          m.type === 'auth_error' ||
          (m.type === 'gameState' && m.result?.action?.type !== 'system:init'),
      );
      const nextVm2Promise = waitForMessage(
        ws2,
        (m) =>
          m.type === 'actionError' ||
          m.type === 'matchError' ||
          m.type === 'auth_error' ||
          (m.type === 'gameState' && m.result?.action?.type !== 'system:init'),
      );

      const raceError = Promise.race([
        nextVm1Promise.then((m) =>
          m.type === 'actionError' || m.type === 'matchError' || m.type === 'auth_error'
            ? Promise.reject(m)
            : m,
        ),
        nextVm2Promise.then((m) =>
          m.type === 'actionError' || m.type === 'matchError' || m.type === 'auth_error'
            ? Promise.reject(m)
            : m,
        ),
      ]);

      let gs1, gs2;
      try {
        [gs1, gs2] = await Promise.all([nextVm1Promise, nextVm2Promise, raceError]);
      } catch (errMsg: any) {
        const detail = errMsg.error || JSON.stringify(errMsg);
        const code = errMsg.code || errMsg.type;
        log(activeName, 'error', `Action error: ${detail} (${code})`);
        qaRun.recordPattern(
          'action_error',
          { 'qa.error_code': String(code), 'qa.error_detail': detail },
          SeverityNumber.ERROR,
          'ERROR',
        );
        throw new Error(`ACTION_ERROR: ${detail} (${code})`);
      }

      vm1 = gs1.viewModel;
      vm2 = gs2.viewModel;

      // -----------------------------------------------------------------------
      // Per-action drift detection: re-simulate locally and compare hashes (TASK-126)
      // -----------------------------------------------------------------------
      try {
        localState = engineApplyAction(localState, chosenAction, { hashFn: computeStateHash });
      } catch (localErr) {
        const localErrMsg = localErr instanceof Error ? localErr.message : String(localErr);
        log(
          activeName,
          'error',
          `STATE_DRIFT: local engine rejected action accepted by server: ${localErrMsg}`,
        );
        qaRun.recordPattern(
          'state_drift',
          { 'action.type': chosenAction.type as string },
          SeverityNumber.ERROR,
          'ERROR',
        );
        throw new Error(
          `STATE_DRIFT: local engine reject for action ${chosenAction.type} #${actionCount}: ${localErrMsg}`,
        );
      }

      const localTxEntry = localState.transactionLog?.at(-1);
      const serverTxEntry = gs1.viewModel?.state?.transactionLog?.at(-1);
      const localHash = localTxEntry?.stateHashAfter ?? '';
      const serverHash = serverTxEntry?.stateHashAfter ?? '';

      if (localHash && serverHash && localHash !== serverHash) {
        const { transactionLog: _ltl, ...localExpected } = localState;
        const serverActual = gs1.viewModel?.state;
        log(
          activeName,
          'error',
          [
            `STATE_DRIFT after action #${actionCount} (${chosenAction.type}):`,
            `  local  hash: ${localHash}`,
            `  server hash: ${serverHash}`,
            `  expected (engine): ${JSON.stringify(localExpected)}`,
            `  actual   (server): ${JSON.stringify(serverActual)}`,
          ].join('\n'),
        );
        qaRun.recordPattern(
          'state_drift',
          { 'action.type': chosenAction.type as string, 'game.turn': turnCount },
          SeverityNumber.ERROR,
          'ERROR',
        );
        throw new Error(
          `STATE_DRIFT: hash mismatch after ${chosenAction.type} action #${actionCount} (local=${localHash.slice(0, 8)} server=${serverHash.slice(0, 8)})`,
        );
      }

      p1ValidActions = vm1?.validActions ?? [];
      p2ValidActions = vm2?.validActions ?? [];
      // TurnViewModel uses postState
      const newPhase = vm1?.state?.phase ?? vm1?.postState?.phase ?? currentPhase;

      if (newPhase !== currentPhase) {
        phasesVisited.add(newPhase);
        qaRun.annotate('qa.phase', { 'game.phase': newPhase, 'game.turn': turnCount });
        currentPhase = newPhase;
      }

      // Also track phases in the phaseTrace
      const phaseTrace = gs1.result?.postState?.transactionLog?.at?.(-1)?.phaseTrace;
      if (Array.isArray(phaseTrace)) {
        for (const hop of phaseTrace) {
          phasesVisited.add(hop.from);
          phasesVisited.add(hop.to);
        }
      }

      // Turn counting: count each attack/pass/reinforce/forfeit as advancing a turn
      if (['attack', 'pass', 'forfeit'].includes(chosenAction.type)) {
        turnCount++;
      }

      // Check for game over
      if (currentPhase === 'gameOver') {
        const postState = gs1.result?.postState ?? vm1?.postState ?? vm1?.state;
        const outcome = postState?.outcome;
        if (outcome) {
          outcomeText = `Player ${outcome.winnerIndex + 1} wins by ${outcome.victoryType} on turn ${outcome.turnNumber}`;
          log(undefined, 'result', outcomeText);
        }
        // Try to get the final state hash from the last transaction log entry
        const lastTx = postState?.transactionLog?.at?.(-1);
        if (lastTx?.stateHashAfter) {
          finalStateHash = lastTx.stateHashAfter;
        }
        if (scenarioData && finalStateHash !== scenarioData.finalStateHash) {
          log(
            undefined,
            'error',
            `Hash mismatch! Expected ${scenarioData.finalStateHash}, got ${finalStateHash}`,
          );
          qaRun.recordPattern('state_hash_mismatch', undefined, SeverityNumber.ERROR, 'ERROR');
          throw new Error(
            `STATE_HASH_MISMATCH: expected ${scenarioData.finalStateHash}, got ${finalStateHash}`,
          );
        }
      }
    }

    if (currentPhase !== 'gameOver') {
      outcomeText = `TIMEOUT: Game did not complete within ${opts.maxTurns} turns`;
      log(undefined, 'error', outcomeText);
      qaRun.recordPattern('timeout', { 'game.turn': turnCount }, SeverityNumber.WARN, 'WARN');
    }

    const endAt = new Date().toISOString();
    const manifest: RunManifest = {
      runId: qaRunId,
      matchId,
      seed,
      startAt,
      endAt,
      durationMs: Date.now() - startMs,
      baseUrl: opts.baseUrl,
      damageMode,
      startingLifepoints: startingLp,
      strategy: opts.strategy,
      status: currentPhase === 'gameOver' ? 'success' : 'failure',
      failureReason: currentPhase !== 'gameOver' ? 'timeout' : undefined,
      failureMessage: currentPhase !== 'gameOver' ? (outcomeText ?? undefined) : undefined,
      turnCount,
      actionCount,
      outcomeText,
      phases: [...phasesVisited],
      finalStateHash,
    };
    qaRun.finish({
      status: manifest.status,
      durationMs: manifest.durationMs,
      turnCount: manifest.turnCount,
      actionCount: manifest.actionCount,
      failureReason: manifest.failureReason,
      failureMessage: manifest.failureMessage,
      outcomeText: manifest.outcomeText,
    });

    return manifest;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log(undefined, 'error', errorMsg);
    qaRun.recordPattern(
      errorMsg.startsWith('API_GAP') ? 'api_gap' : 'runtime_error',
      { 'qa.failure_message': errorMsg },
      SeverityNumber.ERROR,
      'ERROR',
    );

    const manifest: RunManifest = {
      runId: qaRunId,
      matchId: null,
      seed,
      startAt,
      endAt: new Date().toISOString(),
      durationMs: Date.now() - startMs,
      baseUrl: opts.baseUrl,
      damageMode,
      startingLifepoints: startingLp,
      strategy: opts.strategy,
      status: 'failure',
      failureReason: errorMsg.startsWith('API_GAP') ? 'api_gap' : 'runtime_error',
      failureMessage: errorMsg,
      turnCount,
      actionCount,
      outcomeText: null,
      phases: [...phasesVisited],
      finalStateHash: null,
    };
    qaRun.finish({
      status: manifest.status,
      durationMs: manifest.durationMs,
      turnCount: manifest.turnCount,
      actionCount: manifest.actionCount,
      failureReason: manifest.failureReason,
      failureMessage: manifest.failureMessage,
      outcomeText: manifest.outcomeText,
    });
    return manifest;
  } finally {
    ws1?.close();
    ws2?.close();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const opts = parseCliOptions();

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Phalanx Duel — API-Only Playthrough                ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  Base URL:      ${opts.baseUrl}`);
  console.log(`  Strategy:      ${opts.strategy}`);
  console.log(`  Batch:         ${opts.batch}`);
  console.log(`  Max turns:     ${opts.maxTurns}`);
  if (opts.maxRuns !== undefined) console.log(`  Max runs:      ${opts.maxRuns}`);
  console.log(`  Damage modes:  ${opts.damageModes.join(', ')}`);
  console.log(`  Starting LPs:  ${opts.startingLifepoints.join(', ')}`);
  if (opts.continuous || opts.untilFailure) console.log('  Mode:          until-failure');
  if (opts.seed !== undefined) console.log(`  Seed:          ${opts.seed}`);
  console.log();

  const runId = `api-${Date.now()}`;
  const runDir = join(opts.outDir, runId);
  await mkdir(runDir, { recursive: true });

  const results: RunManifest[] = [];
  let total = 0;
  let successes = 0;
  let failures = 0;

  let scenarioData: GameScenario | undefined;
  if (opts.scenarioPath) {
    scenarioData = await loadScenario(opts.scenarioPath);
    opts.seed = scenarioData.seed;
    opts.damageModes = [scenarioData.damageMode];
    opts.startingLifepoints = [scenarioData.startingLifepoints];
    opts.batch = 1;
    opts.continuous = false;
    opts.untilFailure = false;
    opts.maxRuns = 1;
    console.log(`Loaded scenario: ${scenarioData.id} with ${scenarioData.actions.length} actions.`);
  }

  const runUntilFailure = opts.continuous || opts.untilFailure;
  const plannedCases = opts.damageModes.flatMap((damageMode) =>
    opts.startingLifepoints.map((lp) => ({ damageMode, lp })),
  );
  const targetRuns = runUntilFailure
    ? (opts.maxRuns ?? Number.POSITIVE_INFINITY)
    : plannedCases.length * opts.batch;

  while (total < targetRuns) {
    const scheduledIndex = runUntilFailure
      ? total % plannedCases.length
      : Math.floor(total / opts.batch);
    const { damageMode, lp } = plannedCases[scheduledIndex]!;
    const seed =
      opts.seed !== undefined
        ? runUntilFailure
          ? opts.seed + total
          : opts.seed
        : Math.floor(Math.random() * 1_000_000);

    total++;
    console.log(`\n── Game ${total} ──  mode=${damageMode} lp=${lp} seed=${seed}`);

    const manifest = await runSingleGame(opts, seed, damageMode, lp, scenarioData);
    results.push(manifest);

    if (manifest.status === 'success') {
      successes++;
      console.log(
        `  ✅ ${manifest.outcomeText} (${manifest.durationMs}ms, ${manifest.actionCount} actions)`,
      );
    } else {
      failures++;
      console.log(`  ❌ ${manifest.failureReason}: ${manifest.failureMessage}`);
    }

    const manifestPath = join(runDir, `game-${total}.json`);
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    if (runUntilFailure && manifest.status === 'failure') {
      console.log(`\n  ⛔ Stopping after failure in game ${total}`);
      break;
    }
  }

  // Save summary
  const summary = {
    runId,
    total,
    successes,
    failures,
    damageModes: opts.damageModes,
    startingLifepoints: opts.startingLifepoints,
    strategy: opts.strategy,
    results,
  };
  await writeFile(join(runDir, 'summary.json'), JSON.stringify(summary, null, 2));

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(`║  Results: ${successes}/${total} passed, ${failures} failed`);
  console.log(`║  Output:  ${runDir}`);
  console.log('╚══════════════════════════════════════════════════════╝');

  // Check all required phases were exercised
  const allPhases = new Set(results.flatMap((r) => r.phases));
  const requiredPhases = [
    'DeploymentPhase',
    'AttackPhase',
    'AttackResolution',
    'CleanupPhase',
    'DrawPhase',
    'EndTurn',
    'StartTurn',
  ];
  const missingPhases = requiredPhases.filter((p) => !allPhases.has(p));
  if (missingPhases.length > 0) {
    console.log(`\n  ⚠️  Phases NOT exercised: ${missingPhases.join(', ')}`);
  } else {
    console.log('\n  ✅ All turn lifecycle phases exercised');
  }

  if (failures > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
