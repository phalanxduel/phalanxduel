#!/usr/bin/env tsx
/**
 * Cluster Verification — TASK-99 (PHX-LEDGER-005)
 *
 * Proves the Distributed Ledger Architecture (TASK-94/98) works across multiple
 * nodes by running a full game with:
 *   - Player 1 connected to Server A (port 3001)
 *   - Player 2 connected to Server B (port 3002)
 *
 * Both servers share the same Neon Postgres ledger and IEventBus. When P1
 * dispatches an action on Server A, the interrupt-driven sync propagates it
 * to Server B, which broadcasts updated state to P2 — and vice versa.
 *
 * Usage:
 *   tsx bin/qa/cluster-verify.ts
 *   tsx bin/qa/cluster-verify.ts --server-a ws://localhost:3001/ws --server-b ws://localhost:3002/ws
 *   pnpm qa:cluster:verify
 *
 * Prerequisites:
 *   - Two server instances running on --server-a and --server-b URLs
 *   - Both must share the same DATABASE_URL (Neon Postgres)
 *   - See: docker-compose.cluster.yml (or run bin/qa/cluster-verify.ts --help)
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import WebSocket from 'ws';
import { randomUUID } from 'node:crypto';
import { parseArgs, type ParseArgsConfig } from 'node:util';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServerMsg = Record<string, any>;

interface VerifyResult {
  status: 'pass' | 'fail';
  matchId: string | null;
  turnCount: number;
  actionCount: number;
  outcome: string | null;
  finalStateHashA: string | null;
  finalStateHashB: string | null;
  durationMs: number;
  failureReason?: string;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argConfig: ParseArgsConfig = {
  options: {
    'server-a': { type: 'string', default: 'ws://127.0.0.1:3001/ws' },
    'server-b': { type: 'string', default: 'ws://127.0.0.1:3002/ws' },
    'max-turns': { type: 'string', default: '300' },
    seed: { type: 'string' },
    help: { type: 'boolean', default: false },
  },
  strict: true,
};

function parseOptions() {
  const { values } = parseArgs(argConfig);
  if (values.help) {
    console.log(`
cluster-verify — Cross-node synchronization verification for Phalanx Duel

Tests that Player 1 on Server A and Player 2 on Server B can complete a full
game without state desync, using Postgres LISTEN/NOTIFY as the distributed
event bus.

Options:
  --server-a <url>    WebSocket URL for Server A (default: ws://127.0.0.1:3001/ws)
  --server-b <url>    WebSocket URL for Server B (default: ws://127.0.0.1:3002/ws)
  --max-turns <n>     Maximum turns before declaring timeout (default: 300)
  --seed <n>          Fixed RNG seed for reproducibility
  --help              Show this help

Prerequisites:
  Two server instances sharing the same DATABASE_URL must be running:
    NODE_ENV=production PORT=3001 node dist/index.js
    NODE_ENV=production PORT=3002 node dist/index.js

  Or via Docker Compose:
    docker compose -f docker-compose.cluster.yml up
`);
    process.exit(0);
  }

  return {
    serverA: values['server-a'] as string,
    serverB: values['server-b'] as string,
    maxTurns: Number(values['max-turns'] ?? '300'),
    seed: values.seed ? Number(values.seed) : Math.floor(Math.random() * 100000),
  };
}

// ---------------------------------------------------------------------------
// WebSocket helpers (with message buffering)
// ---------------------------------------------------------------------------

class WsClient {
  private queue: ServerMsg[] = [];
  private waiters: {
    predicate: (msg: ServerMsg) => boolean;
    resolve: (msg: ServerMsg) => void;
    reject: (err: Error) => void;
    timeout: NodeJS.Timeout;
  }[] = [];

  constructor(
    public readonly ws: WebSocket,
    private readonly label: string,
  ) {
    ws.on('message', (data) => {
      const parsed = JSON.parse(data.toString()) as ServerMsg;

      const isPing = parsed.type === 'ping' || parsed.type === 'pong' || parsed.type === 'ack';
      if (!isPing) {
        let details = '';
        if (parsed.type === 'gameState') {
          const seq = (parsed as any).result?.postState?.transactionLog?.length ?? 0;
          const phase =
            (parsed as any).viewModel?.state?.phase ?? (parsed as any).viewModel?.postState?.phase;
          details = ` (seq=${seq}, phase=${phase})`;
        }
        process.stdout.write(`    [${this.label}/RECV] ${parsed.type}${details}\n`);
      }

      if (parsed.type === 'matchError' || parsed.type === 'actionError') {
        process.stderr.write(`\n[${this.label}/ERR] ${parsed.error} (${(parsed as any).code})\n`);
      }

      // Check if any waiter is interested
      for (let i = 0; i < this.waiters.length; i++) {
        const waiter = this.waiters[i];
        if (waiter.predicate(parsed)) {
          clearTimeout(waiter.timeout);
          this.waiters.splice(i, 1);
          waiter.resolve(parsed);
          return;
        }
      }

      // Otherwise buffer it
      this.queue.push(parsed);
      if (this.queue.length > 200) this.queue.shift(); // Bound it
    });
  }

  async waitFor(
    predicate: (msg: ServerMsg) => boolean | string,
    timeoutMs = 30000,
  ): Promise<ServerMsg> {
    const fn = typeof predicate === 'string' ? (m: ServerMsg) => m.type === predicate : predicate;

    // Check queue first
    const idx = this.queue.findIndex(fn);
    if (idx !== -1) {
      return this.queue.splice(idx, 1)[0]!;
    }

    // Otherwise wait
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const waiterIdx = this.waiters.findIndex((w) => w.timeout === timeout);
        if (waiterIdx !== -1) this.waiters.splice(waiterIdx, 1);
        reject(new Error(`[${this.label}] Timed out waiting for message (${timeoutMs}ms)`));
      }, timeoutMs);

      this.waiters.push({ predicate: fn, resolve, reject, timeout });
    });
  }

  send(msg: any) {
    if (!msg.msgId) msg.msgId = randomUUID();
    this.ws.send(JSON.stringify(msg));
  }
}

async function connectWsClient(url: string, label: string): Promise<WsClient> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { headers: { origin: 'http://127.0.0.1:3001' } });
    ws.on('open', () => resolve(new WsClient(ws, label)));
    ws.on('error', (err: Error) =>
      reject(new Error(`Failed to connect to ${url}: ${err.message}`)),
    );
  });
}

// ---------------------------------------------------------------------------
// Action picker (random, avoid forfeit)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickRandom(validActions: any[]): any {
  const playable = validActions.filter((a: { type: string }) => a.type !== 'forfeit');
  if (playable.length === 0) return null;
  return playable[Math.floor(Math.random() * playable.length)];
}

// ---------------------------------------------------------------------------
// Main verification logic
// ---------------------------------------------------------------------------

async function runVerification(opts: ReturnType<typeof parseOptions>): Promise<VerifyResult> {
  const startMs = Date.now();
  let matchId: string | null = null;
  let client1: WsClient | null = null;
  let client2: WsClient | null = null;
  let turnCount = 0;
  let actionCount = 0;
  let outcome: string | null = null;
  let finalStateHashA: string | null = null;
  let finalStateHashB: string | null = null;

  const log = (prefix: string, msg: string) => console.log(`  [${prefix}] ${msg}`);

  try {
    // 1. Connect P1 to Server A, P2 to Server B
    log('SYS', `Connecting P1 → Server A (${opts.serverA})`);
    log('SYS', `Connecting P2 → Server B (${opts.serverB})`);
    client1 = await connectWsClient(opts.serverA, 'P1@A');
    client2 = await connectWsClient(opts.serverB, 'P2@B');
    log('SYS', 'Both connections established');

    // 2. P1 creates match on Server A
    client1.send({
      type: 'createMatch',
      playerName: 'ClusterP1',
      rngSeed: opts.seed,
    });
    const matchCreated = await client1.waitFor('matchCreated');
    matchId = (matchCreated as any).matchId;
    const p1Id = (matchCreated as any).playerId;
    log('P1@A', `Match created: ${matchId}`);

    // 3. P2 joins match on Server B — Server B fetches from Postgres, rehydrates, subscribes to EventBus
    log('SYS', `P2 sending joinMatch to Server B for ${matchId}`);
    client2.send({
      type: 'joinMatch',
      matchId,
      playerName: 'ClusterP2',
    });
    const matchJoined = await client2.waitFor(
      (m) => m.type === 'matchJoined' || m.type === 'matchError',
    );
    if (matchJoined.type === 'matchError') {
      throw new Error(
        `P2 failed to join match on Server B: ${matchJoined.error} (${matchJoined.code})`,
      );
    }
    const p2Id = (matchJoined as any).playerId;
    log('P2@B', `Joined match (playerIndex=${(matchJoined as any).playerIndex})`);

    // 4. Wait for both servers to broadcast initial game state
    log('SYS', 'Waiting for initial game state sync...');
    const [gs1Msg, gs2Msg] = await Promise.all([
      client1.waitFor('gameState'),
      client2.waitFor('gameState'),
    ]);
    log('SYS', 'Both nodes received initial gameState — sync confirmed');

    let vm1 = gs1Msg.viewModel;
    let vm2 = gs2Msg.viewModel;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let p1ValidActions: any[] = vm1?.validActions ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let p2ValidActions: any[] = vm2?.validActions ?? [];
    let currentPhase: string = vm1?.state?.phase ?? vm1?.postState?.phase ?? 'unknown';

    log('SYS', `Initial phase: ${currentPhase}`);

    // 5. Game loop: alternate actions between clusters
    while (currentPhase !== 'gameOver' && actionCount < opts.maxTurns) {
      const activePlayerIdx: number =
        vm1?.state?.activePlayerIndex ?? vm1?.postState?.activePlayerIndex ?? 0;

      const activeWs = activePlayerIdx === 0 ? client1! : client2!;
      const activePlayerId = activePlayerIdx === 0 ? p1Id : p2Id;
      const activeLabel = activePlayerIdx === 0 ? 'P1@A' : 'P2@B';
      const activeActions = activePlayerIdx === 0 ? p1ValidActions : p2ValidActions;

      // Override check — DeploymentPhase may give both players actions
      const p1Playable = p1ValidActions.filter((a: { type: string }) => a.type !== 'forfeit');
      const p2Playable = p2ValidActions.filter((a: { type: string }) => a.type !== 'forfeit');

      let activeFinalActions = activeActions;
      let activeFinalWs = activeWs;
      let activeFinalId = activePlayerId;
      let activeFinalLabel = activeLabel;

      if (activePlayerIdx === 0 && p1Playable.length === 0 && p2Playable.length > 0) {
        activeFinalActions = p2ValidActions;
        activeFinalWs = client2!;
        activeFinalId = p2Id;
        activeFinalLabel = 'P2@B';
      }

      const action = pickRandom(activeFinalActions);
      if (!action) {
        throw new Error(`No valid actions for ${activeFinalLabel} in phase ${currentPhase}`);
      }
      action.timestamp = new Date().toISOString();

      // Throttle slightly
      await new Promise((r) => setTimeout(r, 25));

      // Send action from the acting server
      activeFinalWs.send({
        type: 'action',
        matchId,
        action,
      });
      actionCount++;
      log(activeFinalLabel, `${action.type} (phase=${currentPhase})`);

      // Both nodes must receive the updated state — proves cross-node sync
      const nextGs1 = client1!.waitFor(
        (m) =>
          (m.type === 'gameState' && (m as any).result?.action?.type !== 'system:init') ||
          m.type === 'actionError' ||
          m.type === 'matchError',
        15000,
      );
      const nextGs2 = client2!.waitFor(
        (m) =>
          (m.type === 'gameState' && (m as any).result?.action?.type !== 'system:init') ||
          m.type === 'actionError' ||
          m.type === 'matchError',
        15000,
      );

      const [next1, next2] = await Promise.all([nextGs1, nextGs2]);

      if (next1.type === 'actionError' || next1.type === 'matchError') {
        throw new Error(`Action rejected on Server A: ${next1.error} (${next1.code})`);
      }
      if (next2.type === 'actionError' || next2.type === 'matchError') {
        throw new Error(`Action rejected on Server B: ${next2.error} (${next2.code})`);
      }

      vm1 = next1.viewModel;
      vm2 = next2.viewModel;
      p1ValidActions = vm1?.validActions ?? [];
      p2ValidActions = vm2?.validActions ?? [];

      const newPhase: string = vm1?.state?.phase ?? vm1?.postState?.phase ?? currentPhase;
      if (newPhase !== currentPhase) {
        log('SYS', `Phase transition: ${currentPhase} → ${newPhase}`);
        currentPhase = newPhase;
      }

      if (['attack', 'pass', 'forfeit'].includes(action.type as string)) {
        turnCount++;
      }

      // Verify state hashes match between nodes (desync detection)
      const hashA = (next1.viewModel?.state ?? next1.viewModel?.postState)?.transactionLog?.at(
        -1,
      )?.stateHashAfter;
      const hashB = (next2.viewModel?.state ?? next2.viewModel?.postState)?.transactionLog?.at(
        -1,
      )?.stateHashAfter;

      if (hashA && hashB && hashA !== hashB) {
        throw new Error(
          `STATE_DESYNC: hash mismatch after action #${actionCount} (${action.type})\n` +
            `  Server A: ${hashA}\n` +
            `  Server B: ${hashB}`,
        );
      }

      if (hashA) finalStateHashA = hashA;
      if (hashB) finalStateHashB = hashB;

      if (currentPhase === 'gameOver') {
        const postState = next1.result?.postState ?? vm1?.postState ?? vm1?.state;
        if (postState?.outcome) {
          outcome = `Player ${(postState.outcome.winnerIndex as number) + 1} wins by ${postState.outcome.victoryType} on turn ${postState.outcome.turnNumber}`;
          log('SYS', `Game over: ${outcome}`);
        }
      }
    }

    if (currentPhase !== 'gameOver') {
      return {
        status: 'fail',
        matchId,
        turnCount,
        actionCount,
        outcome: null,
        finalStateHashA,
        finalStateHashB,
        durationMs: Date.now() - startMs,
        failureReason: `Timeout: game did not complete within ${opts.maxTurns} turns`,
      };
    }

    return {
      status: 'pass',
      matchId,
      turnCount,
      actionCount,
      outcome,
      finalStateHashA,
      finalStateHashB,
      durationMs: Date.now() - startMs,
    };
  } catch (err) {
    return {
      status: 'fail',
      matchId,
      turnCount,
      actionCount,
      outcome: null,
      finalStateHashA,
      finalStateHashB,
      durationMs: Date.now() - startMs,
      failureReason: err instanceof Error ? err.message : String(err),
    };
  } finally {
    if (client1?.ws.readyState === WebSocket.OPEN) client1.ws.close();
    if (client2?.ws.readyState === WebSocket.OPEN) client2.ws.close();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const opts = parseOptions();

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  Phalanx Duel — Cluster Verification (TASK-99)          ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log(`  Server A:  ${opts.serverA}`);
console.log(`  Server B:  ${opts.serverB}`);
console.log(`  Seed:      ${opts.seed}`);
console.log(`  Max turns: ${opts.maxTurns}`);
console.log('');

const result = await runVerification(opts);

console.log('');
console.log('─────────────────────────────────────────────────────────');
console.log(`  Result:         ${result.status.toUpperCase()}`);
console.log(`  Match ID:       ${result.matchId ?? 'N/A'}`);
console.log(`  Turns:          ${result.turnCount}`);
console.log(`  Actions:        ${result.actionCount}`);
console.log(`  Outcome:        ${result.outcome ?? 'N/A'}`);
console.log(`  Duration:       ${result.durationMs}ms`);
console.log(`  Final hash (A): ${result.finalStateHashA?.slice(0, 16) ?? 'N/A'}…`);
console.log(`  Final hash (B): ${result.finalStateHashB?.slice(0, 16) ?? 'N/A'}…`);

if (result.failureReason) {
  console.error(`\n  FAILURE: ${result.failureReason}\n`);
}

// Hash consistency check
if (result.finalStateHashA && result.finalStateHashB) {
  if (result.finalStateHashA === result.finalStateHashB) {
    console.log('\n  ✅ State hashes match — no desync detected');
  } else {
    console.error('\n  ❌ State hashes DIFFER — nodes are out of sync!');
    process.exit(1);
  }
}

process.exit(result.status === 'pass' ? 0 : 1);
