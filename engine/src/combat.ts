import { RANK_VALUES } from '@phalanx/shared';
import type { GameState, PlayerState, Battlefield, BattlefieldCard } from '@phalanx/shared';

/**
 * Check if a target position is valid for attack.
 * PHX-COMBAT-001: Can only target front-row cards unless front-row column is empty.
 */
export function isValidTarget(
  opponentBattlefield: Battlefield,
  targetGridIndex: number,
): boolean {
  if (targetGridIndex < 0 || targetGridIndex >= 8) return false;

  const target = opponentBattlefield[targetGridIndex];
  if (!target) return false;

  // If target is in front row (0-3), always valid
  if (targetGridIndex < 4) return true;

  // Target is in back row (4-7). Only valid if front-row column is empty.
  const frontRowIndex = targetGridIndex - 4;
  return opponentBattlefield[frontRowIndex] === null;
}

/**
 * Get the base damage an attacker deals (before suit bonuses).
 */
export function getBaseAttackDamage(attacker: BattlefieldCard): number {
  return RANK_VALUES[attacker.card.rank] ?? 0;
}

/**
 * PHX-SUIT-003: Club ×2 damage to back-row targets.
 */
function applyAttackerSuitBonus(baseDamage: number, attacker: BattlefieldCard, targetGridIndex: number): number {
  if (attacker.card.suit === 'clubs' && targetGridIndex >= 4) {
    return baseDamage * 2;
  }
  return baseDamage;
}

/**
 * PHX-ACE-001: Check if a card is an Ace.
 */
function isAce(card: BattlefieldCard): boolean {
  return card.card.rank === 'A';
}

/**
 * Calculate actual HP reduction for a target after combat.
 * Accounts for suit defensive bonuses and Ace invulnerability.
 */
function calculateHpReduction(
  damage: number,
  target: BattlefieldCard,
  targetGridIndex: number,
  battlefield: Battlefield,
  attacker: BattlefieldCard,
): number {
  // PHX-ACE-001: Ace invulnerability — HP never goes below 1, except Ace-vs-Ace
  if (isAce(target) && isAce(attacker)) {
    // Ace-vs-Ace: invulnerability does not apply, normal damage
    return Math.min(damage, target.currentHp);
  }
  if (isAce(target)) {
    // Ace absorbs damage but HP never goes below 1
    return Math.min(damage, target.currentHp - 1);
  }

  // Suit defense bonuses: reduce incoming damage
  if (target.card.suit === 'diamonds' && targetGridIndex < 4) {
    // Diamond front-row: effectively halve incoming damage (defense is doubled)
    const effectiveDamage = Math.ceil(damage / 2);
    return Math.min(effectiveDamage, target.currentHp);
  }

  if (target.card.suit === 'hearts') {
    const cardCount = battlefield.filter(s => s !== null).length;
    if (cardCount === 1) {
      // Heart last card: effectively halve incoming damage
      const effectiveDamage = Math.ceil(damage / 2);
      return Math.min(effectiveDamage, target.currentHp);
    }
  }

  return Math.min(damage, target.currentHp);
}

/**
 * PHX-COMBAT-001: Resolve a basic attack with suit bonuses.
 * Attacker deals damage to target. If target HP reaches 0, it's destroyed.
 * Attacker remains on the battlefield.
 */
export function resolveAttack(
  state: GameState,
  attackerPlayerIndex: number,
  attackerGridIndex: number,
  targetGridIndex: number,
): GameState {
  const defenderIndex = attackerPlayerIndex === 0 ? 1 : 0;
  const attacker = state.players[attackerPlayerIndex]?.battlefield[attackerGridIndex];
  const target = state.players[defenderIndex]?.battlefield[targetGridIndex];

  if (!attacker) {
    throw new Error(`No card at attacker position ${attackerGridIndex}`);
  }
  if (!target) {
    throw new Error(`No card at target position ${targetGridIndex}`);
  }

  const defenderBattlefield = state.players[defenderIndex]!.battlefield;
  if (!isValidTarget(defenderBattlefield, targetGridIndex)) {
    throw new Error(`Target at position ${targetGridIndex} is not a valid target`);
  }

  // Calculate damage with attacker suit bonus
  const baseDamage = getBaseAttackDamage(attacker);
  const damage = applyAttackerSuitBonus(baseDamage, attacker, targetGridIndex);

  // Calculate HP reduction with defender suit bonuses and Ace rules
  const hpReduction = calculateHpReduction(damage, target, targetGridIndex, defenderBattlefield, attacker);
  const newHp = target.currentHp - hpReduction;

  const newDefenderBattlefield = [...defenderBattlefield] as Battlefield;
  const defender = state.players[defenderIndex]!;

  if (newHp <= 0) {
    // Card destroyed — move to discard pile
    newDefenderBattlefield[targetGridIndex] = null;
    const updatedDefender: PlayerState = {
      ...defender,
      battlefield: newDefenderBattlefield,
      discardPile: [...defender.discardPile, target.card],
    };
    const players: [PlayerState, PlayerState] = [state.players[0]!, state.players[1]!];
    players[defenderIndex] = updatedDefender;
    return { ...state, players };
  } else {
    // Card survives with reduced HP
    newDefenderBattlefield[targetGridIndex] = {
      ...target,
      currentHp: newHp,
    };
    const updatedDefender: PlayerState = {
      ...defender,
      battlefield: newDefenderBattlefield,
    };
    const players: [PlayerState, PlayerState] = [state.players[0]!, state.players[1]!];
    players[defenderIndex] = updatedDefender;
    return { ...state, players };
  }
}

