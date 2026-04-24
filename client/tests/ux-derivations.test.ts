import { describe, it, expect } from 'vitest';
import type { GameState, CombatLogEntry, TransactionLogEntry, Action } from '@phalanxduel/shared';
import {
  deriveActionPreview,
  deriveCombatFeedback,
  deriveTurningPoint,
  formatShareText,
  getQuickMatchPlayerName,
} from '../src/ux-derivations';

function makePlayer(name: string, battlefield: unknown[] = [], lp = 20) {
  return {
    player: { name },
    lifepoints: lp,
    hand: [],
    drawpile: [],
    drawpileCount: 0,
    handCount: 0,
    battlefield,
    discardPile: [],
  };
}

function makeCombat(overrides: Partial<CombatLogEntry>): CombatLogEntry {
  return {
    turnNumber: 3,
    attackerPlayerIndex: 0,
    attackerCard: { id: 'atk', face: 'T', suit: 'spades', value: 10, type: 'number' },
    targetColumn: 0,
    baseDamage: 10,
    totalLpDamage: 0,
    steps: [],
    ...overrides,
  };
}

function attackEntry(combat: CombatLogEntry, sequenceNumber = 1): TransactionLogEntry {
  return {
    sequenceNumber,
    action: {
      type: 'attack',
      playerIndex: 0,
      attackingColumn: 0,
      defendingColumn: combat.targetColumn,
      timestamp: '2026-04-24T00:00:00.000Z',
    } as Action,
    stateHashBefore: 'before',
    stateHashAfter: 'after',
    timestamp: '2026-04-24T00:00:00.000Z',
    details: {
      type: 'attack',
      combat,
      reinforcementTriggered: false,
      victoryTriggered: false,
    },
  } as TransactionLogEntry;
}

function makeState(entries: TransactionLogEntry[], overrides: Partial<GameState> = {}): GameState {
  return {
    matchId: '11111111-1111-1111-1111-111111111111',
    specVersion: '1.0',
    params: {
      rows: 2,
      columns: 4,
      modePassRules: { maxConsecutivePasses: 3, maxTotalPassesPerPlayer: 5 },
      modeDamagePersistence: 'cumulative',
      modeVictory: 'standard',
      classicDeployment: true,
      initialDraw: 12,
      maxHandSize: 4,
      startingLifepoints: 20,
    },
    turnNumber: 3,
    phase: 'AttackPhase',
    activePlayerIndex: 0,
    players: [
      makePlayer('Alice', Array(8).fill(null), 20),
      makePlayer('Bob', Array(8).fill(null), 20),
    ],
    transactionLog: entries,
    outcome: { winnerIndex: 0, victoryType: 'lpDepletion', turnNumber: 8 },
    ...overrides,
  } as GameState;
}

describe('ux derivations', () => {
  it('defaults quick match names safely', () => {
    expect(getQuickMatchPlayerName('')).toBe('OPERATIVE');
    expect(getQuickMatchPlayerName('  ')).toBe('OPERATIVE');
    expect(getQuickMatchPlayerName('Nova')).toBe('Nova');
  });

  it('derives combat feedback from combat results', () => {
    expect(
      deriveCombatFeedback(
        makeCombat({
          totalLpDamage: 4,
          steps: [{ target: 'playerLp', damage: 4, lpBefore: 8, lpAfter: 4 }],
        }),
      ),
    ).toBe('LP_DAMAGE');

    expect(
      deriveCombatFeedback(
        makeCombat({
          steps: [
            { target: 'frontCard', damage: 4, destroyed: true },
            { target: 'backCard', damage: 3, destroyed: true },
          ],
        }),
      ),
    ).toBe('COLUMN_BROKEN');
  });

  it('derives a winning exchange preview for a cleared column', () => {
    const state = makeState([], {
      players: [
        makePlayer('Alice', [
          {
            card: { id: 'atk', face: 'K', suit: 'spades', value: 11, type: 'king' },
            position: { row: 0, col: 0 },
            currentHp: 11,
            faceDown: false,
          },
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ]),
        makePlayer('Bob', [
          {
            card: { id: 'def', face: '2', suit: 'hearts', value: 2, type: 'number' },
            position: { row: 0, col: 0 },
            currentHp: 2,
            faceDown: false,
          },
          {
            card: { id: 'back', face: '3', suit: 'clubs', value: 3, type: 'number' },
            position: { row: 1, col: 0 },
            currentHp: 3,
            faceDown: false,
          },
          null,
          null,
          null,
          null,
          null,
          null,
        ]),
      ],
    });

    expect(
      deriveActionPreview(state, {
        type: 'attack',
        playerIndex: 0,
        attackingColumn: 0,
        defendingColumn: 0,
        timestamp: '2026-04-24T00:00:00.000Z',
      } as Action),
    ).toBe('WINNING_EXCHANGE');
  });

  it('derives a first LP-damage turning point', () => {
    const combat = makeCombat({
      turnNumber: 6,
      totalLpDamage: 5,
      steps: [{ target: 'playerLp', damage: 5, lpBefore: 10, lpAfter: 5 }],
    });
    const state = makeState([attackEntry(combat)]);

    const summary = deriveTurningPoint(state);
    expect(summary?.turnNumber).toBe(6);
    expect(summary?.label).toContain('LP damage');
    expect(summary?.why).toContain('First core damage');
    expect(summary?.result).toContain('5 LP damage');
  });

  it('formats share text with the turning point and URL', () => {
    const combat = makeCombat({
      turnNumber: 6,
      totalLpDamage: 5,
      steps: [{ target: 'playerLp', damage: 5, lpBefore: 10, lpAfter: 5 }],
    });
    const state = makeState([attackEntry(combat)]);
    const summary = deriveTurningPoint(state);

    const text = formatShareText(state, summary, 'https://example.test/game', 0);
    expect(text).toContain('Phalanx Duel');
    expect(text).toContain('Result: Win on Turn 8');
    expect(text).toContain('Turning Point: Turn 6');
    expect(text).toContain('https://example.test/game');
  });
});
