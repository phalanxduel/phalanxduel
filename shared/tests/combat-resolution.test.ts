import { describe, it, expect } from 'vitest';
import type { Action, CombatLogEntry, GameState, TransactionLogEntry } from '../src/types.js';
import {
  deriveCombatResolution,
  deriveColumnPressure,
  selectTurningPoint,
} from '../src/combat-resolution.js';

// --- Fixtures ---

function makeCard(
  id: string,
  value: number,
  suit: CombatLogEntry['attackerCard']['suit'] = 'spades',
) {
  return { id, face: String(value) as string, suit, value, type: 'number' as const };
}

function makeBattlefieldCard(id: string, value: number, currentHp?: number, col = 0, row = 0) {
  return {
    card: makeCard(id, value),
    position: { row, col },
    currentHp: currentHp ?? value,
    faceDown: false,
  };
}

function makeCombat(overrides: Partial<CombatLogEntry> = {}): CombatLogEntry {
  return {
    turnNumber: 3,
    attackerPlayerIndex: 0,
    attackerCard: makeCard('atk', 10),
    targetColumn: 0,
    baseDamage: 10,
    totalLpDamage: 0,
    steps: [],
    ...overrides,
  };
}

function attackEntry(
  combat: CombatLogEntry,
  opts: { reinforcementTriggered?: boolean; victoryTriggered?: boolean; seq?: number } = {},
): TransactionLogEntry {
  return {
    sequenceNumber: opts.seq ?? 1,
    action: {
      type: 'attack',
      playerIndex: 0,
      attackingColumn: 0,
      defendingColumn: combat.targetColumn,
      timestamp: '2026-04-30T00:00:00.000Z',
    } as Action,
    stateHashBefore: 'before',
    stateHashAfter: 'after',
    timestamp: '2026-04-30T00:00:00.000Z',
    details: {
      type: 'attack',
      combat,
      reinforcementTriggered: opts.reinforcementTriggered ?? false,
      victoryTriggered: opts.victoryTriggered ?? false,
    },
  } as TransactionLogEntry;
}

function makePlayer(
  name: string,
  battlefield: (ReturnType<typeof makeBattlefieldCard> | null)[] = [],
  lp = 20,
) {
  return {
    player: { id: 'pid', name },
    lifepoints: lp,
    hand: [],
    drawpile: [],
    drawpileCount: 0,
    handCount: 0,
    battlefield: battlefield as GameState['players'][0]['battlefield'],
    discardPile: [],
  };
}

function makeState(
  entries: TransactionLogEntry[] = [],
  overrides: Partial<GameState> = {},
): GameState {
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
      makePlayer('Alice', Array(8).fill(null) as null[], 20),
      makePlayer('Bob', Array(8).fill(null) as null[], 20),
    ] as GameState['players'],
    transactionLog: entries,
    ...overrides,
  } as GameState;
}

// --- deriveCombatResolution ---

