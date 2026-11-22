/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 *
 * Zod-validated runtime configuration for `@phalanxduel/server`.
 * Operational TTLs and limits accept optional bounded env overrides while
 * gameplay/replay invariants remain immutable in `@phalanxduel/shared` and `@phalanxduel/engine`.
 */

import { z } from 'zod';
import { DEV_PORTS, PROTOCOL_TIMING } from '@phalanxduel/shared';

function optionalBoundedInt(min: number, max: number, fallback: number) {
  return z.preprocess(
    (val) => (val === undefined || val === '' ? fallback : val),
    z.coerce.number().int().min(min).max(max),
  );
}

function optionalNonEmptyString(fallback: string) {
  return z.preprocess(
    (val) => (typeof val === 'string' && val.trim().length > 0 ? val.trim() : fallback),
    z.string().min(1),
  );
}

const ServerConfigSchema = z.object({
  port: optionalBoundedInt(1, 65_535, DEV_PORTS.server),
  host: optionalNonEmptyString('::'),
  uiBaseUrl: optionalNonEmptyString(`http://localhost:${DEV_PORTS.client}`),
  systemEmail: optionalNonEmptyString('no-reply@phalanxduel.com'),
  supportEmail: z.literal('support@phalanxduel.com').default('support@phalanxduel.com'),
  maxSpectatorsPerMatch: optionalBoundedInt(0, 1_000, 50),
  reconnectWindowMs: optionalBoundedInt(5_000, 3_600_000, PROTOCOL_TIMING.reconnectWindowMs),
  inactivityForfeitWindowMs: optionalBoundedInt(
    30_000,
    86_400_000,
    PROTOCOL_TIMING.inactivityForfeitWindowMs,
  ),
  publicOpenMatchTtlMs: optionalBoundedInt(
    60_000,
    86_400_000,
    PROTOCOL_TIMING.publicOpenMatchTtlMs,
  ),
  gameOverTtlMs: optionalBoundedInt(10_000, 3_600_000, 5 * 60 * 1000),
  abandonedTtlMs: optionalBoundedInt(10_000, 3_600_000, 10 * 60 * 1000),
  maxLoginAttempts: optionalBoundedInt(1, 100, 5),
  lockoutDurationMs: optionalBoundedInt(10_000, 86_400_000, 15 * 60 * 1000),
  matchmakingEloBand: optionalBoundedInt(25, 2_000, 200),
  matchmakingMaxWaitMs: optionalBoundedInt(10_000, 3_600_000, 5 * 60 * 1000),
  ladderWindowDays: optionalBoundedInt(1, 365, 7),
  ladderStaleThresholdMs: optionalBoundedInt(60_000, 86_400_000, 60 * 60 * 1000),
});

export type ServerConfig = Readonly<z.infer<typeof ServerConfigSchema>>;

export function loadServerConfig(
  env: Record<string, string | undefined> = process.env,
): ServerConfig {
  const parsed = ServerConfigSchema.parse({
    port: env.PHALANX_SERVER_PORT,
    host: env.HOST,
    uiBaseUrl: env.UI_BASE_URL,
    systemEmail: env.SYSTEM_EMAIL,
    supportEmail: 'support@phalanxduel.com',
    maxSpectatorsPerMatch: env.PHALANX_MAX_SPECTATORS_PER_MATCH,
    reconnectWindowMs: env.PHALANX_RECONNECT_WINDOW_MS,
    inactivityForfeitWindowMs: env.PHALANX_INACTIVITY_FORFEIT_WINDOW_MS,
    publicOpenMatchTtlMs: env.PHALANX_PUBLIC_OPEN_MATCH_TTL_MS,
    gameOverTtlMs: env.PHALANX_GAME_OVER_TTL_MS,
    abandonedTtlMs: env.PHALANX_ABANDONED_TTL_MS,
    maxLoginAttempts: env.PHALANX_MAX_LOGIN_ATTEMPTS,
    lockoutDurationMs: env.PHALANX_LOCKOUT_DURATION_MS,
    matchmakingEloBand: env.PHALANX_MATCHMAKING_ELO_BAND,
    matchmakingMaxWaitMs: env.PHALANX_MATCHMAKING_MAX_WAIT_MS,
    ladderWindowDays: env.PHALANX_LADDER_WINDOW_DAYS,
    ladderStaleThresholdMs: env.PHALANX_LADDER_STALE_THRESHOLD_MS,
  });
  return Object.freeze(parsed);
}

let cachedServerConfig: ServerConfig | null = null;

export function getServerConfig(): ServerConfig {
  if (!cachedServerConfig) {
    cachedServerConfig = loadServerConfig();
  }
  return cachedServerConfig;
}

export function resetServerConfig(): void {
  cachedServerConfig = null;
}
