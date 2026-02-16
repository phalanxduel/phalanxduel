import { RANK_VALUES } from '@phalanx/shared';
import type { GameState, PlayerState, Battlefield, BattlefieldCard, CombatLogStep, CombatLogEntry } from '@phalanx/shared';

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
 * Get a human-readable card label (e.g. "5♣").
 */
function cardLogLabel(card: BattlefieldCard): string {
  const suitSymbols: Record<string, string> = {
    spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣',
  };
  return `${card.card.rank}${suitSymbols[card.card.suit] ?? '?'}`;
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
  let lastCardInPath: BattlefieldCard | null = null;

  // Step A: Front card (index = column)
  const frontIdx = column;
  const frontCard = newBf[frontIdx];

  if (frontCard && overflow > 0) {
    lastCardInPath = frontCard;
    const step = absorbDamage(frontCard, overflow, attackerIsAce, true);
    overflow = step.overflow;
    steps.push(step.logStep);

    if (step.destroyed) {
      discarded.push(frontCard.card);
      newBf[frontIdx] = null;
    } else {
      newBf[frontIdx] = { ...frontCard, currentHp: step.remainingHp };
    }
  }

  // Step B: Back card (index = column + 4)
  const backIdx = column + 4;
  const backCard = newBf[backIdx];

  if (backCard && overflow > 0) {
    // PHX-SUIT-003: Club attacker doubles overflow entering back card
    if (attacker.card.suit === 'clubs') {
      overflow = overflow * 2;
    }

    lastCardInPath = backCard;
    const step = absorbDamage(backCard, overflow, attackerIsAce, false);
    overflow = step.overflow;

    // Add club bonus description if applicable
    if (attacker.card.suit === 'clubs') {
      step.logStep.bonus = 'Club ×2 overflow to back';
    }

    steps.push(step.logStep);

    if (step.destroyed) {
      discarded.push(backCard.card);
      newBf[backIdx] = null;
    } else {
      newBf[backIdx] = { ...backCard, currentHp: step.remainingHp };
    }
  }

  // Step C: Player LP (if overflow > 0)
  let totalLpDamage = 0;
  let newLp = defenderLp;

  if (overflow > 0) {
    let lpDamage = overflow;
    const bonusParts: string[] = [];

    // PHX-SUIT-004: Spade attacker doubles overflow to player LP
    if (attacker.card.suit === 'spades') {
      lpDamage = lpDamage * 2;
      bonusParts.push('Spade ×2');
    }

    // PHX-SUIT-002: Heart last card halves overflow to player LP
    if (lastCardInPath && lastCardInPath.card.suit === 'hearts') {
      lpDamage = Math.floor(lpDamage / 2);
      bonusParts.push('Heart ÷2');
    }

    totalLpDamage = lpDamage;
    newLp = Math.max(0, defenderLp - lpDamage);

    const lpStep: CombatLogStep = {
      target: 'playerLp',
      damage: lpDamage,
    };
    if (bonusParts.length > 0) {
      lpStep.bonus = bonusParts.join(', ');
    }
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
  let effectiveHp = card.currentHp;
  let bonus: string | undefined;

  // PHX-SUIT-001: Diamond front row doubles effective defense
  if (card.card.suit === 'diamonds' && isFrontRow) {
    effectiveHp = card.currentHp * 2;
    bonus = 'Diamond ×2 defense';
  }

  // PHX-ACE-001 + PHX-OVERFLOW-002: Ace absorbs exactly 1, rest overflows
  if (isAce(card)) {
    if (attackerIsAce) {
      // Ace-vs-Ace: invulnerability does not apply
      const absorbed = Math.min(incomingDamage, card.currentHp);
      const destroyed = card.currentHp - absorbed <= 0;
      return {
        remainingHp: destroyed ? 0 : card.currentHp - absorbed,
        overflow: incomingDamage - absorbed,
        destroyed,
        logStep: {
          target: isFrontRow ? 'frontCard' : 'backCard',
          card: cardLogLabel(card),
          damage: absorbed,
          remainingHp: destroyed ? 0 : card.currentHp - absorbed,
          destroyed,
          bonus: bonus,
        },
      };
    }
    // Normal attack on Ace: absorbs 1, stays at 1 HP
    const absorbed = Math.min(incomingDamage, 1);
    return {
      remainingHp: 1,
      overflow: incomingDamage - absorbed,
      destroyed: false,
      logStep: {
        target: isFrontRow ? 'frontCard' : 'backCard',
        card: cardLogLabel(card),
        damage: absorbed,
        remainingHp: 1,
        destroyed: false,
        bonus: bonus ?? 'Ace invulnerable',
      },
    };
  }

  // Normal card absorption
  // Diamond front row: effectiveHp is doubled, meaning the card absorbs more damage
  // and only takes real HP loss proportional to real HP / effective HP
  const absorbed = Math.min(incomingDamage, effectiveHp);
  const overflow = incomingDamage - absorbed;

  // Calculate real HP reduction: if defense is doubled, real HP loss is halved
  let realHpLoss: number;
  if (effectiveHp > card.currentHp && card.currentHp > 0) {
    // Diamond: scale damage down from effective HP space to real HP space
    realHpLoss = Math.ceil(absorbed * card.currentHp / effectiveHp);
  } else {
    realHpLoss = absorbed;
  }
  realHpLoss = Math.min(realHpLoss, card.currentHp);
  const newHp = card.currentHp - realHpLoss;
  const destroyed = newHp <= 0;

  return {
    remainingHp: destroyed ? 0 : newHp,
    overflow,
    destroyed,
    logStep: {
      target: isFrontRow ? 'frontCard' : 'backCard',
      card: cardLogLabel(card),
      damage: realHpLoss,
      remainingHp: destroyed ? 0 : newHp,
      destroyed,
      bonus,
    },
  };
}

/**
 * PHX-COMBAT-001 + PHX-OVERFLOW-001: Resolve an attack with overflow damage.
 * Damage flows through the target column: front → back → player LP.
 * Produces a combat log entry.
 */
export function resolveAttack(
  state: GameState,
  attackerPlayerIndex: number,
  attackerGridIndex: number,
  _targetGridIndex: number,
): GameState {
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
  const logEntry: CombatLogEntry = {
    turnNumber: state.turnNumber,
    attackerPlayerIndex,
    attackerCard: cardLogLabel(attacker),
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

  const combatLog = [...(state.combatLog ?? []), logEntry];

  return { ...state, players, combatLog };
}
