import { describe, expect, it } from 'vitest';
import type { Battlefield, BattlefieldCard, Card, GameState, Suit } from '@phalanxduel/shared';
import { DEFAULT_MATCH_PARAMS } from '@phalanxduel/shared';
import { createInitialState, deployCard, resolveAttack } from '../src/index.ts';

const MATCH_ID = '00000000-0000-4000-8000-000000000099';
const TIMESTAMP = '2026-07-13T00:00:00.000Z';

function card(suit: Suit, value: number, face = String(value)): Card {
  return { id: `${suit}-${face}`, suit, value, face, type: 'number' };
}

function battlefieldCard(value: Card, gridIndex: number): BattlefieldCard {
  return {
    card: value,
    position: {
      row: Math.floor(gridIndex / DEFAULT_MATCH_PARAMS.columns),
      col: gridIndex % DEFAULT_MATCH_PARAMS.columns,
    },
    currentHp: value.value,
    faceDown: false,
  };
}

function combatState(
  specVersion: GameState['specVersion'],
  attacker: Card,
  front?: Card,
  back?: Card,
): GameState {
  const state = createInitialState({
    matchId: MATCH_ID,
    players: [
      { id: '00000000-0000-4000-8000-000000000001', name: 'P1' },
      { id: '00000000-0000-4000-8000-000000000002', name: 'P2' },
    ],
    rngSeed: 1,
    drawTimestamp: TIMESTAMP,
    matchParams: { ...DEFAULT_MATCH_PARAMS, specVersion },
  });

  const attackerBattlefield = Array(8).fill(null) as Battlefield;
  attackerBattlefield[0] = battlefieldCard(attacker, 0);
  const defenderBattlefield = Array(8).fill(null) as Battlefield;
  if (front) defenderBattlefield[0] = battlefieldCard(front, 0);
  if (back) defenderBattlefield[4] = battlefieldCard(back, 4);

  return {
    ...state,
    phase: 'AttackPhase',
    activePlayerIndex: 0,
    players: [
      { ...state.players[0]!, battlefield: attackerBattlefield },
      { ...state.players[1]!, battlefield: defenderBattlefield },
    ],
  };
}

describe('rules-version semantic dispatch', () => {
  it('uses Shield → Weapon at card boundaries in v2.0 while preserving v1.0 replay order', () => {
    const attacker = card('clubs', 5);
    const shield = card('diamonds', 2);
    const back = card('hearts', 10);

    const historical = resolveAttack(combatState('1.0', attacker, shield, back), 0, 0, 0).state;
    const corrected = resolveAttack(combatState('2.0', attacker, shield, back), 0, 0, 0).state;

    expect(historical.players[1]!.battlefield[4]!.currentHp).toBe(6);
    expect(corrected.players[1]!.battlefield[4]!.currentHp).toBe(8);
  });

  it('uses Shield → Weapon at player boundaries in v2.0 while preserving v1.0 replay order', () => {
    const attacker = card('spades', 10);
    const shield = card('hearts', 3);

    const historical = resolveAttack(combatState('1.0', attacker, shield), 0, 0, 0).state;
    const corrected = resolveAttack(combatState('2.0', attacker, shield), 0, 0, 0).state;

    expect(historical.players[1]!.lifepoints).toBe(9);
    expect(corrected.players[1]!.lifepoints).toBe(12);
  });

  it('never turns a Heart shield into healing when no carryover reaches LP', () => {
    const result = resolveAttack(
      combatState('2.0', card('spades', 3), card('hearts', 3)),
      0,
      0,
      0,
    ).state;

    expect(result.players[1]!.lifepoints).toBe(20);
  });

  it('requires an actual first destruction before v2.0 Club overflow can double', () => {
    const attacker = card('clubs', 2);
    const back = card('clubs', 1, 'A');

    const historical = resolveAttack(combatState('1.0', attacker, undefined, back), 0, 0, 0);
    const corrected = resolveAttack(combatState('2.0', attacker, undefined, back), 0, 0, 0);

    expect(historical.combatEntry.totalLpDamage).toBe(3);
    expect(corrected.combatEntry.totalLpDamage).toBe(1);
    expect(corrected.combatEntry.causeLabels).toBeUndefined();
  });

  it('scopes the v2.0 Diamond shield to Card-to-Card boundaries', () => {
    const attacker = card('clubs', 2);
    const diamond = card('diamonds', 1, 'A');

    const historical = resolveAttack(combatState('1.0', attacker, diamond), 0, 0, 0);
    const corrected = resolveAttack(combatState('2.0', attacker, diamond), 0, 0, 0);

    expect(historical.combatEntry.totalLpDamage).toBe(0);
    expect(corrected.combatEntry.totalLpDamage).toBe(1);
    expect(corrected.combatEntry.causeLabels).toBeUndefined();
  });

  it('uses only the final destroyed card when selecting a v2.0 Heart shield', () => {
    const attacker = card('clubs', 2);
    const heart = card('hearts', 1, 'A');
    const nonHeart = card('clubs', 1, 'A');

    const result = resolveAttack(combatState('2.0', attacker, heart, nonHeart), 0, 0, 0);

    expect(result.combatEntry.totalLpDamage).toBe(1);
    expect(result.combatEntry.causeLabels).toEqual(['clubDoubleOverflow']);
  });

  it('reports the actual v2.0 Heart shield term before Spade multiplication', () => {
    const result = resolveAttack(
      combatState('2.0', card('spades', 3), card('hearts', 1, 'A')),
      0,
      0,
      0,
    );
    const lpStep = result.combatEntry.steps.at(-1);

    expect(result.combatEntry.totalLpDamage).toBe(2);
    expect(lpStep).toMatchObject({
      target: 'playerLp',
      incomingDamage: 2,
      absorbed: 1,
      damage: 2,
      bonuses: ['heartDeathShield', 'spadeDoubleLp'],
    });
  });

  it('deploys competitive v2.0 cards face-up', () => {
    const state = createInitialState({
      matchId: MATCH_ID,
      players: [
        { id: '00000000-0000-4000-8000-000000000001', name: 'P1' },
        { id: '00000000-0000-4000-8000-000000000002', name: 'P2' },
      ],
      rngSeed: 1,
      drawTimestamp: TIMESTAMP,
    });

    const deployed = deployCard(state, 0, 0, 0);
    expect(deployed.specVersion).toBe('2.0');
    expect(deployed.players[0]!.battlefield[0]!.faceDown).toBe(false);
  });
});
