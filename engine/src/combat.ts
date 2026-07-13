/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import type {
  GameState,
  PlayerState,
  Battlefield,
  BattlefieldCard,
  CombatLogStep,
  CombatLogEntry,
} from '@phalanxduel/shared';
import {
  resolveCardBoundary,
  resolveCardTransition,
  resolvePlayerBoundary,
} from './combat-math.js';

/**
 * Check if a target column is valid for attack.
 * Damage flows through the column via overflow (front → back → LP).
 */
export function isValidTarget(
  _opponentBattlefield: Battlefield,
  targetColumn: number,
  columns = 4,
): boolean {
  if (targetColumn < 0 || targetColumn >= columns) return false;
  return true;
}

/**
 * Get the base damage an attacker deals (before suit bonuses).
 */
export function getBaseAttackDamage(attacker: BattlefieldCard): number {
  return attacker.card.value;
}

/** Immutable attack context threaded through the damage chain (PHX-FACECARD-001). */
interface AttackContext {
  specVersion: GameState['specVersion'];
  attackerType: BattlefieldCard['card']['type'];
  modeClassicAces: boolean;
  modeClassicFaceCards: boolean;
  modeDamagePersistence: GameState['params']['modeDamagePersistence'];
  columns: number;
}

/**
 *
 * Damage flows: front card → back card → player LP.
 * Returns updated battlefield, updated LP, discard additions, and log steps.
 */
function resolveColumnOverflow(
  baseDamage: number,
  attacker: BattlefieldCard,
  battlefield: Battlefield,
  column: number,
  defenderLp: number,
  ctx: AttackContext,
): {
  battlefield: Battlefield;
  newLp: number;
  discarded: BattlefieldCard['card'][];
  steps: CombatLogStep[];
  totalLpDamage: number;
} {
  const newBf = [...battlefield] as Battlefield;
  const steps: CombatLogStep[] = [];
  const discarded: BattlefieldCard['card'][] = [];
  let overflow = baseDamage;

  // Step A: Front card (index = column)
  const frontIdx = column;
  const frontCard = newBf[frontIdx];
  let frontDiamondShield = 0;
  let frontHeartShield = 0;
  let lastDestroyedHeartShield = 0;

  if (frontCard && overflow > 0) {
    const step = resolveCardTransition(frontCard, overflow, true, ctx);
    overflow = step.carryover;
    steps.push(step.step);

    if (step.destroyed) {
      discarded.push(frontCard.card);
      newBf[frontIdx] = null;
      if (frontCard.card.suit === 'diamonds') {
        frontDiamondShield = frontCard.card.value;
      }
      if (frontCard.card.suit === 'hearts') {
        frontHeartShield = frontCard.card.value;
        lastDestroyedHeartShield = frontCard.card.value;
      }
    } else {
      newBf[frontIdx] = { ...frontCard, currentHp: step.remainingHp };
    }
  }

  // Step B: Back card (index = column + ctx.columns)
  const backIdx = column + ctx.columns;
  const backCard = newBf[backIdx];
  let backHeartShield = 0;

  if (overflow > 0) {
    const clubBoundaryEligible =
      ctx.specVersion === '1.0'
        ? newBf[frontIdx] === null
        : frontCard !== null && newBf[frontIdx] === null;
    const boundary = resolveCardBoundary({
      carryover: overflow,
      diamondShield: ctx.specVersion === '1.0' || backCard !== null ? frontDiamondShield : 0,
      clubEligible: backCard !== null && attacker.card.suit === 'clubs' && clubBoundaryEligible,
      specVersion: ctx.specVersion,
    });
    overflow = boundary.carryover;

    if (boundary.diamondApplied) {
      const frontStep = steps.at(-1);
      if (!frontStep) throw new Error('Expected front step in combat log');
      frontStep.overflow = overflow;
      frontStep.remaining = overflow;
      frontStep.bonuses ??= [];
      if (boundary.clubBonusTarget === 'destroyedCard') {
        frontStep.bonuses.push('clubDoubleOverflow');
      }
      frontStep.bonuses.push('diamondDeathShield');
    }

    if (backCard && overflow > 0) {
      const step = resolveCardTransition(backCard, overflow, false, ctx);
      overflow = step.carryover;

      if (boundary.clubBonusTarget === 'nextCard') {
        step.step.bonuses ??= [];
        step.step.bonuses.push('clubDoubleOverflow');
      }

      steps.push(step.step);

      if (step.destroyed) {
        discarded.push(backCard.card);
        newBf[backIdx] = null;
        lastDestroyedHeartShield = 0;
        if (backCard.card.suit === 'hearts') {
          backHeartShield = backCard.card.value;
          lastDestroyedHeartShield = backCard.card.value;
        }
      } else {
        newBf[backIdx] = { ...backCard, currentHp: step.remainingHp };
      }
    }
  }

  // Step C: Player LP (if overflow > 0)
  let totalLpDamage = 0;
  let newLp = defenderLp;

  if (overflow > 0) {
    const heartShield =
      ctx.specVersion === '2.0'
        ? lastDestroyedHeartShield
        : backHeartShield > 0
          ? backHeartShield
          : frontHeartShield;
    const boundary = resolvePlayerBoundary({
      carryover: overflow,
      heartShield,
      spadeWeapon: attacker.card.suit === 'spades',
      specVersion: ctx.specVersion,
    });
    const lpDamage = boundary.damage;

    totalLpDamage = lpDamage;
    newLp = Math.max(0, defenderLp - lpDamage);

    const lpStep: CombatLogStep = {
      target: 'playerLp',
      incomingDamage: overflow,
      damage: lpDamage,
      absorbed:
        ctx.specVersion === '2.0' ? boundary.heartAbsorbed : Math.max(0, overflow - lpDamage),
      overflow: 0,
      remaining: 0,
      lpBefore: defenderLp,
      lpAfter: newLp,
      bonuses: boundary.bonuses.length > 0 ? boundary.bonuses : undefined,
    };
    steps.push(lpStep);
  }

  return { battlefield: newBf, newLp, discarded, steps, totalLpDamage };
}

