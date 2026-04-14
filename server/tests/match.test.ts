import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalMatchManager } from '../src/match.js';
import type { WebSocket } from 'ws';
import type { ServerMessage } from '@phalanxduel/shared';
import { PhalanxEventSchema } from '@phalanxduel/shared';
import { InMemoryLedgerStore } from '../src/db/ledger-store.js';
import type { MatchInstance } from '../src/match.js';
import type { MatchRepository } from '../src/db/match-repo.js';

function mockSocket() {
  const messages: ServerMessage[] = [];
  return {
    send: vi.fn((data: string) => messages.push(JSON.parse(data))),
    readyState: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    on: vi.fn(),
    close: vi.fn(),
    _messages: messages,
  } as unknown as WebSocket & { _messages: ServerMessage[] };
}

function lastMessage(
  socket: WebSocket & { _messages: ServerMessage[] },
): ServerMessage | undefined {
  return socket._messages[socket._messages.length - 1];
}

describe('LocalMatchManager', () => {
  let manager: LocalMatchManager;

  beforeEach(() => {
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
    manager = new LocalMatchManager(mockRepo, new InMemoryLedgerStore());
  });

  describe('createMatch', () => {
    it('should return valid UUIDs and player index 0', async () => {
      const socket = mockSocket();
      const result = await manager.createMatch('Player 1', socket);

      expect(result.matchId).toMatch(/^[0-9a-f-]{36}$/);
      expect(result.playerId).toMatch(/^[0-9a-f-]{36}$/);
      expect(result.playerIndex).toBe(0);
    });
  });

  describe('joinMatch', () => {
    it('should broadcast gameState to both players after join', async () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();

      const { matchId } = await manager.createMatch('Player 1', socket1);
      await manager.joinMatch(matchId, 'Player 2', socket2);
      manager.broadcastMatchState(matchId);
      // broadcastMatchState uses async IIFE; flush microtasks
      await vi.waitFor(() => {
        expect(lastMessage(socket1)?.type).toBe('gameState');
      });

      const msg1 = lastMessage(socket1);
      const msg2 = lastMessage(socket2);
      expect(msg1?.type).toBe('gameState');
      expect(msg2?.type).toBe('gameState');
    });

    it('should initialize game in DeploymentPhase with 12 cards per hand', async () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();

      const { matchId } = await manager.createMatch('Player 1', socket1);
      await manager.joinMatch(matchId, 'Player 2', socket2);
      manager.broadcastMatchState(matchId);
      await vi.waitFor(() => {
        expect(lastMessage(socket1)?.type).toBe('gameState');
      });

      const msg = lastMessage(socket1) as Extract<ServerMessage, { type: 'gameState' }>;
      expect(msg.type).toBe('gameState');
      // Game starts in DeploymentPhase (modeClassicDeployment: true by default)
      expect(msg.result.postState.phase).toBe('DeploymentPhase');
      expect(msg.result.postState.players[0]!.hand.length).toBe(12);
    });
  });

  describe('handleAction', () => {
    it('should accept a valid deploy action and broadcast updated state', async () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();

      const { matchId } = await manager.createMatch('Player 1', socket1);
      const { playerId: p2Id } = await manager.joinMatch(matchId, 'Player 2', socket2);
      manager.broadcastMatchState(matchId);
      await vi.waitFor(() => {
        expect(lastMessage(socket2)?.type).toBe('gameState');
      });

      // Use socket2 (player 1) as the actor; socket1 sees player 1's action broadcast
      const initialMsg = lastMessage(socket2) as Extract<ServerMessage, { type: 'gameState' }>;
      const cardId = initialMsg.result.postState.players[1]!.hand[0]!.id;

      await manager.handleAction(matchId, p2Id, {
        type: 'deploy',
        playerIndex: 1,
        column: 0,
        cardId,
        timestamp: new Date().toISOString(),
      });

      const updatedMsg = lastMessage(socket1) as Extract<ServerMessage, { type: 'gameState' }>;
      expect(updatedMsg.result.action.type).toBe('deploy');
      expect(updatedMsg.result.postState.players[1]!.handCount).toBe(11);
    });

    it('should populate turnHash on the last transactionLog entry after a deploy action', async () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();

      const { matchId } = await manager.createMatch('Player 1', socket1);
      const { playerId: p2Id } = await manager.joinMatch(matchId, 'Player 2', socket2);
      manager.broadcastMatchState(matchId);
      await vi.waitFor(() => {
        expect(lastMessage(socket2)?.type).toBe('gameState');
      });

      const initialMsg = lastMessage(socket2) as Extract<ServerMessage, { type: 'gameState' }>;
      const cardId = initialMsg.result.postState.players[1]!.hand[0]!.id;

      await manager.handleAction(matchId, p2Id, {
        type: 'deploy',
        playerIndex: 1,
        column: 0,
        cardId,
        timestamp: new Date().toISOString(),
      });

      const updatedMsg = lastMessage(socket1) as Extract<ServerMessage, { type: 'gameState' }>;
      const lastEntry = updatedMsg.result.postState.transactionLog?.at(-1);
      expect(lastEntry).toBeDefined();
      expect(typeof lastEntry?.turnHash).toBe('string');
      expect(lastEntry?.turnHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should broadcast non-empty events array after a deploy action', async () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();

      const { matchId } = await manager.createMatch('Player 1', socket1);
      const { playerId: p2Id } = await manager.joinMatch(matchId, 'Player 2', socket2);
      manager.broadcastMatchState(matchId);
      await vi.waitFor(() => {
        expect(lastMessage(socket2)?.type).toBe('gameState');
      });

      const initialMsg = lastMessage(socket2) as Extract<ServerMessage, { type: 'gameState' }>;
      const cardId = initialMsg.result.postState.players[1]!.hand[0]!.id;

      await manager.handleAction(matchId, p2Id, {
        type: 'deploy',
        playerIndex: 1,
        column: 0,
        cardId,
        timestamp: new Date().toISOString(),
      });

      const updatedMsg = lastMessage(socket1) as Extract<ServerMessage, { type: 'gameState' }>;
      expect(updatedMsg.result.events).toBeDefined();
      expect(updatedMsg.result.events!.length).toBeGreaterThan(0);
      for (const event of updatedMsg.result.events!) {
        expect(PhalanxEventSchema.safeParse(event).success).toBe(true);
      }
    });
  });

  describe('cleanupMatches', () => {
    it('should remove gameOver matches after TTL', async () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();

      const { matchId } = await manager.createMatch('Player 1', socket1);
      await manager.joinMatch(matchId, 'Player 2', socket2);

      const match = await manager.getMatch(matchId);
      // Force game over
      match!.state!.phase = 'gameOver';
      match!.lastActivityAt = Date.now() - 10 * 60 * 1000; // 10 mins ago

      const removed = manager.cleanupMatches();
      expect(removed).toBe(1);
      expect(manager.getMatchSync(matchId)).toBeFalsy();
    });
  });
});
