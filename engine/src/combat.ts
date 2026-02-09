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
 * PHX-COMBAT-001: Resolve a basic attack.
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

  const damage = getBaseAttackDamage(attacker);
  const newHp = Math.max(0, target.currentHp - damage);

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
