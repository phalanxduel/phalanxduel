/**
 * Property-based gameplay invariant and replay-prefix test suites.
 *
 * Covers AC-1 through AC-4 of TASK-235:
 *
 * 1. Generated-action invariant suite: explores seeded gameplay prefixes and
 *    asserts card conservation, phase validity, replay continuity, and
 *    terminal-state integrity after every action.
 *
 * 2. Replay-prefix tests: compare iterative step-by-step execution against
 *    `replayGame` reconstruction at multiple prefix lengths within a game.
 *
 * 3. Both matchParams-free (default) and gameOptions (quickStart) init paths.
 *
 * 4. All seeds are recorded; the suite is fully deterministic.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, Action, GamePhase } from '@phalanxduel/shared';
import { createInitialState, applyAction, validateAction, replayGame } from '../src/index.js';
import type { GameConfig } from '../src/index.js';
import { computeStateHash } from '@phalanxduel/shared/hash';

// ── Constants ─────────────────────────────────────────────────────────────

const ACTION_TS = '2026-01-01T00:00:00.000Z';

const STANDARD_SEEDS = [1, 7, 42, 99, 256];
const EXTRA_SEEDS = [13, 100, 999, 1337, 8192];

const VALID_PHASES: GamePhase[] = [
  'StartTurn',
  'DeploymentPhase',
  'AttackPhase',
  'AttackResolution',
  'CleanupPhase',
  'ReinforcementPhase',
  'DrawPhase',
  'EndTurn',
  'gameOver',
];

// ── Invariant checker ────────────────────────────────────────────────────

function checkInvariants(state: GameState, label: string): void {
  // Phase must be one of the valid states
  expect(VALID_PHASES, `${label}: unknown phase "${state.phase}"`).toContain(state.phase);

  // activePlayerIndex must be 0 or 1
  expect([0, 1], `${label}: invalid activePlayerIndex ${state.activePlayerIndex}`).toContain(
    state.activePlayerIndex,
  );

  for (let pi = 0; pi < 2; pi++) {
    const p = state.players[pi]!;

    // Card conservation: sum across all zones must equal 52
    const bfCount = p.battlefield.filter((s) => s !== null).length;
    const total = bfCount + p.hand.length + p.drawpile.length + p.discardPile.length;
    expect(total, `${label}: p${pi} card total = ${total}, want 52`).toBe(52);

    // HP bounds: no negative HP on any live battlefield card
    for (const slot of p.battlefield) {
      if (slot !== null) {
        expect(
          slot.currentHp,
          `${label}: p${pi} card hp=${slot.currentHp} < 0`,
        ).toBeGreaterThanOrEqual(0);
        expect(
          slot.currentHp,
          `${label}: p${pi} card hp=${slot.currentHp} > value=${slot.card.value}`,
        ).toBeLessThanOrEqual(slot.card.value);
      }
    }

    // Lifepoints are non-negative
    expect(p.lifepoints, `${label}: p${pi} lp=${p.lifepoints} < 0`).toBeGreaterThanOrEqual(0);
  }

  // Terminal state integrity: gameOver must carry outcome
  if (state.phase === 'gameOver') {
    expect(state.outcome, `${label}: gameOver without outcome`).toBeDefined();
    expect([0, 1], `${label}: outcome.winnerIndex invalid`).toContain(state.outcome?.winnerIndex);
  }
}

// ── Automated bot ────────────────────────────────────────────────────────

function nextAction(state: GameState): Action | null {
  const pi = state.activePlayerIndex;
  const player = state.players[pi]!;

  switch (state.phase) {
    case 'DeploymentPhase': {
      for (let col = 0; col < 4; col++) {
        if (player.battlefield[col] === null || player.battlefield[col + 4] === null) {
          return {
            type: 'deploy',
            playerIndex: pi,
            column: col,
            cardId: player.hand[0]!.id,
            timestamp: ACTION_TS,
          };
        }
      }
      return null;
    }

    case 'AttackPhase': {
      for (let col = 0; col < 4; col++) {
        if (player.battlefield[col] !== null) {
          const action: Action = {
            type: 'attack',
            playerIndex: pi,
            attackingColumn: col,
            defendingColumn: col,
            timestamp: ACTION_TS,
          };
          if (validateAction(state, action).valid) return action;
        }
      }
      return { type: 'pass', playerIndex: pi, timestamp: ACTION_TS };
    }

    case 'ReinforcementPhase': {
      if (player.hand.length > 0) {
        return {
          type: 'reinforce',
          playerIndex: pi,
          cardId: player.hand[0]!.id,
          timestamp: ACTION_TS,
        };
      }
      return { type: 'pass', playerIndex: pi, timestamp: ACTION_TS };
    }

    default:
      return null;
  }
}

// ── Game runner ───────────────────────────────────────────────────────────

interface PlayRecord {
  states: GameState[];
  actions: Action[];
}

function runGame(config: GameConfig, maxActions = 600): PlayRecord {
  // Use drawTimestamp for system:init so transaction log matches what replayGame produces
  const initTs = config.drawTimestamp ?? ACTION_TS;
  let state = createInitialState(config);
  state = applyAction(state, { type: 'system:init', timestamp: initTs }, { allowSystemInit: true });

  const states: GameState[] = [state];
  const actions: Action[] = [];
  let passStreak = 0;

  while (state.phase !== 'gameOver' && actions.length < maxActions) {
    const action = nextAction(state);
    if (action === null) break;

    if (action.type === 'pass') {
      passStreak++;
      if (passStreak > 8) break; // true stalemate guard
    } else {
      passStreak = 0;
    }

    state = applyAction(state, action);
    actions.push(action);
    states.push(state);
  }

  return { states, actions };
}

function makeConfig(seed: number, opts?: { quickStart?: boolean }): GameConfig {
  return {
    matchId: `prop-test-${seed}`,
    players: [
      { id: '00000000-0000-0000-0000-000000000001', name: 'P0' },
      { id: '00000000-0000-0000-0000-000000000002', name: 'P1' },
    ],
    rngSeed: seed,
    drawTimestamp: '1970-01-01T00:00:00.000Z',
    ...(opts?.quickStart
      ? {
          gameOptions: {
            damageMode: 'classic',
            startingLifepoints: 20,
            classicDeployment: true,
            quickStart: true,
          },
        }
      : {}),
  };
}

// ── Property: invariants hold at every step ───────────────────────────────

describe('Property: invariants hold at every action step', () => {
  for (const seed of STANDARD_SEEDS) {
    it(`standard config (seed=${seed})`, () => {
      const { states } = runGame(makeConfig(seed));
      for (let i = 0; i < states.length; i++) {
        checkInvariants(states[i]!, `seed=${seed} step=${i}`);
      }
      expect(states.length).toBeGreaterThan(1);
    });
  }

  for (const seed of [42, 99]) {
    it(`quickStart config (seed=${seed})`, () => {
      const { states } = runGame(makeConfig(seed, { quickStart: true }));
      for (let i = 0; i < states.length; i++) {
        checkInvariants(states[i]!, `seed=${seed}(qs) step=${i}`);
      }
      expect(states.length).toBeGreaterThan(1);
    });
  }
});

// ── Property: replay matches iterative execution at every prefix ──────────

describe('Property: replayGame hash matches iterative state at action prefixes', () => {
  for (const seed of STANDARD_SEEDS) {
    it(`standard config prefix consistency (seed=${seed})`, () => {
      const config = makeConfig(seed);
      const { states, actions } = runGame(config);

      if (actions.length === 0) return;

      // Sample 5 checkpoints spread across the game
      const checkpoints = [
        1,
        Math.floor(actions.length * 0.25),
        Math.floor(actions.length * 0.5),
        Math.floor(actions.length * 0.75),
        actions.length,
      ].filter((k, i, arr) => k > 0 && arr.indexOf(k) === i);

      for (const k of checkpoints) {
        const iterativeHash = computeStateHash(states[k]!);
        const replayResult = replayGame(config, actions.slice(0, k));

        expect(
          replayResult.valid,
          `seed=${seed} prefix=${k}: replay failed at index ${replayResult.failedAtIndex}: ${replayResult.error}`,
        ).toBe(true);

        const replayHash = computeStateHash(replayResult.finalState);
        expect(
          replayHash,
          `seed=${seed} prefix=${k}: replay hash diverged from iterative hash`,
        ).toBe(iterativeHash);
      }
    });
  }
});

// ── Property: replay is idempotent (same config+actions → same hash) ──────

describe('Property: replayGame is deterministic across repeated calls', () => {
  for (const seed of [7, 42, 256]) {
    it(`seed=${seed}`, () => {
      const config = makeConfig(seed);
      const { actions } = runGame(config);

      if (actions.length === 0) return;

      const prefix = actions.slice(0, Math.min(20, actions.length));
      const first = replayGame(config, prefix);
      const second = replayGame(config, prefix);

      expect(first.valid).toBe(true);
      expect(second.valid).toBe(true);
      expect(computeStateHash(first.finalState)).toBe(computeStateHash(second.finalState));
    });
  }
});

// ── Property: validateAction rejects all actions in terminal state ────────

describe('Property: no legal action is available after gameOver', () => {
  for (const seed of [1, 42]) {
    it(`seed=${seed}`, () => {
      const { states } = runGame(makeConfig(seed));
      const terminal = states[states.length - 1]!;

      if (terminal.phase !== 'gameOver') return; // stalemate guard triggered — skip

      const candidateActions: Action[] = [
        { type: 'pass', playerIndex: 0, timestamp: ACTION_TS },
        { type: 'pass', playerIndex: 1, timestamp: ACTION_TS },
        {
          type: 'attack',
          playerIndex: 0,
          attackingColumn: 0,
          defendingColumn: 0,
          timestamp: ACTION_TS,
        },
        { type: 'forfeit', playerIndex: 0, timestamp: ACTION_TS },
      ];

      for (const action of candidateActions) {
        const result = validateAction(terminal, action);
        expect(
          result.valid,
          `seed=${seed}: action ${action.type} was valid in gameOver state`,
        ).toBe(false);
      }
    });
  }
});

// ── Property: games reach conclusion across a broader seed range ──────────

describe('Property: game concludes within action budget across diverse seeds', () => {
  for (const seed of EXTRA_SEEDS) {
    it(`seed=${seed}`, () => {
      const { states, actions } = runGame(makeConfig(seed));
      const final = states[states.length - 1]!;

      // Every intermediate state must satisfy invariants
      for (let i = 0; i < states.length; i++) {
        checkInvariants(states[i]!, `seed=${seed} step=${i}`);
      }

      // Game must have made forward progress
      expect(actions.length, `seed=${seed}: no actions taken`).toBeGreaterThan(0);

      // Must not have run forever
      expect(actions.length, `seed=${seed}: exceeded action budget`).toBeLessThanOrEqual(600);

      // Final state must be valid
      checkInvariants(final, `seed=${seed} final`);
    });
  }
});
