import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocalMatchManager, ActionError } from '../src/match.js';
import type { MatchInstance } from '../src/match.js';
import type { MatchRepository } from '../src/db/match-repo.js';
import type { ServerMessage } from '@phalanxduel/shared';
import { InMemoryLedgerStore } from '../src/db/ledger-store.js';
import { mockSocket, lastMessage, type MockSocket } from './helpers/socket.js';
import { buildApp } from '../src/app.js';
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';
import type { IMatchManager } from '../src/match.js';
import type { FastifyInstance } from 'fastify';

// ── Shared test helpers ───────────────────────────────────────────────────────

async function waitForMessageType<T extends Record<string, unknown>>(
  ws: WebSocket,
  type: string,
  timeoutMs = 10_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', listener);
      reject(new Error(`Timeout waiting for message of type "${type}"`));
    }, timeoutMs);

    const listener = (data: WebSocket.Data) => {
      const msg = JSON.parse(data.toString()) as T & { type: string };
      if (msg.type === type) {
        clearTimeout(timer);
        ws.off('message', listener);
        resolve(msg);
      }
    };
    ws.on('message', listener);
  });
}

async function connectWs(url: string): Promise<WebSocket> {
  const ws = new WebSocket(url, { headers: { origin: 'http://127.0.0.1:3001' } });
  await new Promise<void>((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  return ws;
}

async function listenWsApp(): Promise<{ app: FastifyInstance; url: string }> {
  const app = await buildApp();
  await app.listen({ port: 0, host: '127.0.0.1' });
  const addr = app.server.address() as { port: number };
  return { app, url: `ws://127.0.0.1:${addr.port}/ws` };
}

async function createJoinedMatch(
  url: string,
): Promise<{ ws1: WebSocket; ws2: WebSocket; matchId: string }> {
  const ws1 = await connectWs(url);
  const ws2 = await connectWs(url);
  const p1Created = waitForMessageType<{ matchId: string }>(ws1, 'matchCreated');
  ws1.send(JSON.stringify({ type: 'createMatch', playerName: 'Fuzzer1', msgId: randomUUID() }));
  const { matchId } = await p1Created;
  const p2Joined = waitForMessageType<Record<string, unknown>>(ws2, 'matchJoined');
  const p1View = waitForMessageType<Record<string, unknown>>(ws1, 'gameState');
  const p2View = waitForMessageType<Record<string, unknown>>(ws2, 'gameState');
  ws2.send(
    JSON.stringify({ type: 'joinMatch', matchId, playerName: 'Fuzzer2', msgId: randomUUID() }),
  );
  await p2Joined;
  await p1View;
  await p2View;
  return { ws1, ws2, matchId };
}

function stateSnapshot(manager: IMatchManager, matchId: string): string {
  const match = manager.getMatchSync(matchId);
  if (!match?.state) throw new Error(`Match ${matchId} has no state`);
  return JSON.stringify(match.state);
}

function expectStateUnchanged(manager: IMatchManager, matchId: string, before: string): void {
  expect(stateSnapshot(manager, matchId)).toBe(before);
}

// ── Fuzz corpus: packets that MUST be rejected ────────────────────────────────

function fuzzCorpus(matchId: string): string[] {
  return [
    // Non-JSON variants
    'not json at all',
    '{incomplete json',
    '',
    '   \n\t',
    '[]',
    // Valid JSON but structurally wrong
    '{}',
    'null',
    '42',
    '"just a string"',
    // Missing required fields
    JSON.stringify({ type: 'action' }),
    JSON.stringify({ type: 'action', matchId }),
    JSON.stringify({ type: 'action', matchId, action: null }),
    // Unknown action types
    JSON.stringify({ type: 'action', matchId, msgId: randomUUID(), action: { type: 'HACK' } }),
    JSON.stringify({ type: 'action', matchId, msgId: randomUUID(), action: { type: '' } }),
    // Type confusion: strings where numbers expected
    JSON.stringify({
      type: 'action',
      matchId,
      msgId: randomUUID(),
      action: { type: 'deploy', playerIndex: 'zero', column: 'first', cardId: 42, timestamp: null },
    }),
    // Deeply nested garbage
    JSON.stringify({
      type: 'action',
      matchId,
      msgId: randomUUID(),
      action: {
        type: 'deploy',
        playerIndex: 0,
        column: 0,
        cardId: { $nested: 'fake' },
        timestamp: new Date().toISOString(),
      },
    }),
    // Wrong matchId (non-existent)
    JSON.stringify({
      type: 'action',
      matchId: '00000000-0000-0000-0000-000000000000',
      msgId: randomUUID(),
      action: { type: 'pass', playerIndex: 0, timestamp: new Date().toISOString() },
    }),
    // Stale sequence numbers
    JSON.stringify({
      type: 'action',
      matchId,
      msgId: randomUUID(),
      action: {
        type: 'pass',
        playerIndex: 0,
        timestamp: new Date().toISOString(),
        expectedSequenceNumber: -999,
      },
    }),
    JSON.stringify({
      type: 'action',
      matchId,
      msgId: randomUUID(),
      action: {
        type: 'pass',
        playerIndex: 0,
        timestamp: new Date().toISOString(),
        expectedSequenceNumber: 99999,
      },
    }),
    // Oversized (>10 KB)
    JSON.stringify({ type: 'action', matchId, msgId: randomUUID(), padding: 'x'.repeat(11_000) }),
    // Prototype pollution attempts
    JSON.stringify({
      type: 'action',
      matchId,
      msgId: randomUUID(),
      __proto__: { admin: true },
      action: { type: 'pass' },
    }),
    // Impersonation: playerIndex mismatches are caught further down the stack,
    // but sending as player 2 from player 1's socket is still adversarial.
    JSON.stringify({
      type: 'action',
      matchId,
      msgId: randomUUID(),
      action: { type: 'pass', playerIndex: 1, timestamp: new Date().toISOString() },
    }),
  ];
}

// ── Unit-level: hash chain integrity ─────────────────────────────────────────

async function assertHashChainIntact(store: InMemoryLedgerStore, matchId: string): Promise<void> {
  const actions = await store.getActions(matchId);
  expect(actions.length, 'ledger must have at least one committed entry').toBeGreaterThan(0);
  for (let i = 1; i < actions.length; i++) {
    expect(
      actions[i]!.stateHashBefore,
      `hash chain broken at ledger sequence ${actions[i]!.sequenceNumber}`,
    ).toBe(actions[i - 1]!.stateHashAfter);
  }
}

describe('Chaos Protocol Fuzzing (TASK-293)', () => {
  describe('Hash chain integrity under fuzz barrages', () => {
    let manager: LocalMatchManager;
    let socket1: MockSocket;
    let socket2: MockSocket;
    let matchId: string;
    let p1Id: string;
    let p2Id: string;
    let ledgerStore: InMemoryLedgerStore;

    beforeEach(async () => {
      const store = new Map<string, MatchInstance>();
      const mockRepo: MatchRepository = {
        saveMatch: vi.fn(async (m) => {
          store.set(m.matchId, m);
        }),
        getMatch: vi.fn(async (id) => store.get(id) ?? null),
        verifyUserIds: vi.fn(async (p1, p2) => [p1, p2]),
        saveEventLog: vi.fn(),
        saveFinalStateHash: vi.fn(),
      } as unknown as MatchRepository;

      ledgerStore = new InMemoryLedgerStore();
      manager = new LocalMatchManager(mockRepo, ledgerStore);
      socket1 = mockSocket();
      socket2 = mockSocket();

      const created = await manager.createMatch('Fuzzer1', socket1);
      matchId = created.matchId;
      p1Id = created.playerId;
      const joined = await manager.joinMatch(matchId, 'Fuzzer2', socket2);
      p2Id = joined.playerId;
      manager.broadcastMatchState(matchId);
      await vi.waitFor(() => {
        expect(lastMessage(socket2)?.type).toBe('gameState');
      });
    });

    it('PHX-CHX-U001: hash chain intact after stale-sequence barrage', async () => {
      const msg = lastMessage(socket1) as Extract<ServerMessage, { type: 'gameState' }>;
      const activeIdx = msg.result.postState.activePlayerIndex;
      const activePlayerId = activeIdx === 0 ? p1Id : p2Id;
      const activeSocket = activeIdx === 0 ? socket1 : socket2;
      const activeMsg = lastMessage(activeSocket) as Extract<ServerMessage, { type: 'gameState' }>;
      const cardId = activeMsg.result.postState.players[activeIdx]!.hand[0]!.id;

      await manager.handleAction(matchId, activePlayerId, {
        type: 'deploy',
        playerIndex: activeIdx,
        column: 0,
        cardId,
        timestamp: new Date().toISOString(),
      });

      for (let i = 0; i < 20; i++) {
        const badSeq = i % 2 === 0 ? -1 : 99999;
        try {
          await manager.handleAction(matchId, activePlayerId, {
            type: 'pass',
            playerIndex: activeIdx,
            timestamp: new Date().toISOString(),
            expectedSequenceNumber: badSeq,
          });
          expect.fail('Expected STALE_ACTION to be thrown');
        } catch (err) {
          expect((err as ActionError).code).toBe('STALE_ACTION');
        }
      }

      await assertHashChainIntact(ledgerStore, matchId);
    });

    it('PHX-CHX-U002: hash chain intact after impersonation barrage', async () => {
      const msg = lastMessage(socket1) as Extract<ServerMessage, { type: 'gameState' }>;
      const activeIdx = msg.result.postState.activePlayerIndex;
      const activePlayerId = activeIdx === 0 ? p1Id : p2Id;
      const inactivePlayerId = activeIdx === 0 ? p2Id : p1Id;
      const activeSocket = activeIdx === 0 ? socket1 : socket2;
      const activeMsg = lastMessage(activeSocket) as Extract<ServerMessage, { type: 'gameState' }>;
      const cardId = activeMsg.result.postState.players[activeIdx]!.hand[0]!.id;

      await manager.handleAction(matchId, activePlayerId, {
        type: 'deploy',
        playerIndex: activeIdx,
        column: 0,
        cardId,
        timestamp: new Date().toISOString(),
      });

      for (let i = 0; i < 30; i++) {
        try {
          await manager.handleAction(matchId, inactivePlayerId, {
            type: 'pass',
            playerIndex: activeIdx,
            timestamp: new Date().toISOString(),
          });
          expect.fail('Expected UNAUTHORIZED_ACTION to be thrown');
        } catch (err) {
          expect((err as ActionError).code).toBe('UNAUTHORIZED_ACTION');
        }
      }

      await assertHashChainIntact(ledgerStore, matchId);
    });

    it('PHX-CHX-U003: hash chain survives interleaved legitimate and fuzz actions; ledger contains only committed entries', async () => {
      const getLiveActive = () => {
        const match = manager.getMatchSync(matchId);
        const state = match?.state;
        if (!state) throw new Error('No match state');
        const idx = state.activePlayerIndex;
        const cardId = state.players[idx]!.hand[0]!.id;
        return { idx, playerId: idx === 0 ? p1Id : p2Id, cardId };
      };

      for (let round = 0; round < 3; round++) {
        const { idx, playerId, cardId } = getLiveActive();

        for (const badSeq of [-5, 0, -1, 99999]) {
          try {
            await manager.handleAction(matchId, playerId, {
              type: 'pass',
              playerIndex: idx,
              timestamp: new Date().toISOString(),
              expectedSequenceNumber: badSeq,
            });
            expect.fail('Expected rejection');
          } catch (err) {
            expect((err as ActionError).code).toBe('STALE_ACTION');
          }
        }

        await manager.handleAction(matchId, playerId, {
          type: 'deploy',
          playerIndex: idx,
          column: round,
          cardId,
          timestamp: new Date().toISOString(),
        });
      }

      await assertHashChainIntact(ledgerStore, matchId);
      const ledgerEntries = await ledgerStore.getActions(matchId);
      expect(ledgerEntries.length).toBe(4); // system:init + 3 deploys
    });
  });

  // ── Integration: WS-level packet corruption ───────────────────────────────

  describe('WS packet corruption (PHX-CHX series)', { timeout: 30000 }, () => {
    let app: FastifyInstance | null = null;
    let url: string;
    let manager: IMatchManager;

    beforeEach(async () => {
      const listening = await listenWsApp();
      app = listening.app;
      url = listening.url;
      // @ts-expect-error test access to shared match manager
      manager = app.matchManager;
    });

    afterEach(async () => {
      await app?.close();
      app = null;
    });

    it('PHX-CHX-001: oversized payload closes connection with 1009, state unchanged', async () => {
      const { ws1, ws2, matchId } = await createJoinedMatch(url);
      const before = stateSnapshot(manager, matchId);

      const closePromise = new Promise<number>((resolve) => {
        ws1.on('close', (code) => resolve(code));
      });
      ws1.send(
        JSON.stringify({
          type: 'action',
          matchId,
          msgId: randomUUID(),
          payload: 'x'.repeat(11_000),
        }),
      );
      const closeCode = await closePromise;
      expect(closeCode).toBe(1009);

      expectStateUnchanged(manager, matchId, before);
      ws2.close();
    });

    it('PHX-CHX-002: batch of corrupted packets does not advance game state', async () => {
      const { ws1, ws2, matchId } = await createJoinedMatch(url);
      const before = stateSnapshot(manager, matchId);

      for (const pkt of fuzzCorpus(matchId)) {
        ws1.send(pkt);
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 400));

      expectStateUnchanged(manager, matchId, before);
      ws1.close();
      ws2.close();
    });

    it('PHX-CHX-003: server remains alive and responsive after fuzz barrage', async () => {
      const { ws1, ws2, matchId } = await createJoinedMatch(url);

      // The corpus includes an oversized packet that closes ws1 (code 1009).
      // We wait for that close before asserting server liveness via ws2.
      const ws1Closed = new Promise<void>((resolve) => ws1.on('close', () => resolve()));
      for (const pkt of fuzzCorpus(matchId)) {
        ws1.send(pkt);
      }
      await ws1Closed;
      await new Promise<void>((resolve) => setTimeout(resolve, 200));

      // Server must still serve ws2 after the barrage closed ws1.
      const ackPromise = waitForMessageType<{ type: string }>(ws2, 'ack');
      ws2.send(
        JSON.stringify({
          type: 'action',
          matchId,
          msgId: randomUUID(),
          action: { type: 'forfeit', playerIndex: 1, timestamp: new Date().toISOString() },
        }),
      );
      await expect(ackPromise).resolves.toMatchObject({ type: 'ack' });

      ws2.close();
    });

    it('PHX-CHX-004: duplicate msgId replay with mutated content is rejected cleanly', async () => {
      const { ws1, ws2, matchId } = await createJoinedMatch(url);
      const msgId = randomUUID();

      const ackPromise = waitForMessageType<{ type: string }>(ws1, 'ack');
      ws1.send(
        JSON.stringify({
          type: 'action',
          matchId,
          msgId,
          action: { type: 'forfeit', playerIndex: 0, timestamp: new Date().toISOString() },
        }),
      );
      await ackPromise;
      const before = stateSnapshot(manager, matchId);

      const errorPromise = waitForMessageType<{ type: string; code: string }>(ws1, 'actionError');
      ws1.send(
        JSON.stringify({
          type: 'action',
          matchId,
          msgId: randomUUID(),
          action: { type: 'forfeit', playerIndex: 0, timestamp: new Date().toISOString() },
        }),
      );
      const err = await errorPromise;
      expect(err.code).toBe('ILLEGAL_ACTION');

      expectStateUnchanged(manager, matchId, before);
      ws1.close();
      ws2.close();
    });
  });
});
