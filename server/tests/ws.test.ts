import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app';
import type { FastifyInstance } from 'fastify';
import WebSocket from 'ws';
import supertest from 'supertest';

const MOCK_TIMESTAMP = '2026-02-24T12:00:00.000Z';

describe('WebSocket integration', () => {
  let app: FastifyInstance;
  let serverUrl: string;
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
    const addr = app.server.address() as { port: number };
    serverUrl = `ws://127.0.0.1:${addr.port}/ws`;
    request = supertest(app.server);
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

  async function waitForMessageType<T extends { type: string }>(
    ws: WebSocket,
    type: T['type'],
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.off('message', onMessage);
        reject(new Error(`Timed out waiting for message type ${type}`));
      }, 2000);

      const onMessage = (data: WebSocket.RawData) => {
        const parsed = JSON.parse(data.toString()) as T;
        if (parsed.type !== type) return;
        clearTimeout(timeout);
        ws.off('message', onMessage);
        resolve(parsed);
      };

      ws.on('message', onMessage);
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
      gameOptions: { damageMode: 'cumulative' },
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

  it('should allow two WS joins on a REST-created match and start the game', async () => {
    const createRes = await request.post('/matches');
    expect(createRes.status).toBe(201);
    const matchId = createRes.body.matchId as string;

    const ws1 = await connect();
    const ws2 = await connect();

    const firstJoin = (await sendAndWait(ws1, {
      type: 'joinMatch',
      matchId,
      playerName: 'Alice',
    })) as { type: string; playerIndex: number };
    expect(firstJoin.type).toBe('matchJoined');
    expect(firstJoin.playerIndex).toBe(0);

    const ws1GameStatePromise = waitForMessageType<{ type: 'gameState'; matchId: string }>(
      ws1,
      'gameState',
    );
    const ws2GameStatePromise = waitForMessageType<{
      type: 'gameState';
      matchId: string;
      result: { postState: { phase: string } };
    }>(ws2, 'gameState');

    const secondJoin = (await sendAndWait(ws2, {
      type: 'joinMatch',
      matchId,
      playerName: 'Bob',
    })) as { type: string; playerIndex: number };
    expect(secondJoin.type).toBe('matchJoined');
    expect(secondJoin.playerIndex).toBe(1);

    const [ws1GameState, ws2GameState] = await Promise.all([
      ws1GameStatePromise,
      ws2GameStatePromise,
    ]);
    expect(ws1GameState.matchId).toBe(matchId);
    expect(ws2GameState.matchId).toBe(matchId);
    expect(['DeploymentPhase', 'AttackPhase']).toContain(ws2GameState.result.postState.phase);

    ws1.close();
    ws2.close();
  });
});
