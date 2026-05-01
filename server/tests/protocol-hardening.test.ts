import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalMatchManager, ActionError } from '../src/match.js';
import type { MatchInstance } from '../src/match.js';
import type { MatchRepository } from '../src/db/match-repo.js';
import type { ServerMessage, Action } from '@phalanxduel/shared';
import { InMemoryLedgerStore } from '../src/db/ledger-store.js';
import { mockSocket, lastMessage, type MockSocket } from './helpers/socket.js';

describe('Protocol Hardening (TASK-232)', () => {
  let manager: LocalMatchManager;
  let socket1: MockSocket;
  let socket2: MockSocket;
  let matchId: string;
  let p1Id: string;
  let p2Id: string;
  let ledgerStore: InMemoryLedgerStore;

  beforeEach(async () => {
    const store = new Map<string, MatchInstance>();
    const mockRepo = {
      saveMatch: vi.fn(async (m) => {
        store.set(m.matchId, m);
      }),
      getMatch: vi.fn(async (id) => store.get(id) || null),
      verifyUserIds: vi.fn(async (p1, p2) => [p1, p2]),
      saveEventLog: vi.fn(),
      saveFinalStateHash: vi.fn(),
    } as unknown as MatchRepository;

    ledgerStore = new InMemoryLedgerStore();
    manager = new LocalMatchManager(mockRepo, ledgerStore);
    socket1 = mockSocket();
    socket2 = mockSocket();

    const created = await manager.createMatch('Player 1', socket1);
    matchId = created.matchId;
    p1Id = created.playerId;
    const joined = await manager.joinMatch(matchId, 'Player 2', socket2);
    p2Id = joined.playerId;

    // Trigger initialization
    manager.broadcastMatchState(matchId);
    await vi.waitFor(() => {
      expect(lastMessage(socket2)?.type).toBe('gameState');
    });
  });

  describe('Freshness (expectedSequenceNumber)', () => {
    it('accepts action with correct expectedSequenceNumber', async () => {
      const msg = lastMessage(socket1) as Extract<ServerMessage, { type: 'gameState' }>;
      const currentSeq = (msg.result.postState.transactionLog ?? []).length - 1;
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
        expectedSequenceNumber: currentSeq + 1,
      });

      const updatedMsg = lastMessage(socket1) as Extract<ServerMessage, { type: 'gameState' }>;
      expect(updatedMsg.result.postState.transactionLog?.length).toBe(
        msg.result.postState.transactionLog!.length + 1,
      );
    });

    it('rejects action with stale expectedSequenceNumber (STALE_ACTION)', async () => {
      const msg = lastMessage(socket1) as Extract<ServerMessage, { type: 'gameState' }>;
      const currentSeq = (msg.result.postState.transactionLog ?? []).length - 1;
      const activeIdx = msg.result.postState.activePlayerIndex;
      const activePlayerId = activeIdx === 0 ? p1Id : p2Id;

      try {
        await manager.handleAction(matchId, activePlayerId, {
          type: 'pass',
          playerIndex: activeIdx,
          timestamp: new Date().toISOString(),
          expectedSequenceNumber: currentSeq, // Stale!
        });
        expect.fail('Should have thrown STALE_ACTION');
      } catch (err) {
        expect((err as ActionError).code).toBe('STALE_ACTION');
      }
    });

    it('rejects action with future expectedSequenceNumber (STALE_ACTION)', async () => {
      const msg = lastMessage(socket1) as Extract<ServerMessage, { type: 'gameState' }>;
      const currentSeq = (msg.result.postState.transactionLog ?? []).length - 1;
      const activeIdx = msg.result.postState.activePlayerIndex;
      const activePlayerId = activeIdx === 0 ? p1Id : p2Id;

      try {
        await manager.handleAction(matchId, activePlayerId, {
          type: 'pass',
          playerIndex: activeIdx,
          timestamp: new Date().toISOString(),
          expectedSequenceNumber: currentSeq + 5, // Future!
        });
        expect.fail('Should have thrown STALE_ACTION');
      } catch (err) {
        expect((err as ActionError).code).toBe('STALE_ACTION');
      }
    });
  });

  describe('De-duplication (msgId)', () => {
    it('replays successfully for duplicate msgId', async () => {
      const msg = lastMessage(socket1) as Extract<ServerMessage, { type: 'gameState' }>;
      const activeIdx = msg.result.postState.activePlayerIndex;
      const activePlayerId = activeIdx === 0 ? p1Id : p2Id;
      const activeSocket = activeIdx === 0 ? socket1 : socket2;

      const activeMsg = lastMessage(activeSocket) as Extract<ServerMessage, { type: 'gameState' }>;
      const cardId = activeMsg.result.postState.players[activeIdx]!.hand[0]!.id;
      const msgId = '00000000-0000-4000-a000-000000000001';

      const action: Action = {
        type: 'deploy',
        playerIndex: activeIdx,
        column: 0,
        cardId,
        timestamp: new Date().toISOString(),
        msgId,
      };

      // First time succeeds
      const res1 = await manager.handleAction(matchId, activePlayerId, action);
      const seq1 = res1.postState.transactionLog?.at(-1)?.sequenceNumber;

      // Second time with same msgId should return same result (de-dup)
      const res2 = await manager.handleAction(matchId, activePlayerId, action);
      expect(res2.postState.transactionLog?.at(-1)?.sequenceNumber).toBe(seq1);
      expect(res2.action.msgId).toBe(msgId);
    });

    it('persists msgId in the ledger', async () => {
      const msg = lastMessage(socket1) as Extract<ServerMessage, { type: 'gameState' }>;
      const activeIdx = msg.result.postState.activePlayerIndex;
      const activePlayerId = activeIdx === 0 ? p1Id : p2Id;
      const activeSocket = activeIdx === 0 ? socket1 : socket2;

      const activeMsg = lastMessage(activeSocket) as Extract<ServerMessage, { type: 'gameState' }>;
      const cardId = activeMsg.result.postState.players[activeIdx]!.hand[0]!.id;
      const msgId = '00000000-0000-4000-a000-000000000002';

      await manager.handleAction(matchId, activePlayerId, {
        type: 'deploy',
        playerIndex: activeIdx,
        column: 1,
        cardId,
        timestamp: new Date().toISOString(),
        msgId,
      });

      const actions = await ledgerStore.getActions(matchId);
      const lastAction = actions.at(-1);
      expect(lastAction?.msgId).toBe(msgId);
    });
  });
});
