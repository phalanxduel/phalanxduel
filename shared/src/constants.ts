/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 *
 * Canonical cross-package constants for domain defaults, protocol timings,
 * and local development ports. Import from `@phalanxduel/shared` rather than
 * duplicating literals across server, client, admin, and mcp.
 */

export const MATCH_CONSTRAINTS = Object.freeze({
  rows: Object.freeze({ min: 1, max: 12 }),
  columns: Object.freeze({ min: 1, max: 12 }),
  maxHandSize: Object.freeze({ min: 0 }),
  startingLifepoints: Object.freeze({ min: 1, max: 500, default: 20 }),
  maxTotalSlots: 48,
});

export const PROTOCOL_TIMING = Object.freeze({
  heartbeatIntervalMs: 30_000,
  heartbeatTimeoutMs: 65_000,
  initialReconnectDelayMs: 1_000,
  maxReconnectDelayMs: 30_000,
  transportReceiptTtlMs: 10 * 60 * 1000,
  reconnectWindowMs: 2 * 60 * 1000,
  inactivityForfeitWindowMs: 30 * 60 * 1000,
  publicOpenMatchTtlMs: 30 * 60 * 1000,
  publicLobbyExpiringMs: 15 * 60 * 1000,
  recentExpiredWindowMs: 60 * 60 * 1000,
  minSpectatorDelayTurns: 2,
  defaultSpectatorDelayTurns: 3,
});

export const DEV_PORTS = Object.freeze({
  server: 3001,
  client: 5173,
  adminApi: 3102,
  adminUi: 3103,
  postgres: 5432,
});

export const MIGRATIONS_TABLE = 'schema_migrations';

export const LADDER_CATEGORIES = Object.freeze(['pvp', 'sp-random', 'sp-heuristic'] as const);
export type LadderCategory = (typeof LADDER_CATEGORIES)[number];
