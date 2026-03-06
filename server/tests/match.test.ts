import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchManager } from '../src/match.js';
import type { WebSocket } from 'ws';
import type { ServerMessage } from '@phalanxduel/shared';

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

function lastMessage(socket: any): ServerMessage | undefined {
  return socket._messages[socket._messages.length - 1];
}

describe('MatchManager', () => {
  let manager: MatchManager;

  beforeEach(() => {
    manager = new MatchManager();
  });

  describe('createMatch', () => {
    it('should return valid UUIDs and player index 0', () => {
      const socket = mockSocket();
      const result = manager.createMatch('Player 1', socket);

      expect(result.matchId).toMatch(/^[0-9a-f-]{36}$/);
      expect(result.playerId).toMatch(/^[0-9a-f-]{36}$/);
      expect(result.playerIndex).toBe(0);
    });
  });

  describe('joinMatch', () => {
    it('should broadcast gameState to both players after join', async () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();

      const { matchId } = manager.createMatch('Player 1', socket1);
      await manager.joinMatch(matchId, 'Player 2', socket2);

      const msg1 = lastMessage(socket1);
      const msg2 = lastMessage(socket2);
      expect(msg1?.type).toBe('gameState');
      expect(msg2?.type).toBe('gameState');
    });

    it('should initialize game in DeploymentPhase with 12 cards per hand', async () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();

      const { matchId } = manager.createMatch('Player 1', socket1);
      await manager.joinMatch(matchId, 'Player 2', socket2);

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

      const { matchId } = manager.createMatch('Player 1', socket1);
      const { playerId: p2Id } = await manager.joinMatch(matchId, 'Player 2', socket2);

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
  });

  describe('cleanupMatches', () => {
    it('should remove gameOver matches after TTL', async () => {
      const socket1 = mockSocket();
      const socket2 = mockSocket();

      const { matchId } = manager.createMatch('Player 1', socket1);
      await manager.joinMatch(matchId, 'Player 2', socket2);

      const match = await manager.getMatch(matchId);
      // Force game over
      match!.state!.phase = 'gameOver';
      match!.lastActivityAt = Date.now() - 10 * 60 * 1000; // 10 mins ago

      const removed = manager.cleanupMatches();
      expect(removed).toBe(1);
      expect(await manager.getMatch(matchId)).toBeNull();
    });
  });
});
