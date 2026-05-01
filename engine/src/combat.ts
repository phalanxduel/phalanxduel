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
  CombatBonusType,
  CardType,
} from '@phalanxduel/shared';

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

/**
 */
function isAce(card: BattlefieldCard): boolean {
  return card.card.type === 'ace';
}

/** Immutable attack context threaded through the damage chain (PHX-FACECARD-001). */
interface AttackContext {
  attackerType: CardType;
  modeClassicAces: boolean;
  modeClassicFaceCards: boolean;
  isCumulative: boolean;
  columns: number;
}

/**
 * Classic Face Cards (PHX-FACECARD-001): check if attacker is eligible to destroy defender.
 * Number cards and Aces are always eligible. Jokers are always eligible.
 * Face card eligibility matrix:
 *   Jack   → can destroy Jack only
 *   Queen  → can destroy Jack, Queen
 *   King   → can destroy Jack, Queen, King
 */
function isFaceCardEligible(attackerType: CardType, defenderType: CardType): boolean {
  if (defenderType !== 'jack' && defenderType !== 'queen' && defenderType !== 'king') return true;
  if (attackerType === 'king') return true;
  if (attackerType === 'queen') return defenderType === 'jack' || defenderType === 'queen';
  if (attackerType === 'jack') return defenderType === 'jack';
  return true; // number / ace / joker: always eligible
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
  const attackerIsAce = ctx.attackerType === 'ace';

  // Step A: Front card (index = column)
  const frontIdx = column;
  const frontCard = newBf[frontIdx];
  let frontDiamondShield = 0;
  let frontHeartShield = 0;

  if (frontCard && overflow > 0) {
    const step = absorbDamage(frontCard, overflow, attackerIsAce, true, ctx);
    overflow = step.overflow;
    steps.push(step.logStep);

    if (step.destroyed) {
      discarded.push(frontCard.card);
      newBf[frontIdx] = null;
      if (frontCard.card.suit === 'diamonds') {
        frontDiamondShield = frontCard.card.value;
      }
      if (frontCard.card.suit === 'hearts') {
        frontHeartShield = frontCard.card.value;
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
    let clubDoubled = false;
    if (backCard && attacker.card.suit === 'clubs' && newBf[frontIdx] === null) {
      overflow = overflow * 2;
      clubDoubled = true;
    }

    // Recorded on the front card's log step; overflow field updated to net value.
    if (frontDiamondShield > 0) {
      const shieldAbsorbed = Math.min(overflow, frontDiamondShield);
      overflow -= shieldAbsorbed;
      const frontStep = steps.at(-1);
      if (!frontStep) throw new Error('Expected front step in combat log');
      frontStep.overflow = overflow;
      frontStep.remaining = overflow;
      frontStep.bonuses ??= [];
      if (clubDoubled && overflow === 0) {
        // Club bonus absorbed by Diamond shield — record it on front step too
        frontStep.bonuses.push('clubDoubleOverflow');
        clubDoubled = false;
      }
      frontStep.bonuses.push('diamondDeathShield');
    }

    if (backCard && overflow > 0) {
      const step = absorbDamage(backCard, overflow, attackerIsAce, false, ctx);
      overflow = step.overflow;

      if (clubDoubled) {
        step.logStep.bonuses ??= [];
        step.logStep.bonuses.push('clubDoubleOverflow');
      }

      steps.push(step.logStep);

      if (step.destroyed) {
        discarded.push(backCard.card);
        newBf[backIdx] = null;
        if (backCard.card.suit === 'hearts') {
          backHeartShield = backCard.card.value;
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

    if (attacker.card.suit === 'spades') {
      lpDamage = lpDamage * 2;
      bonuses.push('spadeDoubleLp');
    }

    const heartShield = backHeartShield > 0 ? backHeartShield : frontHeartShield;
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
      absorbed: overflow - lpDamage,
      overflow: 0,
      remaining: 0,
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
  ctx: AttackContext,
): {
  remainingHp: number;
  overflow: number;
  destroyed: boolean;
  logStep: CombatLogStep;
} {
  const hpBefore = card.currentHp;
  const effectiveHp = card.currentHp;
  const bonuses: CombatBonusType[] = [];

  // PHX-FACECARD-001: Classic Face Cards eligibility check.
  // Must run before Ace check — face card eligibility is independent of Ace invulnerability.
  if (ctx.modeClassicFaceCards && !isFaceCardEligible(ctx.attackerType, card.card.type)) {
    bonuses.push('faceCardIneligible');
    // Cumulative mode: clamp HP to 1 (persistent damage), no overflow.
    // Classic mode: no HP change (HP resets each turn anyway), no overflow.
    const remainingHp = ctx.isCumulative
      ? Math.max(card.currentHp - incomingDamage, 1)
      : card.currentHp;
    const absorbed = card.currentHp - remainingHp;
    return {
      remainingHp,
      overflow: 0,
      destroyed: false,
      logStep: {
        target: isFrontRow ? 'frontCard' : 'backCard',
        card: card.card,
        incomingDamage,
        hpBefore,
        effectiveHp,
        absorbed,
        overflow: 0,
        remaining: 0,
        damage: absorbed,
        hpAfter: remainingHp,
        destroyed: false,
        bonuses,
      },
    };
  }

  // (applied after Club doubling when the card is destroyed). No in-place bonus here.

  if (isAce(card) && ctx.modeClassicAces) {
    if (attackerIsAce && isFrontRow) {
      // Ace-vs-Ace: invulnerability does not apply (only for front-rank aces, §10)
      bonuses.push('aceVsAce');
      const absorbed = Math.min(incomingDamage, card.currentHp);
      const destroyed = card.currentHp - absorbed <= 0;
      const hpAfter = destroyed ? 0 : card.currentHp - absorbed;
      const aceVsAceOverflow = incomingDamage - absorbed;
      return {
        remainingHp: hpAfter,
        overflow: aceVsAceOverflow,
        destroyed,
        logStep: {
          target: isFrontRow ? 'frontCard' : 'backCard',
          card: card.card,
          incomingDamage,
          hpBefore,
          effectiveHp,
          absorbed,
          overflow: aceVsAceOverflow,
          remaining: aceVsAceOverflow,
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
    const aceOverflow = incomingDamage - absorbed;
    return {
      remainingHp: 1,
      overflow: aceOverflow,
      destroyed: false,
      logStep: {
        target: isFrontRow ? 'frontCard' : 'backCard',
        card: card.card,
        incomingDamage,
        hpBefore,
        effectiveHp,
        absorbed,
        overflow: aceOverflow,
        remaining: aceOverflow,
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
      remaining: overflow,
      damage: realHpLoss,
      hpAfter: destroyed ? 0 : newHp,
      destroyed,
      bonuses,
    },
  };
}

/**
 * Used in per-turn damage mode after attack resolution.
 * Only resets cards that are still alive (non-null). Destroyed cards stay gone.
 */
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
    attackerType: attacker.card.type,
    modeClassicAces: state.params.modeClassicAces,
    modeClassicFaceCards: state.params.modeClassicFaceCards,
    isCumulative: state.params.modeDamagePersistence === 'cumulative',
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

  // Build combat log entry — store raw bonus keys as causeLabels; UI maps to display strings
  const causeLabels = [...new Set(result.steps.flatMap((s) => s.bonuses ?? []))];

  const combatEntry: CombatLogEntry = {
    turnNumber: state.turnNumber,
    attackerPlayerIndex,
    attackerCard: attacker.card,
    targetColumn,
    baseDamage,
    steps: result.steps,
    totalLpDamage: result.totalLpDamage,
    causeLabels: causeLabels.length > 0 ? causeLabels : undefined,
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