/** Reset surviving cards in one column to their printed HP. */
export function resetColumnHp(battlefield: Battlefield, column: number, columns = 4): Battlefield {
  const newBf = [...battlefield] as Battlefield;
  const frontIdx = column;
  const backIdx = column + columns;

  const frontCard = newBf[frontIdx];
  if (frontCard) {
    const fullHp = frontCard.card.value;
    newBf[frontIdx] = { ...frontCard, currentHp: fullHp };
  }

  const backCard = newBf[backIdx];
  if (backCard) {
    const fullHp = backCard.card.value;
    newBf[backIdx] = { ...backCard, currentHp: fullHp };
  }

  return newBf;
}

/**
 * Damage flows through the target column: front → back → player LP.
 * Returns updated state and a separate combat log entry for the caller.
 */
export function resolveAttack(
  state: GameState,
  attackerPlayerIndex: number,
  attackerGridIndex: number,
  _targetGridIndex: number,
): { state: GameState; combatEntry: CombatLogEntry } {
  const columns = state.params.columns;
  if (attackerGridIndex < 0 || attackerGridIndex >= columns) {
    throw new Error('Only front-row cards can attack');
  }

  const defenderIndex = attackerPlayerIndex === 0 ? 1 : 0;
  const attacker = state.players[attackerPlayerIndex]?.battlefield[attackerGridIndex];

  if (!attacker) {
    throw new Error(`No card at attacker position ${attackerGridIndex}`);
  }

  const baseDamage = getBaseAttackDamage(attacker);
  const targetColumn = attackerGridIndex % columns;
  const defender = state.players[defenderIndex];
  if (!defender) throw new Error(`No player at index ${defenderIndex}`);
  const ctx: AttackContext = {
    specVersion: state.specVersion,
    attackerType: attacker.card.type,
    modeClassicAces: state.params.modeClassicAces,
    modeClassicFaceCards: state.params.modeClassicFaceCards,
    modeDamagePersistence: state.params.modeDamagePersistence,
    columns,
  };

  const result = resolveColumnOverflow(
    baseDamage,
    attacker,
    defender.battlefield,
    targetColumn,
    defender.lifepoints,
    ctx,
  );

  // Reveal cards involved in combat
  const newState = { ...state };
  const players = [...newState.players] as [PlayerState, PlayerState];

  // Flip attacker face-up
  const attackerPlayer = players[attackerPlayerIndex];
  if (!attackerPlayer) throw new Error(`No player at index ${attackerPlayerIndex}`);
  const attackerPs = { ...attackerPlayer };
  const attackerBf = [...attackerPs.battlefield] as Battlefield;
  const attackerCard = attackerBf[attackerGridIndex];
  if (!attackerCard) throw new Error(`No card at attacker grid index ${attackerGridIndex}`);
  attackerBf[attackerGridIndex] = { ...attackerCard, faceDown: false };
  attackerPs.battlefield = attackerBf;
  players[attackerPlayerIndex] = attackerPs;

  // Flip defender column face-up
  const defenderPs = { ...players[defenderIndex] };
  const defenderBf = [...defenderPs.battlefield] as Battlefield;
  for (let r = 0; r < state.params.rows; r++) {
    const idx = r * columns + targetColumn;
    const cell = defenderBf[idx];
    if (cell) {
      defenderBf[idx] = { ...cell, faceDown: false };
    }
  }
  defenderPs.battlefield = defenderBf;
  players[defenderIndex] = defenderPs;

  newState.players = players;

  const causeLabels = [...new Set(result.steps.flatMap((s) => s.bonuses ?? []))];
  const comboCount = result.steps.filter((s) => s.destroyed).length;

  const combatEntry: CombatLogEntry = {
    turnNumber: state.turnNumber,
    attackerPlayerIndex,
    attackerCard: attacker.card,
    targetColumn,
    baseDamage,
    steps: result.steps,
    totalLpDamage: result.totalLpDamage,
    causeLabels: causeLabels.length > 0 ? causeLabels : undefined,
    comboCount: comboCount > 1 ? comboCount : undefined,
  };

  const finalPlayers = [...players] as [PlayerState, PlayerState];
  finalPlayers[defenderIndex] = {
    ...finalPlayers[defenderIndex],
    battlefield: result.battlefield,
    discardPile: [...finalPlayers[defenderIndex].discardPile, ...result.discarded],
    lifepoints: result.newLp,
  };

  return { state: { ...newState, players: finalPlayers }, combatEntry };
}
