import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp } from '../src/app';
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';
import type { IMatchManager } from '../src/match.js';
import type { FastifyInstance } from 'fastify';
import { client } from '../src/db/index.js';

type Message = Record<string, unknown>;
type MatchCreated = Message & { matchId: string };
type MatchJoined = Message & { matchId: string };

function assertPostgresBackedAdversarialRun() {
  if (process.env.REQUIRE_ADVERSARIAL_POSTGRES === '1' && !client) {
    throw new Error('REQUIRE_ADVERSARIAL_POSTGRES=1 but DATABASE_URL did not initialize Postgres');
  }
}

async function resetAdversarialRows() {
  if (!client) return;
  await client`DELETE FROM match_actions`;
  await client`DELETE FROM transaction_logs`;
  await client`DELETE FROM match_results`;
  await client`DELETE FROM matches`;
}

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

async function listenWsApp() {
  const app = await buildApp();
  await app.listen({ port: 0, host: '127.0.0.1' });
  const address = app.server.address() as { port: number };
  return {
    app,
    url: `ws://127.0.0.1:${address.port}/ws`,
  };
}

function stateSnapshot(manager: IMatchManager, matchId: string): string {
  const match = manager.getMatchSync(matchId);
  if (!match?.state) throw new Error(`Match ${matchId} has no state`);
  return JSON.stringify(match.state);
}

function expectStateUnchanged(manager: IMatchManager, matchId: string, before: string) {
  expect(stateSnapshot(manager, matchId)).toBe(before);
}

async function createJoinedMatch(
  url: string,
): Promise<{ ws1: WebSocket; ws2: WebSocket; matchId: string }> {
  const ws1 = await connect(url);
  const ws2 = await connect(url);

  const p1Created = waitForMessageType<MatchCreated>(ws1, 'matchCreated');
  ws1.send(JSON.stringify({ type: 'createMatch', playerName: 'Alice', msgId: randomUUID() }));
  const { matchId } = await p1Created;

  const p2Joined = waitForMessageType<MatchJoined>(ws2, 'matchJoined');
  const p1View = waitForMessageType<Message>(ws1, 'gameState');
  const p2View = waitForMessageType<Message>(ws2, 'gameState');
  ws2.send(JSON.stringify({ type: 'joinMatch', matchId, playerName: 'Bob', msgId: randomUUID() }));
  await p2Joined;
  await p1View;
  await p2View;

  return { ws1, ws2, matchId };
}

describe('Adversarial Server Authority', { timeout: 30000 }, () => {
  let app: FastifyInstance | null;
  let url: string;
  let manager: IMatchManager;

  beforeEach(async () => {
    assertPostgresBackedAdversarialRun();
    await resetAdversarialRows();
    const listening = await listenWsApp();
    app = listening.app;
    url = listening.url;
    // @ts-expect-error test access to shared match manager
    manager = app.matchManager;
  });

  afterEach(async () => {
    await app?.close();
    app = null;
    await resetAdversarialRows();
  });

  it('PHX-ADV-001: rejects action from the wrong player (impersonation)', async () => {
    const { ws1, ws2, matchId } = await createJoinedMatch(url);
    const before = stateSnapshot(manager, matchId);

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
    expectStateUnchanged(manager, matchId, before);

    ws1.close();
    ws2.close();
  });

  it('PHX-ADV-002: rejects out-of-phase actions', async () => {
    const { ws1, ws2, matchId } = await createJoinedMatch(url);
    const before = stateSnapshot(manager, matchId);

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
    expectStateUnchanged(manager, matchId, before);

    ws1.close();
    ws2.close();
  });

  it('PHX-ADV-003: rejects actions with invalid card IDs', async () => {
    const { ws1, ws2, matchId } = await createJoinedMatch(url);
    const before = stateSnapshot(manager, matchId);

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
    expectStateUnchanged(manager, matchId, before);

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
    const { ws1, ws2, matchId } = await createJoinedMatch(url);

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
    const before = stateSnapshot(manager, matchId);

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
    expectStateUnchanged(manager, matchId, before);

    ws1.close();
    ws2.close();
  });

  it('PHX-ADV-006: handles duplicate action content with a different msgId safely', async () => {
    const { ws1, ws2, matchId } = await createJoinedMatch(url);

    const action = {
      type: 'action',
      matchId,
      msgId: randomUUID(),
      action: {
        type: 'forfeit',
        playerIndex: 0,
        timestamp: new Date().toISOString(),
      },
    };

    const p1Ack = waitForMessageType<unknown>(ws1, 'ack');
    ws1.send(JSON.stringify(action));
    await p1Ack;
    const beforeDuplicate = stateSnapshot(manager, matchId);

    // Same action content with a new msgId is not idempotent replay; it must reject cleanly.
    const duplicateWithNewMsgId = { ...action, msgId: randomUUID() };
    const p1Error = waitForMessageType<unknown>(ws1, 'actionError');
    ws1.send(JSON.stringify(duplicateWithNewMsgId));
    const response2 = await p1Error;

    expect(response2.code).toBe('ILLEGAL_ACTION');
    expectStateUnchanged(manager, matchId, beforeDuplicate);

    ws1.close();
    ws2.close();
  });

  it('PHX-ADV-007: rejects actions after player disconnects (socket mapping cleanup)', async () => {
    const { ws1, ws2, matchId } = await createJoinedMatch(url);
    const before = stateSnapshot(manager, matchId);

    ws1.close();

    // Wait a bit for server to process disconnect
    await new Promise((resolve) => setTimeout(resolve, 100));

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
    const response = await p3Error;

    expect(response.code).toBe('NOT_IN_MATCH');
    expectStateUnchanged(manager, matchId, before);

    ws2.close();
    ws3.close();
  });
});
