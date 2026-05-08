#!/usr/bin/env tsx
/**
 * Performance Regression Gate — TASK-287
 *
 * Measures in-process MatchActor transition latency (p99).
 * Fails if p99 latency > 10ms.
 *
 * Usage:
 *   tsx bin/qa/verify-perf.ts [options]
 *
 * Options:
 *   --batch <n>       Number of games to simulate (default: 10)
 *   --threshold <ms>  Max allowed p99 latency in ms (default: 10)
 *   --warmup <n>      Number of warmup games (default: 2)
 */

import { parseArgs } from 'node:util';
import { MatchActor } from '../../server/src/match-actor.ts';
import { InMemoryLedgerStore } from '../../server/src/db/ledger-store.ts';
import { createInitialState, applyAction, computeBotAction } from '../../engine/src/index.ts';
import { computeStateHash } from '../../shared/src/hash.ts';
import type { Action } from '../../shared/src/index.ts';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2).filter((a) => a !== '--');
const { values } = parseArgs({
  args: argv,
  options: {
    batch: { type: 'string', default: '10' },
    threshold: { type: 'string', default: '10' },
    warmup: { type: 'string', default: '2' },
    verbose: { type: 'boolean', default: false },
  },
  strict: true,
});

const BATCH = Number(values.batch);
const THRESHOLD = Number(values.threshold);
const WARMUP = Number(values.warmup);
const VERBOSE = values.verbose;

// ---------------------------------------------------------------------------
// Benchmarking
// ---------------------------------------------------------------------------

interface PerfStats {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  count: number;
}

function calculateStats(latencies: number[]): PerfStats {
  if (latencies.length === 0) {
    return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0, count: 0 };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = latencies.reduce((a, b) => a + b, 0);
  const avg = sum / latencies.length;

  const getPercentile = (p: number) => {
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(idx, sorted.length - 1))]!;
  };

  return {
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    avg,
    p50: getPercentile(50),
    p95: getPercentile(95),
    p99: getPercentile(99),
    count: latencies.length,
  };
}

async function runSimulation(batchSize: number, label: string): Promise<number[]> {
  const latencies: number[] = [];
  const ledgerStore = new InMemoryLedgerStore();

  for (let i = 0; i < batchSize; i++) {
    const matchId = `perf-${label}-${i}`;
    const seed = Date.now() ^ (i * 0x9e3779b9);
    const actor = new MatchActor(matchId, ledgerStore);

    const players = [
      { playerId: 'p1', playerName: 'Bot-1' },
      { playerId: 'p2', playerName: 'Bot-2' },
    ];

    const startTs = Date.now();
    await actor.initializeGame({ players, createdAt: startTs }, () => {});

    let state = actor.state!;
    const applyOptions = {
      hashFn: computeStateHash,
      allowSystemInit: true,
    };

    while (state.phase !== 'gameOver') {
      const activeIdx = state.activePlayerIndex as 0 | 1;
      const turnSeed = seed + state.turnNumber + activeIdx;
      
      // We don't benchmark bot strategy computation, only MatchActor.dispatchAction
      const action = computeBotAction(state, activeIdx, {
        strategy: 'heuristic',
        seed: turnSeed,
      });

      const t0 = performance.now();
      await actor.dispatchAction(players[activeIdx]!.playerId, action, 
        players.map((p, idx) => ({ playerId: p.playerId, playerIndex: idx })),
        { onSuccess: () => {}, onError: (err) => { throw err; } }
      );
      const t1 = performance.now();
      
      const latency = t1 - t0;
      latencies.push(latency);
      state = actor.state!;

      if (state.turnNumber > 200) break; // Safety break
    }
  }

  return latencies;
}

async function main() {
  console.log(`\nPerformance Regression Gate (Threshold: ${THRESHOLD}ms p99)`);
  console.log(`Settings: batch=${BATCH}, warmup=${WARMUP}\n`);

  if (WARMUP > 0) {
    process.stdout.write(`Warming up (${WARMUP} games)... `);
    await runSimulation(WARMUP, 'warmup');
    console.log('done.');
  }

  process.stdout.write(`Benchmarking (${BATCH} games)... `);
  const tStart = performance.now();
  const latencies = await runSimulation(BATCH, 'bench');
  const tEnd = performance.now();
  console.log('done.');

  const s = calculateStats(latencies);
  const totalDuration = (tEnd - tStart) / 1000;
  const throughput = latencies.length / totalDuration;

  console.log('\nResults:');
  console.log(`  Actions:    ${s.count}`);
  console.log(`  Duration:   ${totalDuration.toFixed(2)}s`);
  console.log(`  Throughput: ${throughput.toFixed(1)} actions/s`);
  console.log(`\nLatency (ms):`);
  console.log(`  min: ${s.min.toFixed(3)}`);
  console.log(`  avg: ${s.avg.toFixed(3)}`);
  console.log(`  p50: ${s.p50.toFixed(3)}`);
  console.log(`  p95: ${s.p95.toFixed(3)}`);
  console.log(`  p99: ${s.p99.toFixed(3)}`);
  console.log(`  max: ${s.max.toFixed(3)}`);

  if (s.p99 > THRESHOLD) {
    console.error(`\n❌ FAILURE: p99 latency ${s.p99.toFixed(3)}ms exceeds threshold ${THRESHOLD}ms`);
    process.exit(1);
  } else {
    console.log(`\n✅ PASS: p99 latency ${s.p99.toFixed(3)}ms is within threshold ${THRESHOLD}ms`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('\nBenchmark failed with error:', err);
  process.exit(1);
});
