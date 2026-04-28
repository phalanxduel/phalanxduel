/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import { createHash } from 'node:crypto';

/**
 * Computes a deterministic SHA-256 hash of a JSON-serializable state object.
 * Keys are sorted recursively to ensure consistent ordering.
 */
export function computeStateHash(state: unknown): string {
  const json = JSON.stringify(state, (_key, value: unknown) => {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      return Object.keys(obj)
        .sort()
        .reduce<Record<string, unknown>>((sorted, k) => {
          sorted[k] = obj[k];
          return sorted;
        }, {});
    }
    return value;
  });
  return createHash('sha256').update(json).digest('hex');
}

/**
 * Computes the canonical TurnHash (RULES.md §20.2).
 * Formula: SHA-256(stateHashAfter + ":" + eventIds.join(":"))
 *
 * Intentionally simple — independently verifiable without the SDK.
 */
export function computeTurnHash(stateHashAfter: string, eventIds: string[]): string {
  return createHash('sha256')
    .update(stateHashAfter + ':' + eventIds.join(':'))
    .digest('hex');
}
