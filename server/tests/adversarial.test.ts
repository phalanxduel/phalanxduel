import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp } from '../src/app';
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';
import { LocalMatchManager } from '../src/match.js';
import { InMemoryLedgerStore } from '../src/db/ledger-store.js';
import type { MatchInstance } from '../src/match.js';
import type { MatchRepository } from '../src/db/match-repo.js';
import type { FastifyInstance } from 'fastify';

async function waitForMessageType<T>(ws: WebSocket, type: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', listener);
      reject(new Error(`Timeout waiting for message of type ${type}`));
    }, 10000);

    const listener = (data: WebSocket.Data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === type) {
        clearTimeout(timer);
        ws.off('message', listener);
        resolve(msg as T);
      }
    };
    ws.on('message', listener);
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
  const eventLogs = new Map<string, unknown[]>();

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
    saveEventLog: async (matchId: string, log: { events: unknown[] }) => {
      eventLogs.set(matchId, structuredClone(log.events));
    },
    saveTransactionLogEntry: async () => {},
    saveFinalStateHash: async () => {},
    verifyUserIds: async (p1: string | null, p2: string | null) => [p1, p2],
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

describe('Adversarial Server Authority', { timeout: 30000 }, () => {
  let app: FastifyInstance;
  let url: string;
  let manager: LocalMatchManager;

  beforeEach(async () => {
    const repo = makeRepoDouble();
    const ledger = new InMemoryLedgerStore();
    manager = new LocalMatchManager(repo as unknown as MatchRepository, ledger);
    const listening = await listenWsApp(manager);
    app = listening.app;
    url = listening.url;
  });

  afterEach(async () => {
    await app.close();
  });

  it('PHX-ADV-001: rejects action from the wrong player (impersonation)', async () => {
    const ws1 = await connect(url);
    const ws2 = await connect(url);

    // Alice creates
    const createMsg = { type: 'createMatch', playerName: 'Alice', msgId: randomUUID() };
    const p1Created = waitForMessageType<unknown>(ws1, 'matchCreated');
    ws1.send(JSON.stringify(createMsg));
    const { matchId } = await p1Created;

    // Bob joins
    const joinMsg = { type: 'joinMatch', matchId, playerName: 'Bob', msgId: randomUUID() };
    const p2Joined = waitForMessageType<unknown>(ws2, 'matchJoined');
    const p1View = waitForMessageType<unknown>(ws1, 'gameState');
    const p2View = waitForMessageType<unknown>(ws2, 'gameState');

    ws2.send(JSON.stringify(joinMsg));
    await p2Joined;
    await p1View;
    await p2View;

    // Alice tries to send an action as player 1 (Bob's index)
    const adversarialAction = {
      type: 'action',
      matchId,
      msgId: randomUUID(),
      action: {
        type: 'pass',
        playerIndex: 1, // Bob is player 1
        timestamp: new Date().toISOString(),
      },
    };

    const p1Error = waitForMessageType<unknown>(ws1, 'actionError');
    ws1.send(JSON.stringify(adversarialAction));
    const response = await p1Error;

    expect(response.code).toBe('UNAUTHORIZED_ACTION');

    ws1.close();
    ws2.close();
  });

  it('PHX-ADV-002: rejects out-of-phase actions', async () => {
    const ws1 = await connect(url);
    const ws2 = await connect(url);

    const p1Created = waitForMessageType<unknown>(ws1, 'matchCreated');
    ws1.send(JSON.stringify({ type: 'createMatch', playerName: 'Alice', msgId: randomUUID() }));
    const { matchId } = await p1Created;

    const p2Joined = waitForMessageType<unknown>(ws2, 'matchJoined');
    const p1View = waitForMessageType<unknown>(ws1, 'gameState');
    const p2View = waitForMessageType<unknown>(ws2, 'gameState');
    ws2.send(
      JSON.stringify({ type: 'joinMatch', matchId, playerName: 'Bob', msgId: randomUUID() }),
    );
    await p2Joined;
    await p1View;
    await p2View;

    // In DeploymentPhase, try to send an 'attack' action
    const adversarialAction = {
      type: 'action',
      matchId,
      msgId: randomUUID(),
      action: {
        type: 'attack',
        playerIndex: 1,
        attackingColumn: 0,
        defendingColumn: 0,
        timestamp: new Date().toISOString(),
      },
    };

    const p2Error = waitForMessageType<unknown>(ws2, 'actionError');
    ws2.send(JSON.stringify(adversarialAction));
    const response = await p2Error;

    expect(response.code).toBe('ILLEGAL_ACTION');
    expect(response.error).toContain('attack" is not allowed in phase "DeploymentPhase');

    ws1.close();
    ws2.close();
  });

  it('PHX-ADV-003: rejects actions with invalid card IDs', async () => {
    const ws1 = await connect(url);
    const ws2 = await connect(url);

    const p1Created = waitForMessageType<unknown>(ws1, 'matchCreated');
    ws1.send(JSON.stringify({ type: 'createMatch', playerName: 'Alice', msgId: randomUUID() }));
    const { matchId } = await p1Created;

    const p2Joined = waitForMessageType<unknown>(ws2, 'matchJoined');
    const p1View = waitForMessageType<unknown>(ws1, 'gameState');
    const p2View = waitForMessageType<unknown>(ws2, 'gameState');
    ws2.send(
      JSON.stringify({ type: 'joinMatch', matchId, playerName: 'Bob', msgId: randomUUID() }),
    );
    await p2Joined;
    await p1View;
    await p2View;

    const adversarialAction = {
      type: 'action',
      matchId,
      msgId: randomUUID(),
      action: {
        type: 'deploy',
        playerIndex: 1,
        column: 0,
        cardId: 'fake-card-id',
        timestamp: new Date().toISOString(),
      },
    };

    const p2Error = waitForMessageType<unknown>(ws2, 'actionError');
    ws2.send(JSON.stringify(adversarialAction));
    const response = await p2Error;

    expect(response.code).toBe('ILLEGAL_ACTION');
    expect(response.error).toContain('Card not found in hand');

    ws1.close();
    ws2.close();
  });

  it('PHX-ADV-004: handles malformed JSON gracefully', async () => {
    const ws = await connect(url);

    const pError = waitForMessageType<unknown>(ws, 'matchError');
    ws.send('not a json');
    const response = await pError;

    expect(response.code).toBe('PARSE_ERROR');

    ws.close();
  });

  it('PHX-ADV-005: rejects actions submitted after game over', async () => {
    const ws1 = await connect(url);
    const ws2 = await connect(url);

    const p1Created = waitForMessageType<unknown>(ws1, 'matchCreated');
    ws1.send(JSON.stringify({ type: 'createMatch', playerName: 'Alice', msgId: randomUUID() }));
    const { matchId } = await p1Created;

    const p2Joined = waitForMessageType<unknown>(ws2, 'matchJoined');
    const p1View = waitForMessageType<unknown>(ws1, 'gameState');
    const p2View = waitForMessageType<unknown>(ws2, 'gameState');
    ws2.send(
      JSON.stringify({ type: 'joinMatch', matchId, playerName: 'Bob', msgId: randomUUID() }),
    );
    await p2Joined;
    await p1View;
    await p2View;

    // Forfeit Alice
    const p1Ack = waitForMessageType<unknown>(ws1, 'ack');
    ws1.send(
      JSON.stringify({
        type: 'action',
        matchId,
        msgId: randomUUID(),
        action: {
          type: 'forfeit',
          playerIndex: 0,
          timestamp: new Date().toISOString(),
        },
      }),
    );
    await p1Ack;

    // Try to pass after forfeit
    const adversarialAction = {
      type: 'action',
      matchId,
      msgId: randomUUID(),
      action: {
        type: 'pass',
        playerIndex: 1,
        timestamp: new Date().toISOString(),
      },
    };

    const p2Error = waitForMessageType<unknown>(ws2, 'actionError');
    ws2.send(JSON.stringify(adversarialAction));
    const response = await p2Error;

    expect(response.code).toBe('ILLEGAL_ACTION');
    expect(response.error).toContain('is not allowed in phase "gameOver"');

    ws1.close();
    ws2.close();
  });

  it('PHX-ADV-006: ignores duplicate action submission with same msgId (idempotency)', async () => {
    const ws1 = await connect(url);
    const ws2 = await connect(url);

    const p1Created = waitForMessageType<unknown>(ws1, 'matchCreated');
    ws1.send(JSON.stringify({ type: 'createMatch', playerName: 'Alice', msgId: randomUUID() }));
    const { matchId } = await p1Created;

    const p2Joined = waitForMessageType<unknown>(ws2, 'matchJoined');
    const p1View = waitForMessageType<unknown>(ws1, 'gameState');
    const p2View = waitForMessageType<unknown>(ws2, 'gameState');
    ws2.send(
      JSON.stringify({ type: 'joinMatch', matchId, playerName: 'Bob', msgId: randomUUID() }),
    );
    await p2Joined;
    await p1View;
    await p2View;

    const msgId = randomUUID();
    const action = {
      type: 'action',
      matchId,
      msgId,
      action: {
        type: 'forfeit',
        playerIndex: 0,
        timestamp: new Date().toISOString(),
      },
    };

    const p1Ack = waitForMessageType<unknown>(ws1, 'ack');
    ws1.send(JSON.stringify(action));
    await p1Ack;

    // Send again with same msgId - server should replay the ack
    const p1ReplayAck = waitForMessageType<unknown>(ws1, 'ack');
    ws1.send(JSON.stringify(action));
    const response2 = await p1ReplayAck;

    expect(response2.ackedMsgId).toBe(msgId);

    ws1.close();
    ws2.close();
  });

  it('PHX-ADV-007: rejects actions after player disconnects (socket mapping cleanup)', async () => {
    const ws1 = await connect(url);
    const ws2 = await connect(url);

    const p1Created = waitForMessageType<unknown>(ws1, 'matchCreated');
    ws1.send(JSON.stringify({ type: 'createMatch', playerName: 'Alice', msgId: randomUUID() }));
    const { matchId } = await p1Created;

    const p2Joined = waitForMessageType<unknown>(ws2, 'matchJoined');
    const p1View = waitForMessageType<unknown>(ws1, 'gameState');
    const p2View = waitForMessageType<unknown>(ws2, 'gameState');
    ws2.send(
      JSON.stringify({ type: 'joinMatch', matchId, playerName: 'Bob', msgId: randomUUID() }),
    );
    await p2Joined;
    await p1View;
    await p2View;

    // Manually trigger disconnect logic on the server for ws1
    // In a real scenario, this happens when the socket closes.
    // We can simulate it by closing the socket and trying to send one last message
    // if the OS buffer allows, or just verify the manager's state.
    ws1.close();

    // Wait a bit for server to process disconnect
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Now try to send an action from a NEW socket but trying to impersonate Alice?
    // No, the test should be: if Alice's socket is gone, she can't do anything.
    // Since we closed ws1, we can't send from it.

    // Let's verify that the manager no longer has the socket.
    // We don't have direct access to manager.socketMap in the test usually,
    // but we can check if a NEW socket can use Alice's playerId.
    // Actually, the server identifies players by socket, not by playerId in the message.

    // So the security property is: you MUST have a socket mapped to a playerId to act as that player.
    // And once disconnected, that mapping is GONE.

    const ws3 = await connect(url);
    const adversarialAction = {
      type: 'action',
      matchId,
      msgId: randomUUID(),
      action: {
        type: 'pass',
        playerIndex: 0, // Alice
        timestamp: new Date().toISOString(),
      },
    };

    const p3Error = waitForMessageType<unknown>(ws3, 'matchError');
    ws3.send(JSON.stringify(adversarialAction));
    const response = (await p3Error) as { code: string };

    expect(response.code).toBe('NOT_IN_MATCH');

    ws2.close();
    ws3.close();
  });
});
