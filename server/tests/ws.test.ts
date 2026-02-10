import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';
import { buildApp } from '../src/app';
import type { ServerMessage } from '@phalanx/shared';

describe('WebSocket integration', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let baseUrl: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();
    if (typeof address === 'string' || !address) {
      throw new Error('Unexpected server address');
    }
    baseUrl = `127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  function connect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://${baseUrl}/ws`);
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  }

  function waitForMessage(ws: WebSocket, timeout = 5000): Promise<ServerMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('WS message timeout')), timeout);
      ws.once('message', (data) => {
        clearTimeout(timer);
        resolve(JSON.parse(data.toString()) as ServerMessage);
      });
    });
  }

  function collectMessages(ws: WebSocket, count: number, timeout = 5000): Promise<ServerMessage[]> {
    return new Promise((resolve, reject) => {
      const messages: ServerMessage[] = [];
      const timer = setTimeout(
        () => reject(new Error(`Expected ${count} messages, got ${messages.length}`)),
        timeout,
      );
      const onMessage = (data: unknown) => {
        messages.push(JSON.parse(String(data)) as ServerMessage);
        if (messages.length >= count) {
          clearTimeout(timer);
          ws.off('message', onMessage);
          resolve(messages);
        }
      };
      ws.on('message', onMessage);
    });
  }

  function sendJson(ws: WebSocket, data: unknown): void {
    ws.send(JSON.stringify(data));
  }

  describe('given a connected client', () => {
    it('should receive matchCreated when sending createMatch', async () => {
      const ws = await connect();
      try {
        const msgPromise = waitForMessage(ws);
        sendJson(ws, { type: 'createMatch', playerName: 'Alice' });

        const msg = await msgPromise;
        expect(msg.type).toBe('matchCreated');
        if (msg.type === 'matchCreated') {
          expect(msg.matchId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
          );
          expect(msg.playerId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
          );
          expect(msg.playerIndex).toBe(0);
        }
      } finally {
        ws.close();
      }
    });

    it('should receive matchError for invalid JSON', async () => {
      const ws = await connect();
      try {
        const msgPromise = waitForMessage(ws);
        ws.send('not json{{{');

        const msg = await msgPromise;
        expect(msg.type).toBe('matchError');
      } finally {
        ws.close();
      }
    });

    it('should receive matchError for invalid message format', async () => {
      const ws = await connect();
      try {
        const msgPromise = waitForMessage(ws);
        sendJson(ws, { type: 'unknownType', foo: 'bar' });

        const msg = await msgPromise;
        expect(msg.type).toBe('matchError');
      } finally {
        ws.close();
      }
    });
  });

  describe('given two clients joining a match', () => {
    it('should both receive gameState after joinMatch', async () => {
      const ws1 = await connect();
      const ws2 = await connect();
      try {
        // Client 1 creates match
        const createdPromise = waitForMessage(ws1);
        sendJson(ws1, { type: 'createMatch', playerName: 'Alice' });
        const created = await createdPromise;
        expect(created.type).toBe('matchCreated');
        if (created.type !== 'matchCreated') throw new Error('Expected matchCreated');

        // Client 2 joins — will receive matchJoined + gameState
        // Client 1 will receive gameState
        const ws2Messages = collectMessages(ws2, 2);
        const ws1State = waitForMessage(ws1);

        sendJson(ws2, {
          type: 'joinMatch',
          matchId: created.matchId,
          playerName: 'Bob',
        });

        const [msg2a, msg2b] = await ws2Messages;
        expect(msg2a!.type).toBe('matchJoined');
        expect(msg2b!.type).toBe('gameState');

        const state1 = await ws1State;
        expect(state1.type).toBe('gameState');
      } finally {
        ws1.close();
        ws2.close();
      }
    });

    it('should broadcast updated state after a valid action', async () => {
      const ws1 = await connect();
      const ws2 = await connect();
      try {
        // Create and join
        const createdPromise = waitForMessage(ws1);
        sendJson(ws1, { type: 'createMatch', playerName: 'Alice' });
        const created = await createdPromise;
        if (created.type !== 'matchCreated') throw new Error('Expected matchCreated');

        // ws2 joins: matchJoined + gameState; ws1 gets gameState
        const ws2JoinMessages = collectMessages(ws2, 2);
        const ws1InitState = waitForMessage(ws1);
        sendJson(ws2, {
          type: 'joinMatch',
          matchId: created.matchId,
          playerName: 'Bob',
        });
        await ws2JoinMessages;
        const initialState = await ws1InitState;
        if (initialState.type !== 'gameState') throw new Error('Expected gameState');

        // Get the first card from player 0's hand
        const hand = initialState.state.players[0]!.hand;
        const card = hand[0]!;

        // Player 0 deploys — both get updated gameState
        const statePromise1 = waitForMessage(ws1);
        const statePromise2 = waitForMessage(ws2);
        sendJson(ws1, {
          type: 'action',
          matchId: created.matchId,
          action: {
            type: 'deploy',
            playerIndex: 0,
            card: { suit: card.suit, rank: card.rank },
            position: { row: 0, col: 0 },
          },
        });

        const newState1 = await statePromise1;
        const newState2 = await statePromise2;
        expect(newState1.type).toBe('gameState');
        expect(newState2.type).toBe('gameState');
      } finally {
        ws1.close();
        ws2.close();
      }
    });
  });

  describe('POST /matches', () => {
    it('should create a match and return matchId', async () => {
      const response = await fetch(`http://${baseUrl}/matches`, {
        method: 'POST',
      });

      expect(response.status).toBe(201);
      const body = (await response.json()) as { matchId: string };
      expect(body.matchId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });
});
