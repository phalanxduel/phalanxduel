import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app';
import type { ServerMessage } from '@phalanxduel/shared';
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';
import { LocalMatchManager } from '../src/match.js';
import { InMemoryLedgerStore } from '../src/db/ledger-store.js';
import type { MatchInstance } from '../src/match.js';

function withReliableMsgId(message: unknown): unknown {
  if (!message || typeof message !== 'object' || !('type' in message)) return message;
  const typedMessage = message as { type?: unknown; msgId?: unknown };
  if (
    typeof typedMessage.type !== 'string' ||
    typedMessage.type === 'ack' ||
    typedMessage.type === 'ping' ||
    typedMessage.type === 'pong' ||
    typeof typedMessage.msgId === 'string'
  ) {
    return message;
  }

  return {
    ...typedMessage,
    msgId: randomUUID(),
  };
}

async function sendAndWait(ws: WebSocket, msg: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const onMessage = (data: WebSocket.Data) => {
      ws.off('message', onMessage);
      resolve(JSON.parse(data.toString()));
    };
    ws.on('message', onMessage);
    ws.send(JSON.stringify(withReliableMsgId(msg)), (err) => {
      if (err) reject(err);
    });

    setTimeout(() => {
      ws.off('message', onMessage);
      reject(new Error('Timed out waiting for response'));
    }, 10000);
  });
}

function waitForMessageType<T>(ws: WebSocket, type: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const onMessage = (data: WebSocket.Data) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === type) {
        ws.off('message', onMessage);
        resolve(parsed);
      }
    };
    ws.on('message', onMessage);

    setTimeout(() => {
      ws.off('message', onMessage);
      reject(new Error(`Timed out waiting for message type ${type}`));
    }, 10000);
  });
}

function waitForFirstMatchingMessage<T>(
  ws: WebSocket,
  predicate: (message: T) => boolean,
  timeoutMs = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const onMessage = (data: WebSocket.Data) => {
      const parsed = JSON.parse(data.toString()) as T;
      if (predicate(parsed)) {
        ws.off('message', onMessage);
        resolve(parsed);
      }
    };
    ws.on('message', onMessage);

    setTimeout(() => {
      ws.off('message', onMessage);
      reject(new Error('Timed out waiting for matching message'));
    }, timeoutMs);
  });
}

async function connect(url: string, options: { origin?: string } = {}): Promise<WebSocket> {
  const ws = new WebSocket(url, {
    headers: {
      origin: options.origin || 'http://127.0.0.1:3001',
    },
  });
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  return ws;
}

function cloneMatch(match: MatchInstance): MatchInstance {
  const stripped = {
    ...match,
    players: match.players.map((player) =>
      player
        ? {
            ...player,
            socket: null,
          }
        : null,
    ),
    spectators: [],
  };
  return JSON.parse(JSON.stringify(stripped));
}

function makeRepoDouble() {
  const store = new Map<string, MatchInstance>();
  const eventLogs = new Map<string, MatchInstance['lifecycleEvents']>();

  return {
    saveMatch: async (match: MatchInstance) => {
      store.set(match.matchId, cloneMatch(match));
    },
    getMatch: async (matchId: string) => {
      const match = store.get(matchId);
      if (!match) return null;
      const cloned = cloneMatch(match);
      const lifecycleEvents = eventLogs.get(matchId);
      if (lifecycleEvents) {
        cloned.lifecycleEvents = structuredClone(lifecycleEvents);
      }
      return cloned;
    },
    saveEventLog: async (matchId: string, log: { events: MatchInstance['lifecycleEvents'] }) => {
      eventLogs.set(matchId, structuredClone(log.events));
    },
    saveTransactionLogEntry: async () => {},
    saveFinalStateHash: async () => {},
  };
}

async function listenWsApp(matchManager?: LocalMatchManager) {
  const app = await buildApp(matchManager ? { matchManager } : undefined);
  await app.listen({ port: 0, host: '127.0.0.1' });
  const address = app.server.address() as { port: number };
  return {
    app,
    url: `ws://127.0.0.1:${address.port}/ws`,
  };
}

