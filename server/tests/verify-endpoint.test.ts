/**
 * TASK-106: Durable Audit Trail — Verify endpoint tests.
 *
 * Tests the /api/matches/:matchId/verify endpoint for both in-memory
 * matches and the 404 fallback when no match exists.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../src/app.js';
import { AddressInfo } from 'node:net';

const UNKNOWN_MATCH_ID = '00000000-0000-0000-0000-000000000000';

describe('GET /api/matches/:matchId/verify', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let request: ReturnType<typeof supertest>;

  let baseUrl: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 0 }); // Listen on ephemeral port
    const port = (app.server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;
    request = supertest(app.server);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 404 for unknown matchId', async () => {
    const response = await request.get(`/api/matches/${UNKNOWN_MATCH_ID}/verify`);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      error: 'Match not found',
      code: 'MATCH_NOT_FOUND',
    });
  });

  it('returns valid verification for an active in-memory match', async () => {
    // Create a match via WebSocket so it exists in memory
    const ws1 = await connectWs(baseUrl);
    const createMsg = await sendAndReceive(ws1, {
      type: 'createMatch',
      playerName: 'Alice',
    });
    const matchId = createMsg.matchId as string;
    expect(matchId).toBeTruthy();

    // Join with second player to initialize the game
    const ws2 = await connectWs(baseUrl);
    await sendAndReceive(ws2, {
      type: 'joinMatch',
      matchId,
      playerName: 'Bob',
    });

    // Wait for game state to be broadcast
    await new Promise((r) => setTimeout(r, 200));

    // Verify the match
    const response = await request.get(`/api/matches/${matchId}/verify`);

    expect(response.status).toBe(200);
    expect(response.body.valid).toBe(true);
    expect(response.body.source).toBe('memory');
    expect(response.body.finalStateHash).toMatch(/^[0-9a-f]{64}$/);
    expect(response.body.actionCount).toBeGreaterThanOrEqual(0);

    ws1.close();
    ws2.close();
  });
});

// ── WebSocket helpers ──────────────────────────────────────────────────

import WebSocket from 'ws';

function connectWs(baseUrl: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const wsUrl = baseUrl.replace('http', 'ws') + '/ws';
    const ws = new WebSocket(wsUrl, {
      headers: {
        Origin: 'http://localhost:3001',
      },
    });
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function sendAndReceive(
  ws: WebSocket,
  msg: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebSocket timeout')), 2000);
    ws.once('message', (data: WebSocket.Data) => {
      clearTimeout(timer);
      resolve(JSON.parse(data.toString()));
    });
    ws.send(JSON.stringify(msg));
  });
}
