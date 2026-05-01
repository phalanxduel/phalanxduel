import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalMatchManager, ActionError } from '../src/match.js';
import type { MatchInstance } from '../src/match.js';
import type { MatchRepository } from '../src/db/match-repo.js';
import type { ServerMessage, Action } from '@phalanxduel/shared';
import { InMemoryLedgerStore } from '../src/db/ledger-store.js';
import { mockSocket, lastMessage, type MockSocket } from './helpers/socket.js';

describe('LocalMatchManager.handleAction — defensive branches', () => {
  it('throws ActionError for unknown matchId', async () => {
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
    const manager = new LocalMatchManager(mockRepo, new InMemoryLedgerStore());
    await expect(
      manager.handleAction('00000000-0000-0000-0000-000000000000', 'any', {
        type: 'pass',
        playerIndex: 0,
        timestamp: new Date().toISOString(),
      }),
    ).rejects.toThrow(ActionError);
  });
});

describe('Adversarial server-authority tests (TASK-198)', () => {
  let manager: LocalMatchManager;
  let socket1: MockSocket;
  let socket2: MockSocket;
  let matchId: string;
  let p1Id: string;
  let p2Id: string;

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
    manager = new LocalMatchManager(mockRepo, new InMemoryLedgerStore());
    socket1 = mockSocket();
    socket2 = mockSocket();

    const created = await manager.createMatch('Player 1', socket1);
    matchId = created.matchId;
    p1Id = created.playerId;
    const joined = await manager.joinMatch(matchId, 'Player 2', socket2);
    p2Id = joined.playerId;
    manager.broadcastMatchState(matchId);
    await vi.waitFor(() => {
      expect(lastMessage(socket2)?.type).toBe('gameState');
    });
  });

  it('rejects action from unknown playerId (PLAYER_NOT_FOUND)', async () => {
    await expect(
      manager.handleAction(matchId, 'fake-player-id', {
        type: 'pass',
        playerIndex: 0,
        timestamp: new Date().toISOString(),
      }),
    ).rejects.toThrow(ActionError);

    try {
      await manager.handleAction(matchId, 'fake-player-id', {
        type: 'pass',
        playerIndex: 0,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      expect((err as ActionError).code).toBe('PLAYER_NOT_FOUND');
    }
  });

  it('rejects action with wrong playerIndex for the given playerId (UNAUTHORIZED_ACTION)', async () => {
    // P2 (playerIndex 1) tries to submit an action as playerIndex 0
    await expect(
      manager.handleAction(matchId, p2Id, {
        type: 'pass',
        playerIndex: 0,
        timestamp: new Date().toISOString(),
      }),
    ).rejects.toThrow(ActionError);

    try {
      await manager.handleAction(matchId, p2Id, {
        type: 'pass',
        playerIndex: 0,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      expect((err as ActionError).code).toBe('UNAUTHORIZED_ACTION');
    }
  });

  it('rejects out-of-phase action (reinforce during DeploymentPhase)', async () => {
    // Game is in DeploymentPhase. Sending a reinforce action should fail.
    const msg = lastMessage(socket2) as Extract<ServerMessage, { type: 'gameState' }>;
    const state = msg.result.postState;
    expect(state.phase).toBe('DeploymentPhase');

    // Determine who the active player is for this phase
    const activeIdx = state.activePlayerIndex;
    const activePlayerId = activeIdx === 0 ? p1Id : p2Id;

    await expect(
      manager.handleAction(matchId, activePlayerId, {
        type: 'reinforce',
        playerIndex: activeIdx,
        cardId: 'fake-card-id',
        timestamp: new Date().toISOString(),
      }),
    ).rejects.toThrow(ActionError);

    try {
      await manager.handleAction(matchId, activePlayerId, {
        type: 'reinforce',
        playerIndex: activeIdx,
        cardId: 'fake-card-id',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      expect((err as ActionError).code).toBe('ILLEGAL_ACTION');
    }
  });

  it('rejects action with invalid card ID (ILLEGAL_ACTION)', async () => {
    const msg = lastMessage(socket2) as Extract<ServerMessage, { type: 'gameState' }>;
    const state = msg.result.postState;
    const activeIdx = state.activePlayerIndex;
    const activePlayerId = activeIdx === 0 ? p1Id : p2Id;

    await expect(
      manager.handleAction(matchId, activePlayerId, {
        type: 'deploy',
        playerIndex: activeIdx,
        column: 0,
        cardId: 'nonexistent-card-id',
        timestamp: new Date().toISOString(),
      }),
    ).rejects.toThrow(ActionError);
  });

  it('rejects action from non-active player (not their turn)', async () => {
    // Find who is NOT the active player
    const msg = lastMessage(socket2) as Extract<ServerMessage, { type: 'gameState' }>;
    const state = msg.result.postState;
    const activeIdx = state.activePlayerIndex;
    const inactiveIdx = activeIdx === 0 ? 1 : 0;
    const inactivePlayerId = inactiveIdx === 0 ? p1Id : p2Id;
    const inactiveSocket = inactiveIdx === 0 ? socket1 : socket2;

    // Get a valid card from the inactive player's hand
    const inactiveMsg = lastMessage(inactiveSocket) as Extract<
      ServerMessage,
      { type: 'gameState' }
    >;
    const inactiveHand = inactiveMsg.result.postState.players[inactiveIdx]!.hand;

    if (inactiveHand.length > 0) {
      await expect(
        manager.handleAction(matchId, inactivePlayerId, {
          type: 'deploy',
          playerIndex: inactiveIdx,
          column: 0,
          cardId: inactiveHand[0]!.id,
          timestamp: new Date().toISOString(),
        }),
      ).rejects.toThrow(ActionError);
    }
  });

  it('does not crash on duplicate action submission', async () => {
    const msg = lastMessage(socket2) as Extract<ServerMessage, { type: 'gameState' }>;
    const state = msg.result.postState;
    const activeIdx = state.activePlayerIndex;
    const activePlayerId = activeIdx === 0 ? p1Id : p2Id;
    const activeSocket = activeIdx === 0 ? socket1 : socket2;

    const activeMsg = lastMessage(activeSocket) as Extract<ServerMessage, { type: 'gameState' }>;
    const hand = activeMsg.result.postState.players[activeIdx]!.hand;

    const action: Action = {
      type: 'deploy',
      playerIndex: activeIdx,
      column: 0,
      cardId: hand[0]!.id,
      timestamp: new Date().toISOString(),
    };

    // First action should succeed
    await manager.handleAction(matchId, activePlayerId, action);

    // Second identical action should fail (card no longer in hand or state advanced)
    await expect(manager.handleAction(matchId, activePlayerId, action)).rejects.toThrow();
  });
});
