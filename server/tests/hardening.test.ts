/**
 * Hardening integration tests for server security and defensive branches.
 *
 * Covers branches in app.ts and match.ts that are not exercised by the
 * happy-path WS / HTTP tests. Tests are grouped by the feature they guard.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { WebSocket } from 'ws';
import { buildApp } from '../src/app';
import { MatchManager, MatchError, ActionError } from '../src/match';
import type { ServerMessage } from '@phalanxduel/shared';

// ---------------------------------------------------------------------------
// HTTP hardening (supertest)
// ---------------------------------------------------------------------------

describe('GET /debug/error — Sentry validation endpoint', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    request = supertest(app.server);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 500 Internal Server Error', async () => {
    const response = await request.get('/debug/error');
    expect(response.status).toBe(500);
  });
});

describe('Production hardening defaults', () => {
  const envSnapshot = { ...process.env };

  afterAll(() => {
    process.env = envSnapshot;
  });

  it('does not expose /debug/error by default in production', async () => {
    process.env = { ...envSnapshot, NODE_ENV: 'production' };
    delete process.env.PHALANX_ENABLE_DEBUG_ERROR_ROUTE;

    const app = await buildApp();
    await app.ready();
    const request = supertest(app.server);

    const response = await request.get('/debug/error');
    expect(response.status).toBe(404);

    await app.close();
  });

  it('does not accept fallback phalanx credentials in production without env configuration', async () => {
    process.env = { ...envSnapshot, NODE_ENV: 'production' };
    delete process.env.PHALANX_ADMIN_USER;
    delete process.env.PHALANX_ADMIN_PASSWORD;

    const app = await buildApp();
    await app.ready();
    const request = supertest(app.server);
    const fallbackCreds = Buffer.from('phalanx:phalanx').toString('base64');

    const response = await request.get('/admin').set('Authorization', `Basic ${fallbackCreds}`);
    expect(response.status).toBe(401);

    await app.close();
  });
});

describe('GET /admin — Basic Auth malformed credentials', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    request = supertest(app.server);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 401 for malformed base64 in Authorization header', async () => {
    // "Basic !!!" contains invalid base64 characters — exercises the catch branch
    const response = await request.get('/admin').set('Authorization', 'Basic !!!invalid!!!');
    expect(response.status).toBe(401);
  });

  it('should return 401 for Basic credentials with no colon separator', async () => {
    // "nocolon" decoded has no ":" — exercises the colonIndex === -1 branch
    const noColon = Buffer.from('nocolon').toString('base64');
    const response = await request.get('/admin').set('Authorization', `Basic ${noColon}`);
    expect(response.status).toBe(401);
  });

  it('should return 401 with no Authorization header', async () => {
    const response = await request.get('/admin');
    expect(response.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// WebSocket hardening (ws)
// ---------------------------------------------------------------------------

describe('WebSocket origin guard', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let port: number;

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();
    if (typeof address === 'string' || !address) throw new Error('No address');
    port = address.port;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should close the connection when Origin header is an untrusted domain', async () => {
    const closeCode = await new Promise<number>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, {
        headers: { origin: 'https://malicious.example.com' },
      });
      ws.on('close', (code) => resolve(code));
      ws.on('error', reject);
    });
    // 1008 = Policy Violation
    expect(closeCode).toBe(1008);
  });

  it('should accept connection when Origin header is absent (curl / server-to-server)', async () => {
    const opened = await new Promise<boolean>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      ws.on('open', () => {
        ws.close();
        resolve(true);
      });
      ws.on('error', reject);
    });
    expect(opened).toBe(true);
  });
});

describe('WebSocket payload size guard', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let port: number;

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();
    if (typeof address === 'string' || !address) throw new Error('No address');
    port = address.port;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should close connection when message payload exceeds 10 KB', async () => {
    const closeCode = await new Promise<number>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      ws.on('open', () => {
        // Send 11 KB of JSON-looking data
        const oversized = JSON.stringify({ type: 'action', data: 'x'.repeat(11 * 1024) });
        ws.send(oversized);
      });
      ws.on('close', (code) => resolve(code));
      ws.on('error', reject);
    });
    // 1009 = Message Too Big
    expect(closeCode).toBe(1009);
  });
});

describe('WebSocket rate limiting', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let port: number;

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();
    if (typeof address === 'string' || !address) throw new Error('No address');
    port = address.port;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return RATE_LIMITED error after more than 10 messages in 1 second', async () => {
    const messages: ServerMessage[] = [];

    const rateLimitedMsg = await new Promise<ServerMessage>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      ws.on('open', () => {
        // Send 15 tiny messages in rapid succession
        for (let i = 0; i < 15; i++) {
          ws.send(JSON.stringify({ type: 'pass', playerIndex: 0 }));
        }
      });
      ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString()) as ServerMessage;
        messages.push(msg);
        if (msg.type === 'matchError' && 'code' in msg && msg.code === 'RATE_LIMITED') {
          ws.close();
          resolve(msg);
        }
      });
      ws.on('close', () => {
        reject(
          new Error(
            `Connection closed before RATE_LIMITED; got: ${messages.map((m) => m.type).join(', ')}`,
          ),
        );
      });
      ws.on('error', reject);
    });

    expect(rateLimitedMsg.type).toBe('matchError');
    // @ts-expect-error — code is on matchError type
    expect(rateLimitedMsg.code).toBe('RATE_LIMITED');
  });
});

// ---------------------------------------------------------------------------
// MatchManager unit tests — uncovered branches in match.ts
// ---------------------------------------------------------------------------

describe('MatchManager.handleAction — defensive branches', () => {
  it('throws ActionError when game state is not initialized yet', async () => {
    const manager = new MatchManager();
    const { matchId } = manager.createMatch('Alice', {
      readyState: 1,
      send: () => {},
    } as unknown as import('ws').WebSocket);

    // State is null until both players join — try to act before joinMatch
    await expect(
      manager.handleAction(matchId, 'some-player-id', {
        type: 'pass',
        playerIndex: 0,
        timestamp: new Date().toISOString(),
      }),
    ).rejects.toThrow(ActionError);
  });

  it('throws ActionError when player ID is not in the match', async () => {
    const manager = new MatchManager();
    const socket0 = { readyState: 1, send: () => {} } as unknown as import('ws').WebSocket;
    const socket1 = { readyState: 1, send: () => {} } as unknown as import('ws').WebSocket;
    const { matchId } = manager.createMatch('Alice', socket0);
    manager.joinMatch(matchId, 'Bob', socket1);

    await expect(
      manager.handleAction(matchId, '00000000-0000-0000-0000-deadbeef0000', {
        type: 'pass',
        playerIndex: 0,
        timestamp: new Date().toISOString(),
      }),
    ).rejects.toThrow(ActionError);
  });

  it('throws MatchError for unknown matchId', async () => {
    const manager = new MatchManager();
    await expect(
      manager.handleAction('00000000-0000-0000-0000-000000000000', 'any-player', {
        type: 'pass',
        playerIndex: 0,
        timestamp: new Date().toISOString(),
      }),
    ).rejects.toThrow(MatchError);
  });
});

describe('MatchManager.cleanupMatches — spectator socket cleanup', () => {
  it('removes spectator socket references during cleanup', async () => {
    const manager = new MatchManager();
    const socket0 = { readyState: 1, send: () => {} } as unknown as import('ws').WebSocket;
    const socket1 = { readyState: 1, send: () => {} } as unknown as import('ws').WebSocket;
    const spectatorSocket = { readyState: 1, send: () => {} } as unknown as import('ws').WebSocket;

    const { matchId } = manager.createMatch('Alice', socket0);
    manager.joinMatch(matchId, 'Bob', socket1);

    // Manually force-expire the match's lastActivityAt to trigger TTL cleanup
    const match = manager.matches.get(matchId)!;
    // Add a spectator directly
    match.spectators.push({
      spectatorId: '00000000-0000-0000-0000-000000000099',
      socket: spectatorSocket,
    });
    manager.socketMap.set(spectatorSocket, { isSpectator: true, matchId });

    // Expire it: set lastActivityAt to over 10 minutes ago (abandoned TTL)
    match.lastActivityAt = Date.now() - 11 * 60 * 1000;

    const removed = manager.cleanupMatches();
    expect(removed).toBe(1);
    // Spectator socket should have been cleaned from socketMap
    expect(manager.socketMap.has(spectatorSocket)).toBe(false);
  });
});
