/**
 * PHX-CP-001: simulateAttack — preview matches real attack.resolved payload
 *
 * Invariant: simulateAttack(state, action).resolution is byte-identical to the
 * CombatResolutionContext inside the attack.resolved event produced by
 * deriveEventsFromEntry after the same action is applied for real.
 *
 * Five+ scenarios are exercised to cover all four verdict classes and the
 * reinforcement-triggered flag.
 */
import { describe, it, expect } from 'vitest';
import type {
  GameState,
  Battlefield,
  BattlefieldCard,
  Card,
  PartialCard,
  PlayerState,
} from '@phalanxduel/shared';
import { TelemetryName } from '@phalanxduel/shared';
import { simulateAttack, applyAction, deriveEventsFromEntry } from '../src/index.ts';

// ── Helpers ──────────────────────────────────────────────────────────────────

const TS = '2026-01-01T00:00:00.000Z';
const MATCH_ID = 'cp-test';

function emptyBf(): Battlefield {
  return [null, null, null, null, null, null, null, null] as Battlefield;
}

function bfCard(
  suit: Card['suit'],
  face: string,
  value: number,
  gridIndex: number,
): BattlefieldCard {
  return {
    card: {
      id: `${suit}-${face}-${gridIndex}`,
      suit,
      face,
      value,
      type: face === 'A' ? 'ace' : 'number',
    },
    position: { row: gridIndex < 4 ? 0 : 1, col: gridIndex % 4 },
    currentHp: value,
    faceDown: false,
  };
}

function makeCard(suit: Card['suit'], face: string, value: number): Card {
  return { id: `hand-${suit}-${face}`, suit, face, value, type: 'number' };
}

function makePartialCard(suit: Card['suit'], face: string, value: number): PartialCard {
  return { suit, face, value, type: 'number' };
}

function makeState(
  p0Bf: Battlefield,
  p1Bf: Battlefield,
  opts?: {
    p0Hand?: Card[];
    p1Hand?: Card[];
    p0Drawpile?: PartialCard[];
    p1Drawpile?: PartialCard[];
    p0Lp?: number;
    p1Lp?: number;
  },
): GameState {
  const makePlayer = (
    id: string,
    name: string,
    bf: Battlefield,
    hand: Card[],
    drawpile: PartialCard[],
    lp: number,
  ): PlayerState => ({
    player: { id, name },
    hand,
    battlefield: bf,
    drawpile,
    discardPile: [],
    lifepoints: lp,
    deckSeed: 0,
  });

  return {
    matchId: MATCH_ID,
    specVersion: '1.0',
    params: {
      specVersion: '1.0',
      classic: {
        enabled: true,
        mode: 'strict',
        battlefield: { rows: 2, columns: 4 },
        hand: { maxHandSize: 4 },
        start: { initialDraw: 12 },
        modes: {
          classicAces: true,
          classicFaceCards: true,
          damagePersistence: 'classic',
        },
        initiative: { deployFirst: 'P2', attackFirst: 'P1' },
        passRules: { maxConsecutivePasses: 3, maxTotalPassesPerPlayer: 5 },
      },
      rows: 2,
      columns: 4,
      maxHandSize: 4,
      initialDraw: 12,
      modeClassicAces: true,
      modeClassicFaceCards: true,
      modeDamagePersistence: 'classic',
      modeClassicDeployment: true,
      modeSpecialStart: { enabled: false },
      initiative: { deployFirst: 'P2', attackFirst: 'P1' },
      modePassRules: { maxConsecutivePasses: 3, maxTotalPassesPerPlayer: 5 },
    },
    players: [
      makePlayer(
        '00000000-0000-0000-0000-000000000001',
        'Alice',
        p0Bf,
        opts?.p0Hand ?? [],
        opts?.p0Drawpile ?? [],
        opts?.p0Lp ?? 20,
      ),
      makePlayer(
        '00000000-0000-0000-0000-000000000002',
        'Bob',
        p1Bf,
        opts?.p1Hand ?? [],
        opts?.p1Drawpile ?? [],
        opts?.p1Lp ?? 20,
      ),
    ],
    activePlayerIndex: 0,
    phase: 'AttackPhase',
    turnNumber: 1,
    transactionLog: [],
  };
}

// A drawpile sentinel: one card to prevent card-depletion victory when we only want to
// test a specific outcome without triggering the "no cards left" win condition.
const SENTINEL_DRAWPILE: PartialCard[] = [makePartialCard('clubs', '2', 2)];

/** Extract the attack.resolved payload from the last transaction log entry after applyAction. */
function realResolution(
  state: GameState,
  action: Extract<Parameters<typeof simulateAttack>[1], { type: 'attack' }>,
): Record<string, unknown> {
  const after = applyAction(state, action);
  const log = after.transactionLog ?? [];
  const entry = log[log.length - 1];
  if (!entry) throw new Error('No transaction log entry after applyAction');
  const events = deriveEventsFromEntry(entry, MATCH_ID);
  const resolved = events.find((e) => e.name === TelemetryName.EVENT_ATTACK_RESOLVED);
  if (!resolved) throw new Error('No attack.resolved event found');
  return resolved.payload;
}

