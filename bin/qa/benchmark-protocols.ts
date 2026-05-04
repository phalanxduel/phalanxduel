#!/usr/bin/env tsx
/**
 * Cross-Protocol Performance Benchmark — TASK-268
 *
 * Measures per-action latency and throughput for WebSocket vs REST transports.
 * REST driver uses WS only for initial handshake/state, then switches to HTTP.
 *
 * Usage:
 *   tsx bin/qa/benchmark-protocols.ts [options]
 *   pnpm benchmark:protocols -- --batch 5
 *
 * Options:
 *   --batch <n>       Games per transport (default: 5)
 *   --max-turns <n>   Turn limit (default: 200)
 *   --base-url <url>  WebSocket URL (default: ws://127.0.0.1:3001/ws)
 *   --http-url <url>  HTTP base URL (default: derived from WS URL)
 *   --json            Output raw JSON results instead of table
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import WebSocket from 'ws';
import { parseArgs } from 'node:util';
import { getHeapStatistics } from 'node:v8';
import type { Action, GameState } from '../../shared/src/index.ts';
import {
  createInitialState,
  applyAction as engineApply,
  getValidActions,
} from '../../engine/src/index.ts';
import type { GameConfig } from '../../engine/src/index.ts';
import { computeStateHash } from '../../shared/src/hash.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActionTiming {
  actionType: string;
  latencyMs: number;
  phase: string;
}

interface GameResult {
  transport: 'ws' | 'rest';
  seed: number;
  matchId: string;
  actionTimings: ActionTiming[];
  connectMs: number;
  setupMs: number;
  totalMs: number;
  actionCount: number;
  error?: string;
}

interface HeapSnapshot {
  heapUsed: number;
  heapTotal: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServerMsg = Record<string, any>;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2).filter((a) => a !== '--');
const { values } = parseArgs({
  args: argv,
  options: {
    batch: { type: 'string', default: '5' },
    'max-turns': { type: 'string', default: '200' },
    'base-url': { type: 'string' },
    'http-url': { type: 'string' },
    json: { type: 'boolean', default: false },
  },
  strict: true,
});

const BATCH = Math.max(1, Number(values.batch));
const MAX_TURNS = Math.max(1, Number(values['max-turns']));
const WS_URL =
  (values['base-url'] as string) ?? process.env.PHALANX_WS_URL ?? 'ws://127.0.0.1:3001/ws';
const HTTP_URL =
  (values['http-url'] as string) ??
  process.env.PHALANX_HTTP_URL ??
  WS_URL.replace(/^ws(s?):\/\//u, 'http$1://').replace(/\/ws$/u, '');
const JSON_OUTPUT = Boolean(values.json);

// ---------------------------------------------------------------------------
// WebSocket Helpers
// ---------------------------------------------------------------------------

function connectWs(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { headers: { origin: 'http://127.0.0.1:3001' } });
    ws.on('open', () => resolve(ws));
    ws.on('error', (err: Error) => reject(new Error(`WS connect: ${err.message}`)));
  });
}

function waitFor(
  ws: WebSocket,
  predicate: (m: ServerMsg) => boolean,
  timeoutMs = 15000,
): Promise<ServerMsg> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      ws.off('message', h);
      reject(new Error(`WS timeout (${timeoutMs}ms)`));
    }, timeoutMs);
    function h(data: WebSocket.Data) {
      const m = JSON.parse(data.toString()) as ServerMsg;
      if (predicate(m)) {
        clearTimeout(t);
        ws.off('message', h);
        resolve(m);
      }
    }
    ws.on('message', h);
  });
}

function sendWs(ws: WebSocket, msg: object): void {
  ws.send(JSON.stringify({ ...msg, msgId: crypto.randomUUID() }));
}

// ---------------------------------------------------------------------------
// Bot: pick heuristic non-forfeit action
// ---------------------------------------------------------------------------

function pickAction(actions: Action[]): Action | null {
  const playable = actions.filter((a) => a.type !== 'forfeit');
  if (playable.length === 0) return null;
  const priority: Record<string, number> = { attack: 0, deploy: 1, reinforce: 2, pass: 3 };
  playable.sort((a, b) => (priority[a.type] ?? 99) - (priority[b.type] ?? 99));
  return playable[0]!;
}

// ---------------------------------------------------------------------------
// Local engine bootstrap from initial WS gameState
// ---------------------------------------------------------------------------

interface LocalEngine {
  state: GameState;
  p1Id: string;
  p2Id: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bootstrapEngine(
  matchId: string,
  seed: number,
  init1Vm: any,
  p1Id: string,
  p2Id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serverGameOptions?: any,
): LocalEngine {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postState: any = init1Vm?.postState ?? init1Vm?.state;
  const drawTs: string | undefined = (() => {
    const hand = postState?.players?.[0]?.hand;
    if (!hand?.length) return undefined;
    const m = (hand[0].id as string).match(/^(20\d{2}-.*?Z)::/u);
    return m?.[1];
  })();

  const config: GameConfig = {
    matchId,
    players: [
      { id: p1Id, name: 'Bench-P1' },
      { id: p2Id, name: 'Bench-P2' },
    ],
    rngSeed: seed,
    drawTimestamp: drawTs,
    matchParams: postState?.params,
    gameOptions: serverGameOptions ?? {
      damageMode: postState?.params?.modeDamagePersistence ?? 'classic',
      startingLifepoints: postState?.players?.[0]?.hp ?? 20,
      classicDeployment: postState?.params?.modeClassicDeployment ?? true,
      quickStart: postState?.params?.modeQuickStart ?? false,
    },
  };

  let state = createInitialState(config);

  // Apply system:init using server's exact entry
  const txLog = postState?.transactionLog as { action?: Action }[] | undefined;
  const initEntry = txLog?.[0];
  if (initEntry?.action?.type === 'system:init') {
    state = engineApply(state, initEntry.action, {
      hashFn: computeStateHash,
      allowSystemInit: true,
    });
  }

  return { state, p1Id, p2Id };
}

// ---------------------------------------------------------------------------
// WS Game Runner
// ---------------------------------------------------------------------------

async function runWsGame(seed: number): Promise<GameResult> {
  const startMs = Date.now();
  const timings: ActionTiming[] = [];
  let ws1: WebSocket | null = null;
  let ws2: WebSocket | null = null;

  try {
    const connectStart = Date.now();
    ws1 = await connectWs(WS_URL);
    ws2 = await connectWs(WS_URL);
    const connectMs = Date.now() - connectStart;

    const setupStart = Date.now();
    sendWs(ws1, {
      type: 'createMatch',
      playerName: 'Bench-P1',
      rngSeed: seed,
      gameOptions: { damageMode: 'classic', startingLifepoints: 20 },
    });

    const created = await waitFor(
      ws1,
      (m) => m.type === 'matchCreated' || m.type === 'matchError' || m.type === 'error',
      8000,
    );
    if (created.type !== 'matchCreated') {
      throw new Error(`createMatch rejected: ${created.error ?? created.code ?? 'unknown'}`);
    }
    const matchId = created.matchId as string;
    const p1Id = created.playerId as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serverGameOptions: any = created.gameOptions;

    const gs1Promise = waitFor(ws1, (m) => m.type === 'gameState');
    const gs2Promise = waitFor(ws2, (m) => m.type === 'gameState');

    sendWs(ws2, { type: 'joinMatch', matchId, playerName: 'Bench-P2' });
    const joined = await waitFor(
      ws2,
      (m) => m.type === 'matchJoined' || m.type === 'matchError',
      8000,
    );
    if (joined.type !== 'matchJoined') {
      throw new Error(`joinMatch rejected: ${joined.error ?? joined.code ?? 'unknown'}`);
    }
    const p2Id = joined.playerId as string;

    const [init1, init2] = await Promise.all([gs1Promise, gs2Promise]);
    const setupMs = Date.now() - setupStart;

    const eng = bootstrapEngine(matchId, seed, init1.viewModel, p1Id, p2Id, serverGameOptions);
    const playerIds = [p1Id, p2Id];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let vm1: any = init1.viewModel;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let vm2: any = init2.viewModel;
    let actionCount = 0;

    while (eng.state.phase !== 'gameOver' && actionCount < MAX_TURNS) {
      const activeIdx = eng.state.activePlayerIndex;
      const ts = new Date().toISOString();
      const actions = getValidActions(eng.state, activeIdx, ts);
      const action = pickAction(actions);
      if (!action) break;
      action.timestamp = ts;

      const p1Prom = waitFor(
        ws1,
        (m) =>
          m.type === 'actionError' ||
          m.type === 'matchError' ||
          (m.type === 'gameState' && m.result?.action?.type !== 'system:init'),
      );
      const p2Prom = waitFor(
        ws2,
        (m) =>
          m.type === 'actionError' ||
          m.type === 'matchError' ||
          (m.type === 'gameState' && m.result?.action?.type !== 'system:init'),
      );

      const t0 = Date.now();
      sendWs(playerIds[activeIdx] === p1Id ? ws1 : ws2, {
        type: 'action',
        matchId,
        action,
      });
      actionCount++;

      const [gs1r, gs2r] = await Promise.all([p1Prom, p2Prom]);
      const latencyMs = Date.now() - t0;

      if (gs1r.type === 'actionError' || gs1r.type === 'matchError') {
        throw new Error(`WS error: ${JSON.stringify(gs1r.error)}`);
      }

      timings.push({ actionType: action.type, latencyMs, phase: eng.state.phase });

      // Apply to local engine using server's committed timestamp
      const serverAction = (gs1r.viewModel?.action ?? gs2r.viewModel?.action) as Action | undefined;
      const committed = { ...action, timestamp: serverAction?.timestamp ?? action.timestamp };
      eng.state = engineApply(eng.state, committed, { hashFn: computeStateHash });

      vm1 = gs1r.viewModel;
      vm2 = gs2r.viewModel;
      void vm2;

      await new Promise((r) => setTimeout(r, 5));
    }

    return {
      transport: 'ws',
      seed,
      matchId,
      actionTimings: timings,
      connectMs,
      setupMs,
      totalMs: Date.now() - startMs,
      actionCount,
    };
  } finally {
    ws1?.close();
    ws2?.close();
  }
}

// ---------------------------------------------------------------------------
// REST Game Runner
// WS used only for initial handshake/gameState; all game actions go through HTTP
// ---------------------------------------------------------------------------

async function runRestGame(seed: number): Promise<GameResult> {
  const startMs = Date.now();
  const timings: ActionTiming[] = [];
  let ws1: WebSocket | null = null;
  let ws2: WebSocket | null = null;

  try {
    const connectStart = Date.now();
    ws1 = await connectWs(WS_URL);
    ws2 = await connectWs(WS_URL);
    const connectMs = Date.now() - connectStart;

    const setupStart = Date.now();
    sendWs(ws1, {
      type: 'createMatch',
      playerName: 'Bench-P1',
      rngSeed: seed,
      gameOptions: { damageMode: 'classic', startingLifepoints: 20 },
    });

    const created = await waitFor(
      ws1,
      (m) => m.type === 'matchCreated' || m.type === 'matchError' || m.type === 'error',
      8000,
    );
    if (created.type !== 'matchCreated') {
      throw new Error(`createMatch rejected: ${created.error ?? created.code ?? 'unknown'}`);
    }
    const matchId = created.matchId as string;
    const p1Id = created.playerId as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serverGameOptions: any = created.gameOptions;

    const gs1Promise = waitFor(ws1, (m) => m.type === 'gameState');
    const gs2Promise = waitFor(ws2, (m) => m.type === 'gameState');

    sendWs(ws2, { type: 'joinMatch', matchId, playerName: 'Bench-P2' });
    const joined = await waitFor(
      ws2,
      (m) => m.type === 'matchJoined' || m.type === 'matchError',
      8000,
    );
    if (joined.type !== 'matchJoined') {
      throw new Error(`joinMatch rejected: ${joined.error ?? joined.code ?? 'unknown'}`);
    }
    const p2Id = joined.playerId as string;

    const [init1] = await Promise.all([gs1Promise, gs2Promise]);
    const setupMs = Date.now() - setupStart;

    // Switch to REST — close WS
    ws1.close();
    ws2.close();
    ws1 = null;
    ws2 = null;

    const eng = bootstrapEngine(matchId, seed, init1.viewModel, p1Id, p2Id, serverGameOptions);
    const playerIds = [p1Id, p2Id];
    let actionCount = 0;

    while (eng.state.phase !== 'gameOver' && actionCount < MAX_TURNS) {
      const activeIdx = eng.state.activePlayerIndex;
      const ts = new Date().toISOString();
      const actions = getValidActions(eng.state, activeIdx, ts);
      const action = pickAction(actions);
      if (!action) break;
      action.timestamp = ts;

      const playerId = playerIds[activeIdx]!;

      const t0 = Date.now();
      const res = await fetch(`${HTTP_URL}/api/matches/${matchId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-phalanx-player-id': playerId,
        },
        body: JSON.stringify(action as Action),
      });
      const latencyMs = Date.now() - t0;
      actionCount++;

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`REST ${res.status}: ${body}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const turnVm: any = await res.json();
      timings.push({ actionType: action.type, latencyMs, phase: eng.state.phase });

      // Apply to local engine using server's committed timestamp
      const serverAction = turnVm?.action as Action | undefined;
      const committed = { ...action, timestamp: serverAction?.timestamp ?? action.timestamp };
      eng.state = engineApply(eng.state, committed, { hashFn: computeStateHash });
    }

    return {
      transport: 'rest',
      seed,
      matchId,
      actionTimings: timings,
      connectMs,
      setupMs,
      totalMs: Date.now() - startMs,
      actionCount,
    };
  } finally {
    ws1?.close();
    ws2?.close();
  }
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))]!;
}

function stats(vals: number[]) {
  if (vals.length === 0) return { avg: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0 };
  const sorted = [...vals].sort((a, b) => a - b);
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  return {
    avg: Math.round(avg),
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
  };
}

function heapSnapshot(): HeapSnapshot {
  const h = getHeapStatistics();
  return { heapUsed: h.used_heap_size, heapTotal: h.total_heap_size };
}

function mb(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function printReport(
  label: string,
  results: GameResult[],
  heapBefore: HeapSnapshot,
  heapAfter: HeapSnapshot,
) {
  const ok = results.filter((r) => !r.error);
  const allLat = ok.flatMap((r) => r.actionTimings.map((t) => t.latencyMs));
  const totalActions = ok.reduce((s, r) => s + r.actionCount, 0);
  const totalMs = ok.reduce((s, r) => s + r.totalMs, 0);
  const throughput = totalMs > 0 ? ((totalActions / totalMs) * 1000).toFixed(1) : '0';
  const s = stats(allLat);
  const avgGame = ok.length > 0 ? Math.round(totalMs / ok.length) : 0;
  const avgConnect = Math.round(ok.reduce((s, r) => s + r.connectMs, 0) / (ok.length || 1));
  const avgSetup = Math.round(ok.reduce((s, r) => s + r.setupMs, 0) / (ok.length || 1));
  const heapDelta = (heapAfter.heapUsed - heapBefore.heapUsed) / 1024 / 1024;

  console.log(`\n── ${label} ──────────────────────────────────`);
  console.log(
    `  Games:    ${ok.length}/${results.length} ok   Actions: ${totalActions}   Throughput: ${throughput} act/s`,
  );
  console.log(`  Game time avg: ${avgGame} ms`);
  console.log(
    `  Action latency (ms): min=${s.min} avg=${s.avg} p50=${s.p50} p95=${s.p95} p99=${s.p99} max=${s.max}`,
  );
  console.log(`  Setup: connect avg=${avgConnect} ms   init avg=${avgSetup} ms`);
  console.log(
    `  Heap: ${mb(heapBefore.heapUsed)} → ${mb(heapAfter.heapUsed)}  (Δ ${heapDelta.toFixed(1)} MB)`,
  );
  if (results.some((r) => r.error)) {
    results.filter((r) => r.error).forEach((r) => console.log(`  ERR seed=${r.seed}: ${r.error}`));
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function runBatch(
  label: string,
  runner: (seed: number) => Promise<GameResult>,
): Promise<{ results: GameResult[]; heapBefore: HeapSnapshot; heapAfter: HeapSnapshot }> {
  console.log(`\nRunning ${BATCH} ${label} games...`);
  const heapBefore = heapSnapshot();
  const results: GameResult[] = [];

  for (let i = 0; i < BATCH; i++) {
    // Spread seeds across the number space for variety
    const seed = (Date.now() ^ (i * 0x9e3779b9)) >>> 0;
    process.stdout.write(`  [${i + 1}/${BATCH}] seed=${seed} ... `);
    try {
      const r = await runner(seed);
      results.push(r);
      console.log(`ok  ${r.actionCount} actions  ${r.totalMs} ms`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        transport: label.toLowerCase() as 'ws' | 'rest',
        seed,
        matchId: '',
        actionTimings: [],
        connectMs: 0,
        setupMs: 0,
        totalMs: 0,
        actionCount: 0,
        error: msg,
      });
      console.log(`FAIL  ${msg.slice(0, 120)}`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  const heapAfter = heapSnapshot();
  return { results, heapBefore, heapAfter };
}

async function main() {
  console.log(`Benchmark: WS vs REST  (batch=${BATCH}, maxTurns=${MAX_TURNS})`);
  console.log(`  WS:   ${WS_URL}`);
  console.log(`  HTTP: ${HTTP_URL}`);

  const wsBatch = await runBatch('WS', runWsGame);
  const restBatch = await runBatch('REST', runRestGame);

  if (JSON_OUTPUT) {
    console.log(JSON.stringify({ ws: wsBatch.results, rest: restBatch.results }, null, 2));
    return;
  }

  console.log('\n════════════════════════════════════════════════');
  console.log('RESULTS');
  console.log('════════════════════════════════════════════════');

  printReport('WebSocket', wsBatch.results, wsBatch.heapBefore, wsBatch.heapAfter);
  printReport(
    'REST (WS init + HTTP actions)',
    restBatch.results,
    restBatch.heapBefore,
    restBatch.heapAfter,
  );

  const wsLat = wsBatch.results.flatMap((r) => r.actionTimings.map((t) => t.latencyMs));
  const restLat = restBatch.results.flatMap((r) => r.actionTimings.map((t) => t.latencyMs));

  if (wsLat.length > 0 && restLat.length > 0) {
    const ws = stats(wsLat);
    const rs = stats(restLat);
    const wsOk = wsBatch.results.filter((r) => !r.error);
    const rsOk = restBatch.results.filter((r) => !r.error);
    const wsMs = wsOk.reduce((s, r) => s + r.totalMs, 0);
    const rsMs = rsOk.reduce((s, r) => s + r.totalMs, 0);
    const wsTput = wsMs > 0 ? ((wsLat.length / wsMs) * 1000).toFixed(1) : '0';
    const rsTput = rsMs > 0 ? ((restLat.length / rsMs) * 1000).toFixed(1) : '0';
    const wsHeapDelta = (wsBatch.heapAfter.heapUsed - wsBatch.heapBefore.heapUsed) / 1024 / 1024;
    const rsHeapDelta =
      (restBatch.heapAfter.heapUsed - restBatch.heapBefore.heapUsed) / 1024 / 1024;

    console.log('\n── Comparison ───────────────────────────────────');
    console.log(
      `  Latency p50:   WS=${ws.p50} ms   REST=${rs.p50} ms   ratio=${rs.p50 > 0 ? (ws.p50 / rs.p50).toFixed(2) : 'N/A'}`,
    );
    console.log(
      `  Latency p95:   WS=${ws.p95} ms   REST=${rs.p95} ms   ratio=${rs.p95 > 0 ? (ws.p95 / rs.p95).toFixed(2) : 'N/A'}`,
    );
    console.log(`  Throughput:    WS=${wsTput} act/s   REST=${rsTput} act/s`);
    console.log(
      `  Heap growth:   WS=${wsHeapDelta.toFixed(1)} MB   REST=${rsHeapDelta.toFixed(1)} MB`,
    );

    if (wsHeapDelta > rsHeapDelta * 1.5 && wsHeapDelta > 5) {
      console.log(
        '  NOTE: WS heap growth > 1.5x REST — inspect WS listener retention or per-game state.',
      );
    }
  }
}

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
