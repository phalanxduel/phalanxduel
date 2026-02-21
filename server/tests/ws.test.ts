import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';
import { buildApp } from '../src/app';
import type { ServerMessage } from '@phalanxduel/shared';

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

    it('should allow rngSeed in createMatch outside production', async () => {
      const ws1 = await connect();
      const ws2 = await connect();
      try {
        const createdPromise = waitForMessage(ws1);
        sendJson(ws1, {
          type: 'createMatch',
          playerName: 'Alice',
          rngSeed: 1337,
        });
        const created = await createdPromise;
        if (created.type !== 'matchCreated') throw new Error('Expected matchCreated');

        const ws2JoinMessages = collectMessages(ws2, 2);
        const ws1InitState = waitForMessage(ws1);
        sendJson(ws2, {
          type: 'joinMatch',
          matchId: created.matchId,
          playerName: 'Bob',
        });
        await ws2JoinMessages;
        const state = await ws1InitState;
        expect(state.type).toBe('gameState');
        if (state.type === 'gameState') {
          expect(state.state.rngSeed).toBe(1337);
        }
      } finally {
        ws1.close();
        ws2.close();
      }
    });

    it('should prioritize nested gameOptions.rngSeed over top-level rngSeed', async () => {
      const ws1 = await connect();
      const ws2 = await connect();
      try {
        const createdPromise = waitForMessage(ws1);
        sendJson(ws1, {
          type: 'createMatch',
          playerName: 'Alice',
          rngSeed: 100,
          gameOptions: { damageMode: 'cumulative', rngSeed: 200 },
        });
        const created = await createdPromise;
        if (created.type !== 'matchCreated') throw new Error('Expected matchCreated');

        const ws2JoinMessages = collectMessages(ws2, 2);
        const ws1InitState = waitForMessage(ws1);
        sendJson(ws2, {
          type: 'joinMatch',
          matchId: created.matchId,
          playerName: 'Bob',
        });
        await ws2JoinMessages;
        const state = await ws1InitState;
        expect(state.type).toBe('gameState');
        if (state.type === 'gameState') {
          expect(state.state.rngSeed).toBe(200);
        }
      } finally {
        ws1.close();
        ws2.close();
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
            column: 0,
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

  describe('rate limiting', () => {
    it('should reject messages when rate limit exceeded', async () => {
      const ws = await connect();
      try {
        // Send 12 messages rapidly (limit is 10/sec)
        const responsePromise = collectMessages(ws, 12);
        for (let i = 0; i < 12; i++) {
          sendJson(ws, { type: 'createMatch', playerName: `Player${i}` });
        }

        const responses = await responsePromise;

        // At least one should be rate limited
        const rateLimited = responses.find(
          (m) => m.type === 'matchError' && 'code' in m && m.code === 'RATE_LIMITED',
        );
        expect(rateLimited).toBeDefined();
      } finally {
        ws.close();
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

  describe('spectator mode', () => {
    it('Given a started match, when a spectator sends watchMatch, then they receive spectatorJoined followed by gameState', async () => {
      const ws1 = await connect();
      const ws2 = await connect();
      const wsSpec = await connect();
      try {
        // Start a match between two players
        const createdPromise = waitForMessage(ws1);
        sendJson(ws1, { type: 'createMatch', playerName: 'Alice' });
        const created = await createdPromise;
        if (created.type !== 'matchCreated') throw new Error('Expected matchCreated');

        const ws2Messages = collectMessages(ws2, 2);
        const ws1State = waitForMessage(ws1);
        sendJson(ws2, { type: 'joinMatch', matchId: created.matchId, playerName: 'Bob' });
        await ws2Messages;
        await ws1State;

        // Spectator joins
        const specMessages = collectMessages(wsSpec, 2);
        sendJson(wsSpec, { type: 'watchMatch', matchId: created.matchId });
        const [msg1, msg2] = await specMessages;

        expect(msg1!.type).toBe('spectatorJoined');
        if (!msg1 || msg1.type !== 'spectatorJoined') throw new Error('Expected spectatorJoined');
        expect(msg1.matchId).toBe(created.matchId);
        expect(msg1.spectatorId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        );
        expect(msg2!.type).toBe('gameState');
      } finally {
        ws1.close();
        ws2.close();
        wsSpec.close();
      }
    });

    it('Given a spectator watching, when a player takes an action, then the spectator receives the updated gameState', async () => {
      const ws1 = await connect();
      const ws2 = await connect();
      const wsSpec = await connect();
      try {
        // Start match
        const createdPromise = waitForMessage(ws1);
        sendJson(ws1, { type: 'createMatch', playerName: 'Alice' });
        const created = await createdPromise;
        if (created.type !== 'matchCreated') throw new Error('Expected matchCreated');

        const ws2JoinMessages = collectMessages(ws2, 2);
        const ws1InitState = waitForMessage(ws1);
        sendJson(ws2, { type: 'joinMatch', matchId: created.matchId, playerName: 'Bob' });
        await ws2JoinMessages;
        const initialState = await ws1InitState;
        if (initialState.type !== 'gameState') throw new Error('Expected gameState');

        // Spectator joins
        const specJoinMessages = collectMessages(wsSpec, 2);
        sendJson(wsSpec, { type: 'watchMatch', matchId: created.matchId });
        await specJoinMessages;

        // Player 0 deploys a card — spectator should get updated state
        const hand = initialState.state.players[0]!.hand;
        const card = hand[0]!;
        const specNextState = waitForMessage(wsSpec);

        sendJson(ws1, {
          type: 'action',
          matchId: created.matchId,
          action: { type: 'deploy', playerIndex: 0, card, column: 0 },
        });

        const specUpdate = await specNextState;
        expect(specUpdate.type).toBe('gameState');
        if (specUpdate.type === 'gameState') {
          // Spectator state has both hands redacted to empty arrays
          expect(specUpdate.state.players[0]!.hand).toHaveLength(0);
          expect(specUpdate.state.players[1]!.hand).toHaveLength(0);
          // But handCount reflects the real count
          expect(specUpdate.state.players[0]!.handCount).toBeGreaterThan(0);
        }
      } finally {
        ws1.close();
        ws2.close();
        wsSpec.close();
      }
    });

    it('Given a spectator watching, when the spectator disconnects, the game continues and player spectatorCount drops to 0', async () => {
      const ws1 = await connect();
      const ws2 = await connect();
      const wsSpec = await connect();
      try {
        // Start match
        const createdPromise = waitForMessage(ws1);
        sendJson(ws1, { type: 'createMatch', playerName: 'Alice' });
        const created = await createdPromise;
        if (created.type !== 'matchCreated') throw new Error('Expected matchCreated');

        const ws2JoinMessages = collectMessages(ws2, 2);
        const ws1InitState = waitForMessage(ws1);
        sendJson(ws2, { type: 'joinMatch', matchId: created.matchId, playerName: 'Bob' });
        await ws2JoinMessages;
        await ws1InitState;

        // Spectator joins — players should see spectatorCount: 1
        const specJoinMessages = collectMessages(wsSpec, 2);
        const ws1AfterSpec = waitForMessage(ws1);
        sendJson(wsSpec, { type: 'watchMatch', matchId: created.matchId });
        await specJoinMessages;
        const playerMsg = await ws1AfterSpec;
        expect(playerMsg.type).toBe('gameState');
        if (playerMsg.type === 'gameState') {
          expect(playerMsg.spectatorCount).toBe(1);
        }

        // Spectator disconnects — players should see spectatorCount: 0
        const ws1AfterDisconnect = waitForMessage(ws1);
        wsSpec.close();
        const afterDisconnect = await ws1AfterDisconnect;
        expect(afterDisconnect.type).toBe('gameState');
        if (afterDisconnect.type === 'gameState') {
          expect(afterDisconnect.spectatorCount).toBe(0);
        }
      } finally {
        ws1.close();
        ws2.close();
      }
    });

    it('Given a watchMatch for a non-existent match, then matchError MATCH_NOT_FOUND is returned', async () => {
      const ws = await connect();
      try {
        const msgPromise = waitForMessage(ws);
        sendJson(ws, { type: 'watchMatch', matchId: '00000000-0000-0000-0000-000000000000' });
        const msg = await msgPromise;
        expect(msg.type).toBe('matchError');
        if (msg.type === 'matchError') {
          expect(msg.code).toBe('MATCH_NOT_FOUND');
        }
      } finally {
        ws.close();
      }
    });

    it('Given a spectator connected, when they send an action, then matchError NOT_IN_MATCH is returned', async () => {
      const ws1 = await connect();
      const ws2 = await connect();
      const wsSpec = await connect();
      try {
        // Start match
        const createdPromise = waitForMessage(ws1);
        sendJson(ws1, { type: 'createMatch', playerName: 'Alice' });
        const created = await createdPromise;
        if (created.type !== 'matchCreated') throw new Error('Expected matchCreated');

        const ws2JoinMessages = collectMessages(ws2, 2);
        const ws1InitState = waitForMessage(ws1);
        sendJson(ws2, { type: 'joinMatch', matchId: created.matchId, playerName: 'Bob' });
        await ws2JoinMessages;
        const initialState = await ws1InitState;
        if (initialState.type !== 'gameState') throw new Error('Expected gameState');

        // Spectator joins
        const specJoinMessages = collectMessages(wsSpec, 2);
        sendJson(wsSpec, { type: 'watchMatch', matchId: created.matchId });
        await specJoinMessages;

        // Spectator tries to send an action
        const hand = initialState.state.players[0]!.hand;
        const card = hand[0]!;
        const errorMsg = waitForMessage(wsSpec);
        sendJson(wsSpec, {
          type: 'action',
          matchId: created.matchId,
          action: { type: 'deploy', playerIndex: 0, card, column: 0 },
        });
        const err = await errorMsg;
        expect(err.type).toBe('matchError');
        if (err.type === 'matchError') {
          expect(err.code).toBe('NOT_IN_MATCH');
        }
      } finally {
        ws1.close();
        ws2.close();
        wsSpec.close();
      }
    });
  });

  describe('production seed policy', () => {
    it('rejects seeded createMatch requests in production', async () => {
      const prevNodeEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'production';

      const prodApp = await buildApp();
      await prodApp.listen({ port: 0, host: '127.0.0.1' });
      const address = prodApp.server.address();
      if (typeof address === 'string' || !address) {
        await prodApp.close();
        throw new Error('Unexpected server address');
      }

      const ws = new WebSocket(`ws://127.0.0.1:${address.port}/ws`);
      try {
        await new Promise<void>((resolve, reject) => {
          ws.once('open', () => resolve());
          ws.once('error', reject);
        });
        const msgPromise = new Promise<ServerMessage>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('WS message timeout')), 5000);
          ws.once('message', (data) => {
            clearTimeout(timer);
            resolve(JSON.parse(data.toString()) as ServerMessage);
          });
        });
        ws.send(JSON.stringify({ type: 'createMatch', playerName: 'Alice', rngSeed: 123 }));
        const msg = await msgPromise;
        expect(msg.type).toBe('matchError');
        if (msg.type === 'matchError') {
          expect(msg.code).toBe('SEED_NOT_ALLOWED');
        }
      } finally {
        ws.close();
        await prodApp.close();
        if (prevNodeEnv === undefined) {
          delete process.env['NODE_ENV'];
        } else {
          process.env['NODE_ENV'] = prevNodeEnv;
        }
      }
    });
  });
});
