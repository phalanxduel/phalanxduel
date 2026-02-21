/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU General Public License v3.0.
 */

import { RANK_VALUES } from '@phalanxduel/shared';
import type { GameState, PlayerState, Battlefield, BattlefieldCard, CombatLogStep, CombatLogEntry, CombatBonusType } from '@phalanxduel/shared';

/**
 * Check if a target column is valid for attack.
 * PHX-COMBAT-001: Column-locked targeting. Always valid if column is in range.
 * Damage flows through the column via overflow (front → back → LP).
 */
export function isValidTarget(
  _opponentBattlefield: Battlefield,
  targetColumn: number,
): boolean {
  if (targetColumn < 0 || targetColumn >= 4) return false;
  return true;
}

/**
 * Get the base damage an attacker deals (before suit bonuses).
 */
export function getBaseAttackDamage(attacker: BattlefieldCard): number {
  return RANK_VALUES[attacker.card.rank] ?? 0;
}

/**
 * PHX-ACE-001: Check if a card is an Ace.
 */
function isAce(card: BattlefieldCard): boolean {
  return card.card.rank === 'A';
}

/**
 * PHX-OVERFLOW-001 + all suit bonuses: Resolve column overflow damage.
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
  attackerIsAce: boolean,
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

  if (frontCard && overflow > 0) {
    const step = absorbDamage(frontCard, overflow, attackerIsAce, true);
    overflow = step.overflow;
    steps.push(step.logStep);

    if (step.destroyed) {
      discarded.push(frontCard.card);
      newBf[frontIdx] = null;
      // PHX-SUIT-001: Diamond posthumous shield — set when front card is destroyed
      if (frontCard.card.suit === 'diamonds') {
        frontDiamondShield = RANK_VALUES[frontCard.card.rank] ?? 0;
      }
      // PHX-SUIT-002: Heart posthumous shield — activates only if no back card follows
      if (frontCard.card.suit === 'hearts' && !newBf[column + 4]) {
        frontHeartShield = RANK_VALUES[frontCard.card.rank] ?? 0;
      }
    } else {
      newBf[frontIdx] = { ...frontCard, currentHp: step.remainingHp };
    }
  }

  // Step B: Back card (index = column + 4)
  const backIdx = column + 4;
  const backCard = newBf[backIdx];
  let backHeartShield = 0;

  if (overflow > 0) {
    // PHX-SUIT-003: Club attacker doubles overflow entering back card
    let clubDoubled = false;
    if (backCard && attacker.card.suit === 'clubs') {
      overflow = overflow * 2;
      clubDoubled = true;
    }

    // PHX-SUIT-001: Diamond posthumous shield absorbs after Club doubling.
    // Recorded on the front card's log step; overflow field updated to net value.
    if (frontDiamondShield > 0) {
      const shieldAbsorbed = Math.min(overflow, frontDiamondShield);
      overflow -= shieldAbsorbed;
      const frontStep = steps[steps.length - 1]!;
      frontStep.overflow = overflow;
      if (!frontStep.bonuses) frontStep.bonuses = [];
      if (clubDoubled && overflow === 0) {
        // Club bonus absorbed by Diamond shield — record it on front step too
        frontStep.bonuses.push('clubDoubleOverflow');
        clubDoubled = false;
      }
      frontStep.bonuses.push('diamondDeathShield');
    }

    if (backCard && overflow > 0) {
      const step = absorbDamage(backCard, overflow, attackerIsAce, false);
      overflow = step.overflow;

      if (clubDoubled) {
        if (!step.logStep.bonuses) step.logStep.bonuses = [];
        step.logStep.bonuses.push('clubDoubleOverflow');
      }

      steps.push(step.logStep);

      if (step.destroyed) {
        discarded.push(backCard.card);
        newBf[backIdx] = null;
        // PHX-SUIT-002: Heart posthumous shield — back card activates when destroyed
        if (backCard.card.suit === 'hearts') {
          backHeartShield = RANK_VALUES[backCard.card.rank] ?? 0;
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
    let lpDamage = overflow;
    const bonuses: CombatBonusType[] = [];

    // PHX-SUIT-004: Spade attacker doubles overflow to player LP
    if (attacker.card.suit === 'spades') {
      lpDamage = lpDamage * 2;
      bonuses.push('spadeDoubleLp');
    }

    // PHX-SUIT-002: Heart posthumous shield absorbs after Spade doubling
    const heartShield = frontHeartShield + backHeartShield;
    if (heartShield > 0) {
      const shieldAbsorbed = Math.min(lpDamage, heartShield);
      lpDamage -= shieldAbsorbed;
      bonuses.push('heartDeathShield');
    }

    totalLpDamage = lpDamage;
    newLp = Math.max(0, defenderLp - lpDamage);

    const lpStep: CombatLogStep = {
      target: 'playerLp',
      incomingDamage: overflow,
      damage: lpDamage,
      absorbed: lpDamage,
      overflow: 0,
      lpBefore: defenderLp,
      lpAfter: newLp,
      bonuses: bonuses.length > 0 ? bonuses : undefined,
    };
    steps.push(lpStep);
  }

  return { battlefield: newBf, newLp, discarded, steps, totalLpDamage };
}

/**
 * Absorb damage into a single card. Returns remaining HP, overflow, and log step.
 */