describe('deriveCombatResolution', () => {
  describe('type field', () => {
    it('always produces type attack_resolved', () => {
      const ctx = deriveCombatResolution(makeCombat(), {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.type).toBe('attack_resolved');
    });
  });

  describe('modifiers: all 8 CombatBonusType values', () => {
    const bonusTypes = [
      'aceInvulnerable',
      'aceVsAce',
      'diamondDoubleDefense',
      'diamondDeathShield',
      'clubDoubleOverflow',
      'spadeDoubleLp',
      'heartDeathShield',
      'faceCardIneligible',
    ] as const;

    for (const bonus of bonusTypes) {
      it(`maps ${bonus} to a ResolutionModifier with kind === '${bonus}'`, () => {
        const combat = makeCombat({
          steps: [
            {
              target: 'frontCard',
              damage: 5,
              destroyed: false,
              bonuses: [bonus],
            },
          ],
        });
        const ctx = deriveCombatResolution(combat, {
          reinforcementTriggered: false,
          victoryTriggered: false,
        });
        expect(ctx.modifiers).toHaveLength(1);
        expect(ctx.modifiers[0]?.kind).toBe(bonus);
        expect(ctx.modifiers[0]?.appliedTo).toBe('frontCard');
      });
    }

    it('accumulates modifiers across multiple steps', () => {
      const combat = makeCombat({
        steps: [
          { target: 'frontCard', damage: 5, bonuses: ['clubDoubleOverflow'] },
          { target: 'backCard', damage: 10, bonuses: ['spadeDoubleLp'] },
          { target: 'playerLp', damage: 5, bonuses: [] },
        ],
      });
      const ctx = deriveCombatResolution(combat, {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.modifiers).toHaveLength(2);
      expect(ctx.modifiers.map((m) => m.kind)).toEqual(['clubDoubleOverflow', 'spadeDoubleLp']);
    });

    it('produces empty modifiers when no bonuses present', () => {
      const ctx = deriveCombatResolution(makeCombat(), {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.modifiers).toHaveLength(0);
    });
  });

  describe('outcome flags', () => {
    it('defenderFrontDestroyed when front step has destroyed=true', () => {
      const combat = makeCombat({
        steps: [{ target: 'frontCard', damage: 10, destroyed: true }],
      });
      const ctx = deriveCombatResolution(combat, {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.outcome.defenderFrontDestroyed).toBe(true);
      expect(ctx.outcome.defenderBackDestroyed).toBe(false);
    });

    it('defenderBackDestroyed when back step has destroyed=true', () => {
      const combat = makeCombat({
        steps: [
          { target: 'frontCard', damage: 4, destroyed: true },
          { target: 'backCard', damage: 6, destroyed: true },
        ],
      });
      const ctx = deriveCombatResolution(combat, {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.outcome.defenderFrontDestroyed).toBe(true);
      expect(ctx.outcome.defenderBackDestroyed).toBe(true);
    });

    it('playerDamaged when totalLpDamage > 0', () => {
      const combat = makeCombat({ totalLpDamage: 5 });
      const ctx = deriveCombatResolution(combat, {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.outcome.playerDamaged).toBe(true);
      expect(ctx.outcome.breakthroughDamage).toBe(5);
    });

    it('cardAdvanced when front destroyed and back step present', () => {
      const combat = makeCombat({
        steps: [
          { target: 'frontCard', damage: 5, destroyed: true },
          { target: 'backCard', damage: 2, destroyed: false },
        ],
      });
      const ctx = deriveCombatResolution(combat, {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.outcome.cardAdvanced).toBe(true);
    });

    it('cardAdvanced is false when front not destroyed', () => {
      const combat = makeCombat({
        steps: [{ target: 'frontCard', damage: 3, destroyed: false }],
      });
      const ctx = deriveCombatResolution(combat, {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.outcome.cardAdvanced).toBe(false);
    });

    it('reinforcementRequired from opts', () => {
      const ctx = deriveCombatResolution(makeCombat(), {
        reinforcementTriggered: true,
        victoryTriggered: false,
      });
      expect(ctx.outcome.reinforcementRequired).toBe(true);
    });

    it('victoryTriggered from opts', () => {
      const ctx = deriveCombatResolution(makeCombat(), {
        reinforcementTriggered: false,
        victoryTriggered: true,
      });
      expect(ctx.outcome.victoryTriggered).toBe(true);
    });
  });

  describe('explanation headlines', () => {
    it('Victory when victoryTriggered', () => {
      const ctx = deriveCombatResolution(makeCombat(), {
        reinforcementTriggered: false,
        victoryTriggered: true,
      });
      expect(ctx.explanation.headline).toBe('Victory');
    });

    it('LP damage landed on breakthrough', () => {
      const ctx = deriveCombatResolution(makeCombat({ totalLpDamage: 4 }), {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.explanation.headline).toBe('LP damage landed');
    });

    it('Shield lost when diamondDeathShield present', () => {
      const combat = makeCombat({
        steps: [{ target: 'frontCard', damage: 4, bonuses: ['diamondDeathShield'] }],
      });
      const ctx = deriveCombatResolution(combat, {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.explanation.headline).toBe('Shield lost');
    });

    it('Shield lost when heartDeathShield present', () => {
      const combat = makeCombat({
        steps: [{ target: 'backCard', damage: 4, bonuses: ['heartDeathShield'] }],
      });
      const ctx = deriveCombatResolution(combat, {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.explanation.headline).toBe('Shield lost');
    });

    it('Column collapsed when both rows destroyed', () => {
      const combat = makeCombat({
        steps: [
          { target: 'frontCard', damage: 5, destroyed: true },
          { target: 'backCard', damage: 5, destroyed: true },
        ],
      });
      const ctx = deriveCombatResolution(combat, {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.explanation.headline).toBe('Column collapsed');
    });

    it('Direct path opened when only front destroyed', () => {
      const combat = makeCombat({
        steps: [{ target: 'frontCard', damage: 5, destroyed: true }],
      });
      const ctx = deriveCombatResolution(combat, {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.explanation.headline).toBe('Direct path opened');
    });

    it('Attack resolved when no significant outcome', () => {
      const ctx = deriveCombatResolution(makeCombat(), {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.explanation.headline).toBe('Attack resolved');
    });
  });

  describe('causeTags', () => {
    it('includes bonus kind tags from modifiers', () => {
      const combat = makeCombat({
        steps: [{ target: 'frontCard', damage: 5, bonuses: ['spadeDoubleLp'] }],
      });
      const ctx = deriveCombatResolution(combat, {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.explanation.causeTags).toContain('spadeDoubleLp');
    });

    it('includes breakthrough tag on LP damage', () => {
      const ctx = deriveCombatResolution(makeCombat({ totalLpDamage: 3 }), {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.explanation.causeTags).toContain('breakthrough');
    });

    it('includes victory tag when victoryTriggered', () => {
      const ctx = deriveCombatResolution(makeCombat(), {
        reinforcementTriggered: false,
        victoryTriggered: true,
      });
      expect(ctx.explanation.causeTags).toContain('victory');
    });

    it('is empty for a no-op attack', () => {
      const ctx = deriveCombatResolution(makeCombat(), {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.explanation.causeTags).toHaveLength(0);
    });
  });

  describe('mode field', () => {
    it('is undefined when not provided', () => {
      const ctx = deriveCombatResolution(makeCombat(), {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.mode).toBeUndefined();
    });

    it('is classic when provided', () => {
      const ctx = deriveCombatResolution(makeCombat(), {
        reinforcementTriggered: false,
        victoryTriggered: false,
        mode: 'classic',
      });
      expect(ctx.mode).toBe('classic');
    });

    it('is cumulative when provided', () => {
      const ctx = deriveCombatResolution(makeCombat(), {
        reinforcementTriggered: false,
        victoryTriggered: false,
        mode: 'cumulative',
      });
      expect(ctx.mode).toBe('cumulative');
    });
  });

  describe('resolutionCues', () => {
    it('always includes flashAttacker and flashColumn', () => {
      const ctx = deriveCombatResolution(makeCombat({ targetColumn: 2 }), {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.resolutionCues).toContainEqual({ kind: 'flashAttacker' });
      expect(ctx.resolutionCues).toContainEqual({ kind: 'flashColumn', column: 2 });
    });

    it('includes breakthroughBanner on LP damage', () => {
      const ctx = deriveCombatResolution(makeCombat({ totalLpDamage: 5 }), {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.resolutionCues).toContainEqual({ kind: 'breakthroughBanner' });
    });

    it('includes shieldAbsorbed for diamonds on diamondDeathShield', () => {
      const combat = makeCombat({
        steps: [{ target: 'frontCard', damage: 4, bonuses: ['diamondDeathShield'] }],
      });
      const ctx = deriveCombatResolution(combat, {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.resolutionCues).toContainEqual({ kind: 'shieldAbsorbed', suit: 'diamonds' });
    });

    it('includes shieldAbsorbed for hearts on heartDeathShield', () => {
      const combat = makeCombat({
        steps: [{ target: 'backCard', damage: 4, bonuses: ['heartDeathShield'] }],
      });
      const ctx = deriveCombatResolution(combat, {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.resolutionCues).toContainEqual({ kind: 'shieldAbsorbed', suit: 'hearts' });
    });

    it('includes columnCollapsed when both rows destroyed', () => {
      const combat = makeCombat({
        targetColumn: 1,
        steps: [
          { target: 'frontCard', damage: 5, destroyed: true },
          { target: 'backCard', damage: 5, destroyed: true },
        ],
      });
      const ctx = deriveCombatResolution(combat, {
        reinforcementTriggered: false,
        victoryTriggered: false,
      });
      expect(ctx.resolutionCues).toContainEqual({ kind: 'columnCollapsed', column: 1 });
    });

    it('includes reinforcePrompt when reinforcementTriggered', () => {
      const ctx = deriveCombatResolution(makeCombat({ targetColumn: 3 }), {
        reinforcementTriggered: true,
        victoryTriggered: false,
      });
      expect(ctx.resolutionCues).toContainEqual({ kind: 'reinforcePrompt', column: 3 });
    });
  });

  describe('determinism', () => {
    it('produces identical output for the same input (no LP damage)', () => {
      const combat = makeCombat({
        steps: [
          { target: 'frontCard', damage: 5, destroyed: true, bonuses: ['clubDoubleOverflow'] },
          { target: 'backCard', damage: 5, destroyed: false },
        ],
      });
      const opts = { reinforcementTriggered: true, victoryTriggered: false };
      const a = deriveCombatResolution(combat, opts);
      const b = deriveCombatResolution(combat, opts);
      expect(a).toEqual(b);
    });

    it('produces identical output for the same input (LP damage + victory)', () => {
      const combat = makeCombat({ totalLpDamage: 8 });
      const opts = { reinforcementTriggered: false, victoryTriggered: true };
      const a = deriveCombatResolution(combat, opts);
      const b = deriveCombatResolution(combat, opts);
      expect(a).toEqual(b);
    });
  });
});

// --- deriveColumnPressure ---

describe('deriveColumnPressure', () => {
  it('stable when both rows occupied and front HP > 3', () => {
    const battlefield = Array(8).fill(null) as (ReturnType<typeof makeBattlefieldCard> | null)[];
    battlefield[0] = makeBattlefieldCard('f', 7, 7, 0, 0); // front col 0
    battlefield[4] = makeBattlefieldCard('b', 5, 5, 0, 1); // back col 0 (col + columns)
    const state = makeState([], {
      players: [
        makePlayer('Alice', battlefield, 20),
        makePlayer('Bob', Array(8).fill(null) as null[], 20),
      ] as GameState['players'],
    });
    expect(deriveColumnPressure(state, 0, 0)).toBe('stable');
  });

  it('pressured when front HP is low (≤ 3)', () => {
    const battlefield = Array(8).fill(null) as (ReturnType<typeof makeBattlefieldCard> | null)[];
    battlefield[0] = makeBattlefieldCard('f', 7, 2, 0, 0); // currentHp = 2
    const state = makeState([], {
      players: [
        makePlayer('Alice', battlefield, 20),
        makePlayer('Bob', Array(8).fill(null) as null[], 20),
      ] as GameState['players'],
    });
    expect(deriveColumnPressure(state, 0, 0)).toBe('pressured');
  });

  it('exposed when front null but back present', () => {
    const battlefield = Array(8).fill(null) as (ReturnType<typeof makeBattlefieldCard> | null)[];
    // col 0 front = null, back = card at index 4
    battlefield[4] = makeBattlefieldCard('b', 5, 5, 0, 1);
    const state = makeState([], {
      players: [
        makePlayer('Alice', battlefield, 20),
        makePlayer('Bob', Array(8).fill(null) as null[], 20),
      ] as GameState['players'],
    });
    expect(deriveColumnPressure(state, 0, 0)).toBe('exposed');
  });

  it('breakthroughRisk when both rows null', () => {
    const state = makeState([], {
      players: [
        makePlayer('Alice', Array(8).fill(null) as null[], 20),
        makePlayer('Bob', Array(8).fill(null) as null[], 20),
      ] as GameState['players'],
    });
    expect(deriveColumnPressure(state, 0, 0)).toBe('breakthroughRisk');
  });

  it('needsReinforcement during active reinforcement phase for defender', () => {
    const state = makeState([], {
      reinforcement: { column: 0, attackerIndex: 0 },
    });
    // playerIndex 1 is the defender (1 - attackerIndex=0)
    expect(deriveColumnPressure(state, 1, 0)).toBe('needsReinforcement');
  });

  it('does not return needsReinforcement for the attacker', () => {
    const state = makeState([], {
      reinforcement: { column: 0, attackerIndex: 0 },
    });
    // playerIndex 0 is the attacker — not their reinforcement
    const result = deriveColumnPressure(state, 0, 0);
    expect(result).not.toBe('needsReinforcement');
  });

  it('does not return needsReinforcement for a different column', () => {
    const state = makeState([], {
      reinforcement: { column: 2, attackerIndex: 0 },
    });
    // Reinforcement is for column 2, checking column 0
    const result = deriveColumnPressure(state, 1, 0);
    expect(result).not.toBe('needsReinforcement');
  });
});

// --- selectTurningPoint ---

describe('selectTurningPoint', () => {
  it('returns null when no attack entries exist', () => {
    expect(selectTurningPoint(makeState())).toBeNull();
  });

  it('returns null when transactionLog is empty', () => {
    expect(selectTurningPoint(makeState([]))).toBeNull();
  });

  it('identifies first LP damage as turning point (priority 1)', () => {
    const combat = makeCombat({
      turnNumber: 6,
      totalLpDamage: 5,
      steps: [{ target: 'playerLp', damage: 5, lpBefore: 10, lpAfter: 5 }],
    });
    const state = makeState([attackEntry(combat)]);

    const summary = selectTurningPoint(state);
    expect(summary?.turnNumber).toBe(6);
    expect(summary?.label).toContain('LP damage');
    expect(summary?.why).toContain('First core damage');
    expect(summary?.result).toContain('5 LP damage');
  });

  it('identifies column collapse preceding LP damage as turning point (priority 2)', () => {
    const collapse = makeCombat({
      turnNumber: 4,
      steps: [
        { target: 'frontCard', damage: 5, destroyed: true },
        { target: 'backCard', damage: 5, destroyed: true },
      ],
    });
    const breakthrough = makeCombat({
      turnNumber: 7,
      totalLpDamage: 3,
      steps: [{ target: 'playerLp', damage: 3 }],
    });
    const state = makeState([
      attackEntry(collapse, { seq: 1 }),
      attackEntry(breakthrough, { seq: 2 }),
    ]);

    const summary = selectTurningPoint(state);
    expect(summary?.turnNumber).toBe(4);
    expect(summary?.label).toBe('Column collapsed');
    expect(summary?.why).toContain('lane was cleared');
  });

  it('falls back to LP damage turning point if collapse has no later LP damage', () => {
    // collapse → no later LP damage → should not pick up as priority 2
    const collapse = makeCombat({
      turnNumber: 4,
      steps: [
        { target: 'frontCard', damage: 5, destroyed: true },
        { target: 'backCard', damage: 5, destroyed: true },
      ],
    });
    // a later LP hit — picks up as priority 1 (before we even get to priority 2 check)
    // Actually wait — priority 1 is "first LP damage". The collapse has no LP damage.
    // If there's no LP damage at all, it falls to largest swing.
    const state = makeState([attackEntry(collapse, { seq: 1 })]);

    const summary = selectTurningPoint(state);
    // No LP damage entry, so we get priority 3 (largest swing)
    expect(summary?.turnNumber).toBe(4);
    expect(summary?.label).toBe('Column collapsed');
  });

  it('identifies largest material swing (priority 3)', () => {
    const small = makeCombat({
      turnNumber: 2,
      steps: [{ target: 'frontCard', damage: 3, destroyed: true }],
    });
    const large = makeCombat({
      turnNumber: 5,
      steps: [
        { target: 'frontCard', damage: 5, destroyed: true },
        { target: 'backCard', damage: 5, destroyed: true },
      ],
    });
    const state = makeState([attackEntry(small, { seq: 1 }), attackEntry(large, { seq: 2 })]);

    const summary = selectTurningPoint(state);
    expect(summary?.turnNumber).toBe(5);
    expect(summary?.label).toBe('Column collapsed');
    expect(summary?.why).toContain('Largest material swing');
  });

  it('falls back to last entry when all entries have score 0 (no LP, no destruction)', () => {
    // Neither entry has LP damage or card destruction — score = 0, fallback fires
    const noop1 = makeCombat({ turnNumber: 9 });
    const noop2 = makeCombat({ turnNumber: 10 });
    const state = makeState([attackEntry(noop1, { seq: 1 }), attackEntry(noop2, { seq: 2 })]);

    const summary = selectTurningPoint(state);
    expect(summary?.turnNumber).toBe(10);
    expect(summary?.label).toBe('Final turn');
    expect(summary?.why).toContain('Fallback');
  });

  it('matches deriveTurningPoint behavior for LP damage scenario', () => {
    // Matches the test in client/tests/ux-derivations.test.ts
    const combat = makeCombat({
      turnNumber: 6,
      totalLpDamage: 5,
      steps: [{ target: 'playerLp', damage: 5, lpBefore: 10, lpAfter: 5 }],
    });
    const state = makeState([attackEntry(combat)]);

    const summary = selectTurningPoint(state);
    expect(summary?.turnNumber).toBe(6);
    expect(summary?.label).toContain('LP damage');
    expect(summary?.why).toContain('First core damage');
    expect(summary?.result).toContain('5 LP damage');
  });
});
