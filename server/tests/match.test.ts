import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchManager } from '../src/match';
import type { WebSocket } from 'ws';
import type { Action, ServerMessage, GameState } from '@phalanxduel/shared';

const MOCK_TIMESTAMP = '2026-02-24T12:00:00.000Z';

function mockSocket(): WebSocket {
  const messages: string[] = [];
  return {
    readyState: 1,
    send: vi.fn((data: string) => messages.push(data)),
    _messages: messages,
  } as unknown as WebSocket & { _messages: string[] };
}

function getMessages(socket: WebSocket): ServerMessage[] {
  const mock = socket as unknown as { _messages: string[] };
  return mock._messages.map((m) => JSON.parse(m) as ServerMessage);
}

function lastMessage(socket: WebSocket): ServerMessage | undefined {
  const msgs = getMessages(socket);
  return msgs[msgs.length - 1];
}

describe('MatchManager', () => {
  let manager: MatchManager;

  beforeEach(() => {
    manager = new MatchManager();
  });

  describe('createMatch', () => {
    it('should return valid UUIDs and player index 0', () => {
      const socket = mockSocket();
      const result = manager.createMatch('Alice', socket);

      expect(result.matchId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(result.playerId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(result.playerIndex).toBe(0);
    });
  });

  describe('joinMatch', () => {
    it('should broadcast gameState to both players after join', () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', socket1);
      manager.joinMatch(matchId, 'Bob', socket2);
      manager.broadcastMatchState(matchId);

      const msg1 = lastMessage(socket1);
      const msg2 = lastMessage(socket2);
      expect(msg1?.type).toBe('gameState');
      expect(msg2?.type).toBe('gameState');
    });

    it('should initialize game in AttackPhase with 12 cards per hand', () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', socket1, { damageMode: 'cumulative' });
      manager.joinMatch(matchId, 'Bob', socket2);
      manager.broadcastMatchState(matchId);

      const msg = lastMessage(socket1) as Extract<ServerMessage, { type: 'gameState' }>;
      expect(msg.type).toBe('gameState');
      expect(msg.result.postState.phase).toBe('AttackPhase');
      // Active player sees own hand, opponent is redacted
      expect(msg.result.postState.players[0]!.hand).toHaveLength(12);
      expect(msg.result.postState.players[1]!.hand).toHaveLength(0);
      expect(msg.result.postState.players[1]!.handCount).toBe(12);
    });
  });

  describe('handleAction', () => {
    function setupActiveGame() {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId, playerId: player0Id } = manager.createMatch('Alice', socket1, {
        damageMode: 'cumulative',
      });
      const { playerId: player1Id } = manager.joinMatch(matchId, 'Bob', socket2);
      manager.broadcastMatchState(matchId);
      return { matchId, player0Id, player1Id, socket1, socket2 };
    }

    it('should accept a valid pass action and broadcast updated state', async () => {
      const { matchId, player0Id, socket1, socket2 } = setupActiveGame();

      const action: Action = {
        type: 'pass',
        playerIndex: 0,
        timestamp: MOCK_TIMESTAMP,
      };

      // Clear previous messages
      (socket1 as unknown as { _messages: string[] })._messages.length = 0;
      (socket2 as unknown as { _messages: string[] })._messages.length = 0;

      await manager.handleAction(matchId, player0Id, action);

      const msg1 = lastMessage(socket1);
      const msg2 = lastMessage(socket2);
      expect(msg1?.type).toBe('gameState');
      expect(msg2?.type).toBe('gameState');
    });
  });

  describe('match cleanup', () => {
    it('should remove gameOver matches after TTL', () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', socket1);
      manager.joinMatch(matchId, 'Bob', socket2);

      // Force game over state
      const match = manager.matches.get(matchId)!;
      match.state = { ...match.state!, phase: 'gameOver' } as GameState;
      // Set lastActivityAt to 6 minutes ago (exceeds 5 min TTL)
      match.lastActivityAt = Date.now() - 6 * 60 * 1000;

      const removed = manager.cleanupMatches();

      expect(removed).toBe(1);
      expect(manager.matches.has(matchId)).toBe(false);
    });
  });
});
