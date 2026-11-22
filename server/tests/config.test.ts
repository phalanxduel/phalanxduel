import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEV_PORTS, MATCH_CONSTRAINTS, PROTOCOL_TIMING } from '@phalanxduel/shared';
import { loadServerConfig } from '../src/config.js';
import { buildApp } from '../src/app.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');

describe('server runtime config & cross-package drift guard', () => {
  it('loads canonical defaults from @phalanxduel/shared when env vars are unset', () => {
    const cfg = loadServerConfig({});
    expect(cfg.port).toBe(DEV_PORTS.server);
    expect(cfg.uiBaseUrl).toBe(`http://localhost:${DEV_PORTS.client}`);
    expect(cfg.reconnectWindowMs).toBe(PROTOCOL_TIMING.reconnectWindowMs);
    expect(cfg.inactivityForfeitWindowMs).toBe(PROTOCOL_TIMING.inactivityForfeitWindowMs);
    expect(cfg.publicOpenMatchTtlMs).toBe(PROTOCOL_TIMING.publicOpenMatchTtlMs);
    expect(cfg.maxSpectatorsPerMatch).toBe(50);
    expect(Object.isFrozen(cfg)).toBe(true);
  });

  it('accepts bounded operational env overrides', () => {
    const cfg = loadServerConfig({
      PHALANX_SERVER_PORT: '4001',
      PHALANX_RECONNECT_WINDOW_MS: '60000',
      PHALANX_MAX_SPECTATORS_PER_MATCH: '120',
      UI_BASE_URL: 'https://play.lan.phalanxduel.com',
    });
    expect(cfg.port).toBe(4001);
    expect(cfg.reconnectWindowMs).toBe(60_000);
    expect(cfg.maxSpectatorsPerMatch).toBe(120);
    expect(cfg.uiBaseUrl).toBe('https://play.lan.phalanxduel.com');
  });

  it('rejects out-of-bounds operational env overrides', () => {
    expect(() => loadServerConfig({ PHALANX_SERVER_PORT: '99999' })).toThrow();
    expect(() => loadServerConfig({ PHALANX_RECONNECT_WINDOW_MS: '100' })).toThrow();
    expect(() => loadServerConfig({ PHALANX_MAX_LOGIN_ATTEMPTS: '0' })).toThrow();
  });

  it('exposes canonical match constraints and protocol timings via GET /api/defaults', async () => {
    const app = await buildApp();
    try {
      const res = await app.inject({ method: 'GET', url: '/api/defaults' });
      expect(res.statusCode).toBe(200);
      const body = res.json<{
        startingLifepoints: number;
        _meta: {
          constraints: { startingLifepoints: { min: number; max: number } };
          protocol: {
            heartbeatIntervalMs: number;
            heartbeatTimeoutMs: number;
            reconnectWindowMs: number;
            publicLobbyExpiringMs: number;
          };
        };
      }>();
      expect(body.startingLifepoints).toBe(MATCH_CONSTRAINTS.startingLifepoints.default);
      expect(body._meta.constraints.startingLifepoints).toEqual({
        min: MATCH_CONSTRAINTS.startingLifepoints.min,
        max: MATCH_CONSTRAINTS.startingLifepoints.max,
      });
      expect(body._meta.protocol.heartbeatIntervalMs).toBe(PROTOCOL_TIMING.heartbeatIntervalMs);
      expect(body._meta.protocol.heartbeatTimeoutMs).toBe(PROTOCOL_TIMING.heartbeatTimeoutMs);
      expect(body._meta.protocol.reconnectWindowMs).toBe(PROTOCOL_TIMING.reconnectWindowMs);
      expect(body._meta.protocol.publicLobbyExpiringMs).toBe(PROTOCOL_TIMING.publicLobbyExpiringMs);
    } finally {
      await app.close();
    }
  });

  it('prevents server and client from re-declaring hardcoded heartbeat literals', () => {
    const serverWs = readFileSync(resolve(repoRoot, 'server/src/ws-handler.ts'), 'utf8');
    const clientConn = readFileSync(resolve(repoRoot, 'client/src/connection.ts'), 'utf8');

    expect(serverWs).toContain('PROTOCOL_TIMING.heartbeatIntervalMs');
    expect(serverWs).toContain('PROTOCOL_TIMING.heartbeatTimeoutMs');
    expect(serverWs).not.toMatch(/APP_HEARTBEAT_INTERVAL_MS\s*=\s*\d/);
    expect(serverWs).not.toMatch(/APP_HEARTBEAT_TIMEOUT_MS\s*=\s*\d/);

    expect(clientConn).toContain('PROTOCOL_TIMING.heartbeatIntervalMs');
    expect(clientConn).toContain('PROTOCOL_TIMING.heartbeatTimeoutMs');
    expect(clientConn).not.toMatch(/HEARTBEAT_INTERVAL_MS\s*=\s*\d/);
    expect(clientConn).not.toMatch(/HEARTBEAT_TIMEOUT_MS\s*=\s*\d/);
  });
});