describe('WebSocket integration', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let url: string;

  beforeAll(async () => {
    const listening = await listenWsApp();
    app = listening.app;
    url = listening.url;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('should reject connection with invalid origin', async () => {
    const ws = new WebSocket(url, {
      headers: { origin: 'http://malicious.com' },
    });
    const closePromise = new Promise<{ code: number; reason: string }>((resolve) => {
      ws.on('close', (code, reason) => {
        resolve({ code, reason: reason.toString() });
      });
    });
    const result = await closePromise;
    expect(result.code).toBe(1008);
    expect(result.reason).toBe('Invalid Origin');
  });

  it('should allow localhost dev origins', async () => {
    const ws = await connect(url, { origin: 'http://localhost:5173' });
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  it('should create a match and return matchId', async () => {
    const ws = await connect(url);

    const response = (await sendAndWait(ws, {
      type: 'createMatch',
      playerName: 'Alice',
    })) as { type: string; matchId: string };

    expect(response.type).toBe('matchCreated');
    expect(response.matchId).toBeTruthy();

    ws.close();
  });

  it('should receive matchError for invalid JSON', async () => {
    const ws = await connect(url);

    const responsePromise = new Promise((resolve) => {
      ws.on('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });

    ws.send('invalid json');
    const response = (await responsePromise) as { type: string; code: string };
    expect(response.type).toBe('matchError');
    expect(response.code).toBe('PARSE_ERROR');

    ws.close();
  });

  it('should allow deploy action in DeploymentPhase', async () => {
    const ws1 = await connect(url);
    const ws2 = await connect(url);

    const created = (await sendAndWait(ws1, {
      type: 'createMatch',
      playerName: 'Alice',
    })) as { matchId: string };
    const matchId = created.matchId;

    // Set up gameState listener BEFORE joining to avoid race condition
    const gameStatePromise = waitForMessageType<Extract<ServerMessage, { type: 'gameState' }>>(
      ws2,
      'gameState',
    );
    await sendAndWait(ws2, { type: 'joinMatch', matchId, playerName: 'Bob' });
    const initialMsg = await gameStatePromise;
    // Drain initialization state broadcast to avoid race in sendAndWait
    await new Promise((resolve) => setTimeout(resolve, 50));
    const cardId = initialMsg.result.postState.players[1]!.hand[0]!.id;

    const deployPromise = waitForFirstMatchingMessage<
      Extract<ServerMessage, { type: 'gameState' }>
    >(ws2, (m) => m.type === 'gameState' && m.result.action.type === 'deploy');
    ws2.send(
      JSON.stringify(
        withReliableMsgId({
          type: 'action',
          matchId,
          action: {
            type: 'deploy',
            playerIndex: 1,
            column: 0,
            cardId,
            timestamp: new Date().toISOString(),
          },
        }),
      ),
    );
    const deployResult = await deployPromise;

    expect(deployResult.type).toBe('gameState');
    expect(deployResult.result.action.type).toBe('deploy');

    ws1.close();
    ws2.close();
  });

  it('should initialize game state with createMatch matchParams from websocket', async () => {
    const ws1 = await connect(url);
    const ws2 = await connect(url);

    const created = (await sendAndWait(ws1, {
      type: 'createMatch',
      playerName: 'Alice',
      matchParams: { rows: 1, columns: 2 },
    })) as { matchId: string };
    const matchId = created.matchId;

    // Set up gameState listener BEFORE joining to avoid race condition
    const gameStatePromise = waitForMessageType<Extract<ServerMessage, { type: 'gameState' }>>(
      ws1,
      'gameState',
    );
    await sendAndWait(ws2, { type: 'joinMatch', matchId, playerName: 'Bob' });
    const msg = await gameStatePromise;
    expect(msg.result.postState.params.rows).toBe(1);
    expect(msg.result.postState.params.columns).toBe(2);

    ws1.close();
    ws2.close();
  });

  it('should allow two WS joins on a REST-created match and start the game', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/matches',
    });
    const matchId = res.json().matchId;

    const ws1 = await connect(url);
    const ws2 = await connect(url);

    await sendAndWait(ws1, {
      type: 'joinMatch',
      matchId,
      playerName: 'Alice',
    });

    const ws1GameStatePromise = waitForMessageType<{ type: 'gameState'; matchId: string }>(
      ws1,
      'gameState',
    );
    const ws2GameStatePromise = waitForMessageType<{
      type: 'gameState';
      matchId: string;
      result: { postState: { phase: string } };
    }>(ws2, 'gameState');

    ws2.send(
      JSON.stringify(
        withReliableMsgId({
          type: 'joinMatch',
          matchId,
          playerName: 'Bob',
        }),
      ),
    );

    const secondJoin = await waitForMessageType<Extract<ServerMessage, { type: 'matchJoined' }>>(
      ws2,
      'matchJoined',
    );
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

  it('should respond to authenticate with auth_error for invalid token', async () => {
    const ws = await connect(url);

    const response = (await sendAndWait(ws, {
      type: 'authenticate',
      token: 'invalid-jwt-token',
    })) as { type: string; error: string };

    expect(response.type).toBe('auth_error');
    expect(response.error).toBe('Invalid token');

    ws.close();
  });

  it('should allow a player to reconnect with rejoinMatch after disconnect', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/matches',
    });
    const matchId = res.json().matchId as string;

    const ws1 = await connect(url);
    const ws2 = await connect(url);

    const firstJoinPromise = waitForMessageType<Extract<ServerMessage, { type: 'matchJoined' }>>(
      ws1,
      'matchJoined',
    );
    const firstJoinAckPromise = waitForMessageType<Extract<ServerMessage, { type: 'ack' }>>(
      ws1,
      'ack',
    );
    ws1.send(
      JSON.stringify({
        type: 'joinMatch',
        matchId,
        playerName: 'Alice',
        msgId: 'b6455f94-1296-4bfe-8b6b-3ae1d64de417',
      }),
    );
    const [firstJoined, firstJoinAck] = await Promise.all([firstJoinPromise, firstJoinAckPromise]);
    expect(firstJoined.matchId).toBe(matchId);
    expect(firstJoinAck.ackedMsgId).toBe('b6455f94-1296-4bfe-8b6b-3ae1d64de417');

    const ws1DisconnectedPromise = waitForMessageType<
      Extract<ServerMessage, { type: 'opponentDisconnected' }>
    >(ws1, 'opponentDisconnected');
    const ws1ReconnectedPromise = waitForMessageType<
      Extract<ServerMessage, { type: 'opponentReconnected' }>
    >(ws1, 'opponentReconnected');

    const joinPromise = waitForMessageType<Extract<ServerMessage, { type: 'matchJoined' }>>(
      ws2,
      'matchJoined',
    );
    const joinAckPromise = waitForMessageType<Extract<ServerMessage, { type: 'ack' }>>(ws2, 'ack');
    ws2.send(
      JSON.stringify({
        type: 'joinMatch',
        matchId,
        playerName: 'Bob',
        msgId: '6d7f6c2d-9da8-4954-bba6-f2c44880b178',
      }),
    );
    const [joined, joinAck] = await Promise.all([joinPromise, joinAckPromise]);
    expect(joinAck.ackedMsgId).toBe('6d7f6c2d-9da8-4954-bba6-f2c44880b178');
    const playerId = joined.playerId;

    ws2.close();
    const disconnected = await ws1DisconnectedPromise;
    expect(disconnected.matchId).toBe(matchId);

    const ws2Rejoin = await connect(url);
    const rejoinPromise = waitForMessageType<Extract<ServerMessage, { type: 'matchJoined' }>>(
      ws2Rejoin,
      'matchJoined',
    );
    const rejoinAckPromise = waitForMessageType<Extract<ServerMessage, { type: 'ack' }>>(
      ws2Rejoin,
      'ack',
    );

    console.log('[DEBUG] sending rejoin with playerId:', playerId);
    ws2Rejoin.send(
      JSON.stringify({
        type: 'rejoinMatch',
        matchId,
        playerId,
        msgId: '8d902bbc-befb-4a44-b13d-387d4552d159',
      }),
    );
    const [rejoined, rejoinAck] = await Promise.all([rejoinPromise, rejoinAckPromise]);

    const reconnected = await ws1ReconnectedPromise;
    expect(reconnected.matchId).toBe(matchId);

    expect(rejoined).toMatchObject({
      type: 'matchJoined',
      matchId,
      playerId,
    });
    expect(rejoinAck.ackedMsgId).toBe('8d902bbc-befb-4a44-b13d-387d4552d159');

    ws1.close();
    ws2Rejoin.close();
  }, 15_000);

  it('should allow rejoinMatch after a server restart using the persisted resume contract', async () => {
    const repo = makeRepoDouble();
    const ledger = new InMemoryLedgerStore();
    const firstManager = new LocalMatchManager(repo as unknown as MatchRepository, ledger);
    (firstManager as unknown as { matchRepo: MatchRepository }).matchRepo =
      repo as unknown as MatchRepository;
    const firstListening = await listenWsApp(firstManager);

    const ws1 = await connect(firstListening.url);
    const ws2 = await connect(firstListening.url);

    // Alice creates
    const created = (await sendAndWait(ws1, {
      type: 'createMatch',
      playerName: 'Alice',
    })) as { matchId: string };
    const matchId = created.matchId;

    // Bob joins - use a waiter to avoid race with gameState
    const joinedPromiseInitial = waitForMessageType<
      Extract<ServerMessage, { type: 'matchJoined' }>
    >(ws2, 'matchJoined');
    ws2.send(JSON.stringify(withReliableMsgId({ type: 'joinMatch', matchId, playerName: 'Bob' })));
    const joined = await joinedPromiseInitial;
    const playerId = joined.playerId;

    // Disconnect Bob
    const disconnectedPromise = waitForMessageType<
      Extract<ServerMessage, { type: 'opponentDisconnected' }>
    >(ws1, 'opponentDisconnected');
    ws2.close();
    await disconnectedPromise;

    // Shutdown and restart
    await firstListening.app.close();

    const restartedManager = new LocalMatchManager(repo as unknown as MatchRepository, ledger);
    (restartedManager as unknown as { matchRepo: MatchRepository }).matchRepo =
      repo as unknown as MatchRepository;
    const restartedListening = await listenWsApp(restartedManager);

    const ws2Rejoin = await connect(restartedListening.url);
    const rejoinPromise = waitForMessageType<Extract<ServerMessage, { type: 'matchJoined' }>>(
      ws2Rejoin,
      'matchJoined',
    );
    const gameStatePromise = waitForMessageType<Extract<ServerMessage, { type: 'gameState' }>>(
      ws2Rejoin,
      'gameState',
    );

    console.log('[DEBUG] About to send rejoin. matchId:', matchId, 'playerId:', playerId);
    ws2Rejoin.send(
      JSON.stringify({
        type: 'rejoinMatch',
        matchId,
        playerId,
        msgId: 'd6c9552f-20a1-4988-a04f-a40f8f4b8a11',
      }),
    );

    await rejoinPromise;
    const gameState = await gameStatePromise;
    expect(gameState.matchId).toBe(matchId);

    ws1.close();
    ws2Rejoin.close();
    await restartedListening.app.close();
  }, 30_000);

  it('should replay cached responses for duplicate msgId deliveries', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/matches',
    });
    const matchId = res.json().matchId as string;

    const ws = await connect(url);
    const msgId = 'fec760cd-a072-49a1-a5f5-e49cfbbde459';

    const firstJoinedPromise = waitForFirstMatchingMessage<
      Extract<ServerMessage, { type: 'matchJoined' | 'matchError' }>
    >(ws, (message) => message.type === 'matchJoined' || message.type === 'matchError');
    const firstAckPromise = waitForMessageType<Extract<ServerMessage, { type: 'ack' }>>(ws, 'ack');
    ws.send(
      JSON.stringify({
        type: 'joinMatch',
        matchId,
        playerName: 'Alice',
        msgId,
      }),
    );
    const [firstJoined, firstAck] = await Promise.all([firstJoinedPromise, firstAckPromise]);
    if (firstJoined.type === 'matchError') {
      throw new Error(
        `expected initial matchJoined, received matchError: ${firstJoined.error} (${firstJoined.code})`,
      );
    }

    expect(firstJoined).toMatchObject({ type: 'matchJoined', matchId });
    expect(firstAck.ackedMsgId).toBe(msgId);

    const secondJoinedPromise = waitForFirstMatchingMessage<
      Extract<ServerMessage, { type: 'matchJoined' | 'matchError' }>
    >(ws, (message) => message.type === 'matchJoined' || message.type === 'matchError');
    const secondAckPromise = waitForMessageType<Extract<ServerMessage, { type: 'ack' }>>(ws, 'ack');
    ws.send(
      JSON.stringify({
        type: 'joinMatch',
        matchId,
        playerName: 'Alice',
        msgId,
      }),
    );
    const [secondJoined, secondAck] = await Promise.all([secondJoinedPromise, secondAckPromise]);
    if (secondJoined.type === 'matchError') {
      throw new Error(
        `expected replayed matchJoined, received matchError: ${secondJoined.error} (${secondJoined.code})`,
      );
    }

    expect(secondJoined).toMatchObject({
      type: 'matchJoined',
      matchId: firstJoined.matchId,
      playerId: firstJoined.playerId,
      playerIndex: firstJoined.playerIndex,
    });
    expect(secondAck.ackedMsgId).toBe(msgId);

    ws.close();
  }, 15_000);
});
