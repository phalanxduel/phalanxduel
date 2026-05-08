/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */
/**
 * Computes a deterministic SHA-256 hash of a JSON-serializable state object.
 * Keys are sorted recursively to ensure consistent ordering.
 */
export declare function computeStateHash(state: unknown): string;
/**
 * Computes the canonical TurnHash (RULES.md §20.2).
 * Formula: SHA-256(stateHashAfter + ":" + eventIds.join(":"))
 *
 * Intentionally simple — independently verifiable without the SDK.
 */
export declare function computeTurnHash(stateHashAfter: string, eventIds: string[]): string;
//# sourceMappingURL=hash.d.ts.map