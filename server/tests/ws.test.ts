import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app';
import type { FastifyInstance } from 'fastify';
import WebSocket from 'ws';

const MOCK_TIMESTAMP = '2026-02-24T12:00:00.000Z';

describe('WebSocket integration', () => {
  let app: FastifyInstance;
  let serverUrl: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
    const addr = app.server.address() as { port: number };
    serverUrl = `ws://127.0.0.1:${addr.port}/ws`;
  });

  afterAll(async () => {
    await app.close();
  });

  async function connect(): Promise<WebSocket> {
    const ws = new WebSocket(serverUrl);
    return new Promise((resolve, reject) => {
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  }

  async function sendAndWait(ws: WebSocket, msg: unknown): Promise<unknown> {
    return new Promise((resolve) => {
      ws.once('message', (data) => resolve(JSON.parse(data.toString())));
      ws.send(JSON.stringify(msg));
    });
  }

  it('should create a match and return matchId', async () => {
    const ws = await connect();
    const response = await sendAndWait(ws, {
      type: 'createMatch',
      playerName: 'Alice',
    });

    expect(response.type).toBe('matchCreated');
    expect(response.matchId).toBeDefined();
    ws.close();
  });

  it('should receive matchError for invalid JSON', async () => {
    const ws = await connect();
    const response = await new Promise((resolve) => {
      ws.once('message', (data) => resolve(JSON.parse(data.toString())));
      ws.send('invalid json');
    });

    expect(response).toMatchObject({
      type: 'matchError',
      code: 'PARSE_ERROR',
    });
    ws.close();
  });

  it('should allow pass action in AttackPhase', async () => {
    const ws1 = await connect();
    const ws2 = await connect();

    const created = (await sendAndWait(ws1, {
      type: 'createMatch',
      playerName: 'Alice',
    })) as { matchId: string };
    const matchId = created.matchId;

    // Join match and wait for the initial gameState broadcast
    await sendAndWait(ws2, { type: 'joinMatch', matchId, playerName: 'Bob' });

    // Drain any pending messages from ws1 to ensure we get the next one
    const passResult = (await sendAndWait(ws1, {
      type: 'action',
      matchId,
      action: {
        type: 'pass',
        playerIndex: 0,
        timestamp: MOCK_TIMESTAMP,
      },
    })) as { type: string; result: { postState: { turnNumber: number } } };

    expect(passResult.type).toBe('gameState');
    expect(passResult.result.postState.turnNumber).toBe(1);

    ws1.close();
    ws2.close();
  });
});
