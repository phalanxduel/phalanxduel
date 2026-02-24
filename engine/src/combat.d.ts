import type { GameState, Battlefield, BattlefieldCard, CombatLogEntry } from '@phalanxduel/shared';
/**
 * Check if a target column is valid for attack.
 * Damage flows through the column via overflow (front → back → LP).
 */
export declare function isValidTarget(_opponentBattlefield: Battlefield, targetColumn: number): boolean;
/**
 * Get the base damage an attacker deals (before suit bonuses).
 */
export declare function getBaseAttackDamage(attacker: BattlefieldCard): number;
/**
 * Used in per-turn damage mode after attack resolution.
 * Only resets cards that are still alive (non-null). Destroyed cards stay gone.
 */
export declare function resetColumnHp(battlefield: Battlefield, column: number): Battlefield;
/**
 * Damage flows through the target column: front → back → player LP.
 * Returns updated state and a separate combat log entry for the caller.
 */
export declare function resolveAttack(state: GameState, attackerPlayerIndex: number, attackerGridIndex: number, _targetGridIndex: number): {
    state: GameState;
    combatEntry: CombatLogEntry;
};
//# sourceMappingURL=combat.d.ts.map