// ── Scenarios ────────────────────────────────────────────────────────────────

describe('PHX-CP-001: simulateAttack resolution matches real attack.resolved payload', () => {
  /**
   * S1: LOSING_EXCHANGE — attacker (3) cannot destroy defender front (7).
   * Front card survives, no damage to LP.
   */
  it('S1 LOSING_EXCHANGE: front survives, preview equals real event', () => {
    const p0Bf = emptyBf();
    const p1Bf = emptyBf();
    p0Bf[0] = bfCard('clubs', '3', 3, 0);
    p1Bf[0] = bfCard('spades', '7', 7, 0); // front survives with HP 4

    const state = makeState(p0Bf, p1Bf);
    const action = {
      type: 'attack' as const,
      playerIndex: 0 as const,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: TS,
    };

    const preview = simulateAttack(state, action);
    const real = realResolution(state, action);

    expect(preview.verdict).toBe('LOSING_EXCHANGE');
    expect(JSON.stringify(preview.resolution)).toBe(JSON.stringify(real));
  });

  /**
   * S2: EVEN_EXCHANGE — front destroyed exactly (no overflow), no back card.
   * A sentinel drawpile card prevents the card-depletion win condition so victory
   * is not triggered and the verdict stays EVEN_EXCHANGE.
   */
  it('S2 EVEN_EXCHANGE: front destroyed exactly, preview equals real event', () => {
    const p0Bf = emptyBf();
    const p1Bf = emptyBf();
    p0Bf[0] = bfCard('clubs', '7', 7, 0);
    p1Bf[0] = bfCard('spades', '7', 7, 0); // exact match — no overflow

    // Sentinel drawpile stops card-depletion victory after front is destroyed.
    const state = makeState(p0Bf, p1Bf, { p1Drawpile: SENTINEL_DRAWPILE });
    const action = {
      type: 'attack' as const,
      playerIndex: 0 as const,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: TS,
    };

    const preview = simulateAttack(state, action);
    const real = realResolution(state, action);

    expect(preview.verdict).toBe('EVEN_EXCHANGE');
    expect(JSON.stringify(preview.resolution)).toBe(JSON.stringify(real));
  });

  /**
   * S3: EVEN_EXCHANGE — front destroyed with overflow, back card absorbs overflow and survives.
   * Back card remaining prevents card-depletion.
   */
  it('S3 EVEN_EXCHANGE: front destroyed + overflow absorbed by back card, preview equals real event', () => {
    const p0Bf = emptyBf();
    const p1Bf = emptyBf();
    p0Bf[0] = bfCard('spades', '8', 8, 0); // non-clubs to avoid double-overflow bonus
    p1Bf[0] = bfCard('clubs', '4', 4, 0); // destroyed, overflow = 4
    p1Bf[4] = bfCard('hearts', '6', 6, 4); // back row, absorbs 4, survives with HP 2

    const state = makeState(p0Bf, p1Bf);
    const action = {
      type: 'attack' as const,
      playerIndex: 0 as const,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: TS,
    };

    const preview = simulateAttack(state, action);
    const real = realResolution(state, action);

    expect(preview.verdict).toBe('EVEN_EXCHANGE');
    expect(JSON.stringify(preview.resolution)).toBe(JSON.stringify(real));
  });

  /**
   * S4: WINNING_EXCHANGE — front and back both destroyed with exact damage, no LP loss.
   * A sentinel drawpile card prevents the card-depletion win condition.
   */
  it('S4 WINNING_EXCHANGE: both cards destroyed with no LP damage, preview equals real event', () => {
    const p0Bf = emptyBf();
    const p1Bf = emptyBf();
    p0Bf[0] = bfCard('spades', '9', 9, 0);
    p1Bf[0] = bfCard('hearts', '4', 4, 0); // destroyed, overflow = 5
    p1Bf[4] = bfCard('clubs', '5', 5, 4); // destroyed exactly, zero overflow to LP

    // Sentinel prevents card-depletion victory after both rows are cleared.
    const state = makeState(p0Bf, p1Bf, { p1Drawpile: SENTINEL_DRAWPILE });
    const action = {
      type: 'attack' as const,
      playerIndex: 0 as const,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: TS,
    };

    const preview = simulateAttack(state, action);
    const real = realResolution(state, action);

    expect(preview.verdict).toBe('WINNING_EXCHANGE');
    expect(JSON.stringify(preview.resolution)).toBe(JSON.stringify(real));
  });

  /**
   * S5: DIRECT_DAMAGE_RISK — LP damage (front destroyed + overflow hits player LP).
   * P1 has a drawpile so card-depletion doesn't also fire.
   */
  it('S5 DIRECT_DAMAGE_RISK: overflow damages player LP, preview equals real event', () => {
    const p0Bf = emptyBf();
    const p1Bf = emptyBf();
    p0Bf[0] = bfCard('spades', '9', 9, 0);
    p1Bf[0] = bfCard('hearts', '4', 4, 0); // destroyed, overflow = 5 → LP 20-5=15

    // Sentinel drawpile avoids card-depletion so playerDamaged drives the verdict.
    const state = makeState(p0Bf, p1Bf, { p1Drawpile: SENTINEL_DRAWPILE });
    const action = {
      type: 'attack' as const,
      playerIndex: 0 as const,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: TS,
    };

    const preview = simulateAttack(state, action);
    const real = realResolution(state, action);

    expect(preview.verdict).toBe('DIRECT_DAMAGE_RISK');
    expect(JSON.stringify(preview.resolution)).toBe(JSON.stringify(real));
  });

  /**
   * S6: DIRECT_DAMAGE_RISK — victory triggered by LP depletion.
   */
  it('S6 DIRECT_DAMAGE_RISK: victory triggered when defender LP depleted, preview equals real event', () => {
    const p0Bf = emptyBf();
    const p1Bf = emptyBf();
    p0Bf[0] = bfCard('spades', '8', 8, 0);
    p1Bf[0] = bfCard('hearts', '3', 3, 0); // destroyed, overflow = 5

    const state = makeState(p0Bf, p1Bf, { p1Lp: 4 }); // overflow 5 > LP 4 → victory

    const action = {
      type: 'attack' as const,
      playerIndex: 0 as const,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: TS,
    };

    const preview = simulateAttack(state, action);
    const real = realResolution(state, action);

    expect(preview.verdict).toBe('DIRECT_DAMAGE_RISK');
    expect(preview.resolution.outcome.victoryTriggered).toBe(true);
    expect(JSON.stringify(preview.resolution)).toBe(JSON.stringify(real));
  });

  /**
   * S7: reinforcementTriggered — front destroyed exactly, defender has a hand card.
   * Hand card prevents card-depletion, and triggers the reinforcement prompt.
   */
  it('S7 reinforcementTriggered: defender hand non-empty, preview reinforcementRequired matches real', () => {
    const p0Bf = emptyBf();
    const p1Bf = emptyBf();
    p0Bf[0] = bfCard('spades', '5', 5, 0);
    p1Bf[0] = bfCard('hearts', '5', 5, 0); // destroyed exactly, no overflow

    // Hand card keeps depletion from firing and triggers the reinforcement cue.
    const state = makeState(p0Bf, p1Bf, {
      p1Hand: [makeCard('clubs', '3', 3)],
    });

    const action = {
      type: 'attack' as const,
      playerIndex: 0 as const,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: TS,
    };

    const preview = simulateAttack(state, action);
    const real = realResolution(state, action);

    expect(preview.resolution.outcome.reinforcementRequired).toBe(true);
    expect(JSON.stringify(preview.resolution)).toBe(JSON.stringify(real));
  });

  /**
   * S8: determinism — calling simulateAttack twice on the same state/action yields identical results.
   */
  it('S8 determinism: two calls produce byte-identical resolution', () => {
    const p0Bf = emptyBf();
    const p1Bf = emptyBf();
    p0Bf[0] = bfCard('clubs', '6', 6, 0);
    p1Bf[0] = bfCard('spades', '3', 3, 0);
    p1Bf[4] = bfCard('hearts', '2', 2, 4);

    const state = makeState(p0Bf, p1Bf, { p1Drawpile: SENTINEL_DRAWPILE });
    const action = {
      type: 'attack' as const,
      playerIndex: 0 as const,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: TS,
    };

    const first = simulateAttack(state, action);
    const second = simulateAttack(state, action);

    expect(JSON.stringify(first.resolution)).toBe(JSON.stringify(second.resolution));
    expect(first.verdict).toBe(second.verdict);
  });

  /**
   * S9: state immutability — simulateAttack does not mutate the original state.
   */
  it('S9 immutability: original state is unmodified after simulateAttack', () => {
    const p0Bf = emptyBf();
    const p1Bf = emptyBf();
    p0Bf[0] = bfCard('spades', '7', 7, 0);
    p1Bf[0] = bfCard('hearts', '4', 4, 0);

    const state = makeState(p0Bf, p1Bf, { p1Drawpile: SENTINEL_DRAWPILE });
    const stateBefore = JSON.stringify(state);

    const action = {
      type: 'attack' as const,
      playerIndex: 0 as const,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: TS,
    };
    simulateAttack(state, action);

    expect(JSON.stringify(state)).toBe(stateBefore);
  });
});
