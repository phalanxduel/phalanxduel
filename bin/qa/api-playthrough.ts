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

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — ws is a dependency of @phalanxduel/server, available via pnpm hoisting
import WebSocket from 'ws';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs, type ParseArgsConfig } from 'node:util';

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
  outDir: string;
  damageModes: DamageMode[];
  startingLifepoints: number[];
  strategy: BotStrategy;
}

interface RunManifest {
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

// ---------------------------------------------------------------------------
// CLI Parsing
// ---------------------------------------------------------------------------

const argConfig: ParseArgsConfig = {
  options: {
    'base-url': { type: 'string', default: 'ws://localhost:3001/ws' },
    seed: { type: 'string' },
    batch: { type: 'string', default: '1' },
    'max-turns': { type: 'string', default: '300' },
    'out-dir': { type: 'string', default: 'artifacts/playthrough-api' },
    'damage-modes': { type: 'string', default: 'classic' },
    'starting-lps': { type: 'string', default: '20' },
    strategy: { type: 'string', default: 'random' },
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
  --base-url <url>       WebSocket URL (default: ws://localhost:3001/ws)
  --seed <number>        Fixed RNG seed for reproducibility
  --batch <n>            Number of games to run (default: 1)
  --max-turns <n>        Max turns before declaring timeout (default: 300)
  --out-dir <path>       Output directory (default: artifacts/playthrough-api)
  --damage-modes <csv>   Comma-separated: classic,cumulative (default: classic)
  --starting-lps <csv>   Comma-separated starting LP values (default: 20)
  --strategy <type>      Bot strategy: random or heuristic (default: random)
  --help                 Show this help
`);
    process.exit(0);
  }

  return {
    baseUrl: (values['base-url'] as string) ?? 'ws://localhost:3001/ws',
    seed: values.seed ? Number(values.seed) : undefined,
    batch: Number(values.batch ?? '1'),
    maxTurns: Number(values['max-turns'] ?? '300'),
    outDir: (values['out-dir'] as string) ?? 'artifacts/playthrough-api',
    damageModes: ((values['damage-modes'] as string) ?? 'classic').split(',') as DamageMode[],
    startingLifepoints: ((values['starting-lps'] as string) ?? '20')
      .split(',')
      .map(Number),
    strategy: (values.strategy as BotStrategy) ?? 'random',
  };
}

// ---------------------------------------------------------------------------
// WebSocket Helpers
// ---------------------------------------------------------------------------

function connectWs(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, {
      headers: { origin: 'http://localhost:3001' },
    });
    ws.on('open', () => resolve(ws));
    ws.on('error', (err: Error) => reject(err));
  });
}

function sendJson(ws: WebSocket, msg: unknown): void {
  ws.send(JSON.stringify(msg));
}

function waitForMessage(ws: WebSocket, predicate: (msg: ServerMsg) => boolean, timeoutMs = 10000): Promise<ServerMsg> {
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

  // Filter out system:init and forfeit — handled separately
  const playable = validActions.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any) => a.type !== 'system:init' && a.type !== 'forfeit',
  );

  if (playable.length === 0) return null;

  if (strategy === 'random') {
    return playable[Math.floor(Math.random() * playable.length)];
  }

  // Heuristic: prefer attack > deploy > reinforce > pass
  const priority: Record<string, number> = {
    attack: 0,
    deploy: 1,
    reinforce: 2,
    pass: 3,
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
): Promise<RunManifest> {
  const startAt = new Date().toISOString();
  const startMs = Date.now();
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
    sendJson(ws1, createMsg);
    log('P1', 'action', `createMatch (seed=${seed}, damage=${damageMode}, lp=${startingLp})`);

    const matchCreated = await waitForMessage(ws1, (m) => m.type === 'matchCreated');
    const matchId = matchCreated.matchId as string;
    const p1Id = matchCreated.playerId as string;
    log('P1', 'state', `Match created: ${matchId} (playerIndex=${matchCreated.playerIndex})`);

    // 3. P2 joins match
    sendJson(ws2, { type: 'joinMatch', matchId, playerName: 'API-P2' });
    log('P2', 'action', `joinMatch ${matchId}`);

    const matchJoined = await waitForMessage(ws2, (m) => m.type === 'matchJoined');
    const p2Id = matchJoined.playerId as string;
    log('P2', 'state', `Joined as playerIndex=${matchJoined.playerIndex}`);

    // 4. Wait for initial gameViewModel on both sides
    // After join, server broadcasts gameViewModel to both
    const vm1Promise = waitForMessage(ws1, (m) => m.type === 'gameViewModel');
    const vm2Promise = waitForMessage(ws2, (m) => m.type === 'gameViewModel');
    const [vm1, vm2] = await Promise.all([vm1Promise, vm2Promise]);

    let p1ValidActions = vm1.viewModel?.validActions ?? [];
    let p2ValidActions = vm2.viewModel?.validActions ?? [];
    let currentPhase = vm1.viewModel?.state?.phase ?? 'unknown';
    phasesVisited.add(currentPhase);
    log(undefined, 'state', `Initial phase: ${currentPhase}, P1 actions: ${p1ValidActions.length}, P2 actions: ${p2ValidActions.length}`);

    // 5. Game loop
    const playerWs = [ws1, ws2];
    const playerIds = [p1Id, p2Id];
    const playerNames: Array<'P1' | 'P2'> = ['P1', 'P2'];

    while (currentPhase !== 'gameOver' && turnCount < opts.maxTurns) {
      // Determine active player from the phase state
      const activeIndex = vm1.viewModel?.state?.activePlayerIndex ?? 0;
      const activeWs = playerWs[activeIndex]!;
      const activeName = playerNames[activeIndex]!;
      const activeValidActions = activeIndex === 0 ? p1ValidActions : p2ValidActions;

      // Pick an action
      const chosenAction = pickAction(activeValidActions, opts.strategy, currentPhase);
      if (!chosenAction) {
        log(activeName, 'error', `No valid actions in phase ${currentPhase}! API gap detected.`);
        throw new Error(`API_GAP: No valid actions for ${activeName} in phase ${currentPhase}`);
      }

      // Ensure timestamp is fresh
      chosenAction.timestamp = new Date().toISOString();

      // Send action
      sendJson(activeWs, { type: 'action', matchId, action: chosenAction });
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

      // Wait for gameState response on both sockets
      // The server broadcasts to both players
      const gs1Promise = waitForMessage(ws1, (m) => m.type === 'gameState' || m.type === 'actionError');
      const gs2Promise = waitForMessage(ws2, (m) => m.type === 'gameState' || m.type === 'actionError');

      const [gs1, gs2] = await Promise.all([gs1Promise, gs2Promise]);

      // Check for action errors
      if (gs1.type === 'actionError' || gs2.type === 'actionError') {
        const errMsg = (gs1.type === 'actionError' ? gs1 : gs2) as ServerMsg;
        log(activeName, 'error', `Action error: ${errMsg.error} (${errMsg.code})`);
        throw new Error(`ACTION_ERROR: ${errMsg.error} (${errMsg.code})`);
      }

      // Extract valid actions from the view model for each player
      p1ValidActions = gs1.viewModel?.validActions ?? [];
      p2ValidActions = gs2.viewModel?.validActions ?? [];

      // Update phase from the result postState
      const postState = gs1.result?.postState ?? gs1.viewModel?.postState;
      const newPhase = postState?.phase ?? currentPhase;
      if (newPhase !== currentPhase) {
        phasesVisited.add(newPhase);
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

      // Update the viewModel references for next iteration
      vm1.viewModel = {
        state: postState,
        validActions: p1ValidActions,
      };

      // Turn counting: count each attack/pass/reinforce/forfeit as advancing a turn
      if (['attack', 'pass', 'forfeit'].includes(chosenAction.type)) {
        turnCount++;
      }

      // Check for game over
      if (currentPhase === 'gameOver') {
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
      }
    }

    if (currentPhase !== 'gameOver') {
      outcomeText = `TIMEOUT: Game did not complete within ${opts.maxTurns} turns`;
      log(undefined, 'error', outcomeText);
    }

    const endAt = new Date().toISOString();
    const manifest: RunManifest = {
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
      failureMessage: currentPhase !== 'gameOver' ? outcomeText ?? undefined : undefined,
      turnCount,
      actionCount,
      outcomeText,
      phases: [...phasesVisited],
      finalStateHash,
    };

    return manifest;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    log(undefined, 'error', errorMsg);

    return {
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
  console.log(`  Damage modes:  ${opts.damageModes.join(', ')}`);
  console.log(`  Starting LPs:  ${opts.startingLifepoints.join(', ')}`);
  if (opts.seed !== undefined) console.log(`  Seed:          ${opts.seed}`);
  console.log();

  const runId = `api-${Date.now()}`;
  const runDir = join(opts.outDir, runId);
  await mkdir(runDir, { recursive: true });

  const results: RunManifest[] = [];
  let total = 0;
  let successes = 0;
  let failures = 0;

  for (const damageMode of opts.damageModes) {
    for (const lp of opts.startingLifepoints) {
      for (let i = 0; i < opts.batch; i++) {
        const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000);
        total++;
        console.log(`\n── Game ${total} ──  mode=${damageMode} lp=${lp} seed=${seed}`);

        const manifest = await runSingleGame(opts, seed, damageMode, lp);
        results.push(manifest);

        if (manifest.status === 'success') {
          successes++;
          console.log(`  ✅ ${manifest.outcomeText} (${manifest.durationMs}ms, ${manifest.actionCount} actions)`);
        } else {
          failures++;
          console.log(`  ❌ ${manifest.failureReason}: ${manifest.failureMessage}`);
        }

        // Save individual manifest
        const manifestPath = join(runDir, `game-${total}.json`);
        await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      }
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