function absorbDamage(
  card: BattlefieldCard,
  incomingDamage: number,
  attackerIsAce: boolean,
  isFrontRow: boolean,
): {
  remainingHp: number;
  overflow: number;
  destroyed: boolean;
  logStep: CombatLogStep;
} {
  const hpBefore = card.currentHp;
  const effectiveHp = card.currentHp;
  const bonuses: CombatBonusType[] = [];

  // PHX-SUIT-001: Diamond posthumous shield is handled in resolveColumnOverflow
  // (applied after Club doubling when the card is destroyed). No in-place bonus here.

  // PHX-ACE-001 + PHX-OVERFLOW-002: Ace absorbs exactly 1, rest overflows
  if (isAce(card)) {
    if (attackerIsAce) {
      // Ace-vs-Ace: invulnerability does not apply
      bonuses.push('aceVsAce');
      const absorbed = Math.min(incomingDamage, card.currentHp);
      const destroyed = card.currentHp - absorbed <= 0;
      const hpAfter = destroyed ? 0 : card.currentHp - absorbed;
      return {
        remainingHp: hpAfter,
        overflow: incomingDamage - absorbed,
        destroyed,
        logStep: {
          target: isFrontRow ? 'frontCard' : 'backCard',
          card: card.card,
          incomingDamage,
          hpBefore,
          effectiveHp,
          absorbed,
          overflow: incomingDamage - absorbed,
          damage: absorbed,
          hpAfter,
          destroyed,
          bonuses,
        },
      };
    }
    // Normal attack on Ace: absorbs 1, stays at 1 HP
    bonuses.push('aceInvulnerable');
    const absorbed = Math.min(incomingDamage, 1);
    return {
      remainingHp: 1,
      overflow: incomingDamage - absorbed,
      destroyed: false,
      logStep: {
        target: isFrontRow ? 'frontCard' : 'backCard',
        card: card.card,
        incomingDamage,
        hpBefore,
        effectiveHp,
        absorbed,
        overflow: incomingDamage - absorbed,
        damage: absorbed,
        hpAfter: 1,
        destroyed: false,
        bonuses,
      },
    };
  }

  // Normal card absorption
  const absorbed = Math.min(incomingDamage, effectiveHp);
  const overflow = incomingDamage - absorbed;
  const realHpLoss = absorbed;
  const newHp = card.currentHp - realHpLoss;
  const destroyed = newHp <= 0;

  return {
    remainingHp: destroyed ? 0 : newHp,
    overflow,
    destroyed,
    logStep: {
      target: isFrontRow ? 'frontCard' : 'backCard',
      card: card.card,
      incomingDamage,
      hpBefore,
      effectiveHp,
      absorbed,
      overflow,
      damage: realHpLoss,
      hpAfter: destroyed ? 0 : newHp,
      destroyed,
      bonuses,
    },
  };
}

/**
 * PHX-DAMAGE-001: Reset surviving cards in a column to full HP.
 * Used in per-turn damage mode after attack resolution.
 * Only resets cards that are still alive (non-null). Destroyed cards stay gone.
 */
export function resetColumnHp(battlefield: Battlefield, column: number): Battlefield {
  const newBf = [...battlefield] as Battlefield;
  const frontIdx = column;
  const backIdx = column + 4;

  const frontCard = newBf[frontIdx];
  if (frontCard) {
    const fullHp = RANK_VALUES[frontCard.card.rank] ?? 0;
    newBf[frontIdx] = { ...frontCard, currentHp: fullHp };
  }

  const backCard = newBf[backIdx];
  if (backCard) {
    const fullHp = RANK_VALUES[backCard.card.rank] ?? 0;
    newBf[backIdx] = { ...backCard, currentHp: fullHp };
  }

  return newBf;
}

/**
 * PHX-COMBAT-001 + PHX-OVERFLOW-001: Resolve an attack with overflow damage.
 * Damage flows through the target column: front → back → player LP.
 * Returns updated state and a separate combat log entry for the caller.
 */
export function resolveAttack(
  state: GameState,
  attackerPlayerIndex: number,
  attackerGridIndex: number,
  _targetGridIndex: number,
): { state: GameState; combatEntry: CombatLogEntry } {
  if (attackerGridIndex < 0 || attackerGridIndex >= 4) {
    throw new Error('Only front-row cards can attack');
  }

  const defenderIndex = attackerPlayerIndex === 0 ? 1 : 0;
  const attacker = state.players[attackerPlayerIndex]?.battlefield[attackerGridIndex];

  if (!attacker) {
    throw new Error(`No card at attacker position ${attackerGridIndex}`);
  }

  const baseDamage = getBaseAttackDamage(attacker);
  const targetColumn = attackerGridIndex % 4;
  const defender = state.players[defenderIndex]!;
  const attackerIsAce = isAce(attacker);

  const result = resolveColumnOverflow(
    baseDamage,
    attacker,
    defender.battlefield,
    targetColumn,
    defender.lifepoints,
    attackerIsAce,
  );

  // Build combat log entry
  const combatEntry: CombatLogEntry = {
    turnNumber: state.turnNumber,
    attackerPlayerIndex,
    attackerCard: attacker.card,
    targetColumn,
    baseDamage,
    steps: result.steps,
    totalLpDamage: result.totalLpDamage,
  };

  const updatedDefender: PlayerState = {
    ...defender,
    battlefield: result.battlefield,
    discardPile: [...defender.discardPile, ...result.discarded],
    lifepoints: result.newLp,
  };

  const players: [PlayerState, PlayerState] = [state.players[0]!, state.players[1]!];
  players[defenderIndex] = updatedDefender;

  return { state: { ...state, players }, combatEntry };
}
