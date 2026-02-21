import type { GameState, Battlefield, BattlefieldCard, CombatLogEntry } from '@phalanxduel/shared';
/**
 * Check if a target column is valid for attack.
 * PHX-COMBAT-001: Column-locked targeting. Always valid if column is in range.
 * Damage flows through the column via overflow (front → back → LP).
 */
export declare function isValidTarget(_opponentBattlefield: Battlefield, targetColumn: number): boolean;
/**
 * Get the base damage an attacker deals (before suit bonuses).
 */
export declare function getBaseAttackDamage(attacker: BattlefieldCard): number;
/**
 * PHX-DAMAGE-001: Reset surviving cards in a column to full HP.
 * Used in per-turn damage mode after attack resolution.
 * Only resets cards that are still alive (non-null). Destroyed cards stay gone.
 */
export declare function resetColumnHp(battlefield: Battlefield, column: number): Battlefield;
/**
 * PHX-COMBAT-001 + PHX-OVERFLOW-001: Resolve an attack with overflow damage.
 * Damage flows through the target column: front → back → player LP.
 * Returns updated state and a separate combat log entry for the caller.
 */
export declare function resolveAttack(state: GameState, attackerPlayerIndex: number, attackerGridIndex: number, _targetGridIndex: number): {
    state: GameState;
    combatEntry: CombatLogEntry;
};
//# sourceMappingURL=combat.d.ts.map