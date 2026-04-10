/**
 * TASK-106: Durable Audit Trail — Hash chain integrity tests.
 *
 * Verifies that the engine produces a continuous hash chain where each
 * transaction log entry's stateHashBefore equals the previous entry's
 * stateHashAfter. This is the foundation for durable audit persistence.
 */
import { describe, it, expect } from 'vitest';
import { createInitialState, applyAction, computeBotAction } from '../src/index.ts';
import { computeStateHash } from '@phalanxduel/shared/hash';
import type { GameState, TransactionLogEntry } from '@phalanxduel/shared';

const MATCH_ID = '00000000-0000-0000-0000-000000000106';
const TS = '2026-01-01T00:00:00.000Z';
const PLAYERS: [{ id: string; name: string }, { id: string; name: string }] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
];

/** Hash state the same way the engine does — excluding transactionLog */
function hashStateForAudit(state: GameState): string {
  const { transactionLog, ...rest } = state;
  void transactionLog;
  return computeStateHash(rest);
}

function freshState(seed = 42): GameState {
  return createInitialState({
    matchId: MATCH_ID,
    players: PLAYERS,
    rngSeed: seed,
    drawTimestamp: TS,
  });
}

function applyWithHash(state: GameState, action: Parameters<typeof applyAction>[1]): GameState {
  return applyAction(state, action, { hashFn: computeStateHash });
}

function getLog(state: GameState): TransactionLogEntry[] {
  return state.transactionLog ?? [];
}

describe('Audit Trail — Hash Chain Integrity', () => {
  it('system:init produces a transaction log entry with valid hashes', () => {
    const initial = freshState();
    const state = applyWithHash(initial, { type: 'system:init', timestamp: TS });
    const log = getLog(state);

    expect(log.length).toBeGreaterThanOrEqual(1);
    const entry = log[0]!;
    expect(entry.stateHashBefore).toMatch(/^[0-9a-f]{64}$/);
    expect(entry.stateHashAfter).toMatch(/^[0-9a-f]{64}$/);
    expect(entry.stateHashBefore).not.toBe(entry.stateHashAfter);
  });

  it('hash chain is continuous through deployment phase', () => {
    const initial = freshState();
    let state = applyWithHash(initial, { type: 'system:init', timestamp: TS });

    // Deploy 4 cards (2 per player)
    for (let i = 0; i < 4; i++) {
      const activeIdx = state.activePlayerIndex;
      const card = state.players[activeIdx]!.hand[0]!;
      state = applyWithHash(state, {
        type: 'deploy',
        playerIndex: activeIdx,
        column: i % state.params.columns,
        cardId: card.id,
        timestamp: TS,
      });
    }

    assertHashChainContinuity(getLog(state));
  });

  it('hash chain is continuous through a full game', () => {
    const initial = createInitialState({
      matchId: MATCH_ID,
      players: PLAYERS,
      rngSeed: 99,
      gameOptions: {
        damageMode: 'classic',
        startingLifepoints: 20,
        classicDeployment: true,
        quickStart: true,
      },
      drawTimestamp: TS,
    });

    let state = applyWithHash(initial, { type: 'system:init', timestamp: TS });
    let actionCount = 0;
    const maxActions = 500;

    while (state.phase !== 'gameOver' && actionCount < maxActions) {
      const activeIdx = state.activePlayerIndex as 0 | 1;
      const action = computeBotAction(
        state,
        activeIdx,
        {
          strategy: 'heuristic',
          seed: 99 + actionCount,
        },
        TS,
      );
      state = applyWithHash(state, action);
      actionCount++;
    }

    expect(state.phase).toBe('gameOver');

    const log = getLog(state);
    expect(log.length).toBeGreaterThan(1);

    assertHashChainContinuity(log);

    // Final hash matches independent computation (excluding transactionLog, same as engine)
    const computedFinalHash = hashStateForAudit(state);
    const lastEntry = log[log.length - 1]!;
    expect(lastEntry.stateHashAfter).toBe(computedFinalHash);
  });

  it('stateHashBefore of first entry matches hash of initial state', () => {
    const initial = freshState();
    const preHash = hashStateForAudit(initial);
    const state = applyWithHash(initial, { type: 'system:init', timestamp: TS });
    const log = getLog(state);

    expect(log[0]!.stateHashBefore).toBe(preHash);
  });

  it('each stateHashAfter matches independent recomputation', () => {
    const initial = createInitialState({
      matchId: MATCH_ID,
      players: PLAYERS,
      rngSeed: 42,
      gameOptions: {
        damageMode: 'classic',
        startingLifepoints: 20,
        classicDeployment: true,
        quickStart: true,
      },
      drawTimestamp: TS,
    });

    let state = applyWithHash(initial, { type: 'system:init', timestamp: TS });

    // Play a few turns
    for (let i = 0; i < 5 && state.phase !== 'gameOver'; i++) {
      const activeIdx = state.activePlayerIndex as 0 | 1;
      const action = computeBotAction(
        state,
        activeIdx,
        {
          strategy: 'random',
          seed: 42 + i,
        },
        TS,
      );
      state = applyWithHash(state, action);
    }

    // Verify: the stateHashAfter of the last entry matches the current state (sans transactionLog)
    const log = getLog(state);
    const lastEntry = log[log.length - 1]!;
    const currentHash = hashStateForAudit(state);
    expect(lastEntry.stateHashAfter).toBe(currentHash);
  });
});

function assertHashChainContinuity(log: TransactionLogEntry[]): void {
  expect(log.length).toBeGreaterThan(1);

  for (let i = 1; i < log.length; i++) {
    const prev = log[i - 1]!;
    const curr = log[i]!;
    expect(curr.stateHashBefore).toBe(prev.stateHashAfter);
    expect(curr.sequenceNumber).toBe(prev.sequenceNumber + 1);
  }
}
