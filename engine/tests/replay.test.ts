import { describe, it, expect } from 'vitest';
import { createInitialState, drawCards, applyAction, replayGame, getDeployTarget } from '../src/index';
import type { GameConfig } from '../src/index';
import type { Action } from '@phalanxduel/shared';

const testConfig: GameConfig = {
  players: [
    { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
    { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
  ],
  rngSeed: 42,
};

const perTurnConfig: GameConfig = {
  ...testConfig,
  gameOptions: { damageMode: 'per-turn' },
};

/** Deterministic hash for testing */
const testHash = (s: unknown) => `hash-${JSON.stringify(s).length}`;

/**
 * Helper: set up a deployment-ready state and build a list of 16 deploy actions.
 */
function buildDeploymentActions(config: GameConfig): Action[] {
  let state = createInitialState(config);
  state = drawCards(drawCards(state, 0, 12), 1, 12);
  state = { ...state, phase: 'deployment', activePlayerIndex: 0 };

  const actions: Action[] = [];
  for (let i = 0; i < 16; i++) {
    const playerIndex = state.activePlayerIndex;
    const player = state.players[playerIndex]!;
    const card = player.hand[0]!;
    let col = 0;
    while (col < 4) {
      if (getDeployTarget(player.battlefield, col) !== null) break;
      col++;
    }
    const action: Action = {
      type: 'deploy',
      playerIndex,
      card: { suit: card.suit, rank: card.rank },
      column: col,
    };
    actions.push(action);
    state = applyAction(state, action);
  }
  return actions;
}

describe('PHX-TXLOG-003: Game is replayable from initial config + ordered actions', () => {
  it('replayGame with valid deploy actions produces matching state', () => {
    const actions = buildDeploymentActions(testConfig);

    // Apply actions manually to get expected state
    let expected = createInitialState(testConfig);
    expected = drawCards(drawCards(expected, 0, 12), 1, 12);
    expected = { ...expected, phase: 'deployment' };
    for (const action of actions) {
      expected = applyAction(expected, action);
    }

    // Replay
    const result = replayGame(testConfig, actions);

    expect(result.valid).toBe(true);
    expect(result.failedAtIndex).toBeUndefined();
    expect(result.error).toBeUndefined();
    // Both should be in combat phase after 16 deploys
    expect(result.finalState.phase).toBe('combat');
    expect(expected.phase).toBe('combat');
    // Same number of transaction log entries
    expect(result.finalState.transactionLog?.length).toBe(expected.transactionLog?.length);
  });

  it('replayGame with invalid action returns valid: false at correct index', () => {
    const actions = buildDeploymentActions(testConfig);

    // Corrupt action at index 5 — wrong player tries to deploy
    const corruptActions = [...actions];
    const original = corruptActions[5]!;
    corruptActions[5] = {
      ...original,
      playerIndex: original.playerIndex === 0 ? 1 : 0, // wrong player
    } as Action;

    const result = replayGame(testConfig, corruptActions);

    expect(result.valid).toBe(false);
    expect(result.failedAtIndex).toBe(5);
    expect(result.error).toBeDefined();
  });

  it('replayGame with empty actions list returns valid initial state', () => {
    const result = replayGame(testConfig, []);

    expect(result.valid).toBe(true);
    expect(result.finalState.phase).toBe('deployment');
    expect(result.finalState.transactionLog).toEqual([]);
  });

  it('replayGame with hashFn produces entries with non-empty hashes', () => {
    const actions = buildDeploymentActions(testConfig);

    const result = replayGame(testConfig, actions, { hashFn: testHash });

    expect(result.valid).toBe(true);
    const log = result.finalState.transactionLog ?? [];
    expect(log.length).toBe(16);
    for (const entry of log) {
      expect(entry.stateHashBefore.length).toBeGreaterThan(0);
      expect(entry.stateHashAfter.length).toBeGreaterThan(0);
    }
  });

  it('replayed hash chain has integrity (hashAfter[N] === hashBefore[N+1])', () => {
    const actions = buildDeploymentActions(testConfig);

    const result = replayGame(testConfig, actions, { hashFn: testHash });

    const log = result.finalState.transactionLog ?? [];
    for (let i = 0; i < log.length - 1; i++) {
      expect(log[i]!.stateHashAfter).toBe(log[i + 1]!.stateHashBefore);
    }
  });

  it('replay with deploy + combat actions matches individual apply', () => {
    // Build deploy actions then add a pass action in combat
    const deployActions = buildDeploymentActions(testConfig);

    // Manually apply to get combat state and add a pass
    let state = createInitialState(testConfig);
    state = drawCards(drawCards(state, 0, 12), 1, 12);
    state = { ...state, phase: 'deployment' };
    for (const action of deployActions) {
      state = applyAction(state, action);
    }
    expect(state.phase).toBe('combat');

    const passAction: Action = { type: 'pass', playerIndex: state.activePlayerIndex };
    state = applyAction(state, passAction);

    const allActions = [...deployActions, passAction];
    const result = replayGame(testConfig, allActions);

    expect(result.valid).toBe(true);
    expect(result.finalState.transactionLog?.length).toBe(allActions.length);
    expect(result.finalState.phase).toBe(state.phase);
    expect(result.finalState.activePlayerIndex).toBe(state.activePlayerIndex);
  });
});

describe('PHX-DAMAGE-001: Per-turn replay determinism', () => {
  it('replayGame with per-turn config produces matching state', () => {
    const actions = buildDeploymentActions(perTurnConfig);

    // Apply actions manually to get expected state
    let expected = createInitialState(perTurnConfig);
    expected = drawCards(drawCards(expected, 0, 12), 1, 12);
    expected = { ...expected, phase: 'deployment' };
    for (const action of actions) {
      expected = applyAction(expected, action);
    }

    // Replay
    const result = replayGame(perTurnConfig, actions);

    expect(result.valid).toBe(true);
    expect(result.finalState.phase).toBe('combat');
    expect(result.finalState.gameOptions?.damageMode).toBe('per-turn');
    expect(result.finalState.transactionLog?.length).toBe(expected.transactionLog?.length);
  });

  it('per-turn replay with hashFn maintains hash chain integrity', () => {
    const actions = buildDeploymentActions(perTurnConfig);

    const result = replayGame(perTurnConfig, actions, { hashFn: testHash });

    expect(result.valid).toBe(true);
    const log = result.finalState.transactionLog ?? [];
    for (let i = 0; i < log.length - 1; i++) {
      expect(log[i]!.stateHashAfter).toBe(log[i + 1]!.stateHashBefore);
    }
  });
});
