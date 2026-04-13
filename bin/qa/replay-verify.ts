#!/usr/bin/env tsx
/**
 * Replay Verification Gate — TASK-206
 *
 * Reads playthrough artifacts (game-*.json manifests), reconstructs each match
 * from config + seed, and verifies that:
 *   1. replayGame from config + actions produces a valid result
 *   2. Two independent replays produce identical state hashes (determinism)
 *   3. Hash chain entries are continuous (each stateHashBefore === prev stateHashAfter)
 *
 * Can also run in standalone mode (--standalone) without artifacts, using
 * the simulation engine to play and replay games from random seeds.
 *
 * Usage:
 *   tsx bin/qa/replay-verify.ts --standalone --count 10
 *   tsx bin/qa/replay-verify.ts --dir artifacts/playthrough-api/<run-id>
 */

import { parseArgs } from 'node:util';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  createInitialState,
  applyAction,
  replayGame,
  getValidActions,
} from '../../engine/src/index.ts';
import type { GameConfig } from '../../engine/src/index.ts';
import type { GameState, Action } from '../../shared/src/index.ts';
import { computeStateHash } from '../../shared/src/hash.ts';

const TS = '1970-01-01T00:00:00.000Z';

const { values } = parseArgs({
  options: {
    dir: { type: 'string' },
    standalone: { type: 'boolean', default: false },
    count: { type: 'string', default: '20' },
    seed: { type: 'string' },
  },
});

interface VerifyResult {
  label: string;
  valid: boolean;
  deterministic: boolean;
  actionCount: number;
  error?: string;
}

/**
 * Play a full game using automated strategy, collecting actions.
 */
function playGame(
  config: GameConfig,
  maxActions = 500,
): { actions: Action[]; finalState: GameState } {
  let state = createInitialState({ ...config, drawTimestamp: TS });
  state = applyAction(
    state,
    { type: 'system:init', timestamp: TS },
    { hashFn: computeStateHash, allowSystemInit: true },
  );

  const actions: Action[] = [];
  let consecutivePasses = 0;

  while (state.phase !== 'gameOver' && actions.length < maxActions) {
    const validActions = getValidActions(state, state.activePlayerIndex, TS);
    if (validActions.length === 0) break;

    // Pick first valid action (deterministic strategy)
    const action = validActions[0]!;
    actions.push(action);
    state = applyAction(state, action, { hashFn: computeStateHash });

    if (action.type === 'pass') {
      consecutivePasses++;
      if (consecutivePasses >= 4) break; // stalemate
    } else {
      consecutivePasses = 0;
    }
  }

  return { actions, finalState: state };
}

/**
 * Verify a single game: play it, replay it twice, compare hashes.
 */
function verifyGame(seed: number, damageMode: 'classic' | 'cumulative', lp: number): VerifyResult {
  const label = `seed=${seed} mode=${damageMode} lp=${lp}`;
  const config: GameConfig = {
    matchId: `replay-verify-${seed}`,
    players: [
      { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
      { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
    ],
    rngSeed: seed,
    drawTimestamp: TS,
    gameOptions: {
      damageMode,
      startingLifepoints: lp,
      classicDeployment: true,
      quickStart: false,
    },
  };

  try {
    // Play the game
    const { actions } = playGame(config);

    // Replay twice independently
    const replay1 = replayGame(config, actions, { hashFn: computeStateHash });
    const replay2 = replayGame(config, actions, { hashFn: computeStateHash });

    if (!replay1.valid) {
      return {
        label,
        valid: false,
        deterministic: false,
        actionCount: actions.length,
        error: `Replay 1 failed at index ${replay1.failedAtIndex}: ${replay1.error}`,
      };
    }
    if (!replay2.valid) {
      return {
        label,
        valid: false,
        deterministic: false,
        actionCount: actions.length,
        error: `Replay 2 failed at index ${replay2.failedAtIndex}: ${replay2.error}`,
      };
    }

    const hash1 = computeStateHash(replay1.finalState);
    const hash2 = computeStateHash(replay2.finalState);
    const deterministic = hash1 === hash2;

    // Verify transaction log hash chain
    const txLog = replay1.finalState.transactionLog ?? [];
    let chainValid = true;
    let chainError: string | undefined;
    for (let i = 1; i < txLog.length; i++) {
      const prev = txLog[i - 1]!;
      const curr = txLog[i]!;
      if (curr.stateHashBefore !== prev.stateHashAfter) {
        chainValid = false;
        chainError = `Hash chain break at index ${i}: expected ${prev.stateHashAfter}, got ${curr.stateHashBefore}`;
        break;
      }
    }

    return {
      label,
      valid: chainValid,
      deterministic,
      actionCount: actions.length,
      error: !deterministic
        ? `Hash mismatch: ${hash1.slice(0, 12)} vs ${hash2.slice(0, 12)}`
        : chainError,
    };
  } catch (err) {
    return {
      label,
      valid: false,
      deterministic: false,
      actionCount: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Read manifests from playthrough artifact directory and verify each game.
 */
async function verifyFromArtifacts(dir: string): Promise<VerifyResult[]> {
  const files = await readdir(dir);
  const gameFiles = files.filter((f) => f.startsWith('game-') && f.endsWith('.json'));
  const results: VerifyResult[] = [];

  for (const file of gameFiles) {
    const content = await readFile(join(dir, file), 'utf-8');
    const manifest = JSON.parse(content) as {
      seed: number;
      damageMode: string;
      startingLifepoints: number;
      status: string;
    };

    if (manifest.status !== 'success') continue;

    const result = verifyGame(
      manifest.seed,
      manifest.damageMode as 'classic' | 'cumulative',
      manifest.startingLifepoints,
    );
    results.push(result);
  }

  return results;
}

/**
 * Run standalone verification with random seeds.
 */
function verifyStandalone(count: number, baseSeed: number): VerifyResult[] {
  const results: VerifyResult[] = [];
  const modes: Array<'classic' | 'cumulative'> = ['classic', 'cumulative'];

  for (let i = 0; i < count; i++) {
    const seed = baseSeed + i;
    const mode = modes[i % 2]!;
    const lp = i % 3 === 0 ? 10 : 20;
    results.push(verifyGame(seed, mode, lp));
  }

  return results;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║          Replay Verification Gate (TASK-206)        ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  let results: VerifyResult[];

  if (values.dir) {
    console.log(`Reading artifacts from: ${values.dir}\n`);
    results = await verifyFromArtifacts(values.dir);
  } else {
    const count = parseInt(values.count ?? '20', 10);
    const baseSeed = values.seed ? parseInt(values.seed, 10) : 1;
    console.log(`Standalone mode: ${count} games starting at seed ${baseSeed}\n`);
    results = verifyStandalone(count, baseSeed);
  }

  let passed = 0;
  let failed = 0;

  for (const r of results) {
    const status = r.valid && r.deterministic ? '✅' : '❌';
    if (r.valid && r.deterministic) {
      passed++;
    } else {
      failed++;
    }
    const detail = r.error ? ` — ${r.error}` : '';
    console.log(`  ${status} ${r.label} (${r.actionCount} actions)${detail}`);
  }

  console.log(`\n  Results: ${passed}/${results.length} passed, ${failed} failed`);

  if (failed > 0) {
    console.error('\n❌ REPLAY VERIFICATION FAILED');
    process.exit(1);
  }

  console.log('\n✅ All replays verified — determinism confirmed');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
