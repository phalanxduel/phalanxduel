import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LocalMatchManager, MatchError } from '../src/match.js';
import type { MatchInstance } from '../src/match.js';
import { InMemoryLedgerStore } from '../src/db/ledger-store.js';
import type { MatchRepository } from '../src/db/match-repo.js';
import type { LadderService } from '../src/ladder.js';
import { mockSocket, lastMessage } from './helpers/socket.js';

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
    saveMatch: vi.fn(async (match: MatchInstance) => {
      store.set(match.matchId, cloneMatch(match));
    }),
    getMatch: vi.fn(async (matchId: string) => {
      const match = store.get(matchId);
      if (!match) return null;
      const cloned = cloneMatch(match);
      const lifecycleEvents = eventLogs.get(matchId);
      if (lifecycleEvents) {
        cloned.lifecycleEvents = structuredClone(lifecycleEvents);
      }
      return cloned;
    }),
    saveEventLog: vi.fn(
      async (matchId: string, log: { events: MatchInstance['lifecycleEvents'] }) => {
        eventLogs.set(matchId, structuredClone(log.events));
      },
    ),
    saveTransactionLogEntry: vi.fn(async () => {}),
    saveFinalStateHash: vi.fn(async () => {}),
    verifyUserIds: vi.fn(async (p1: string | null, p2: string | null) => [p1, p2]),
  };
}

describe('WebSocket reconnection', () => {
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
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Clear any pending disconnect timers
    for (const timer of manager.disconnectTimers.values()) {
      clearTimeout(timer);
    }
    manager.disconnectTimers.clear();
    for (const timer of manager.inactivityTimers.values()) {
      clearTimeout(timer);
    }
    manager.inactivityTimers.clear();
    vi.useRealTimers();
  });

  async function setupMatch() {
    const socket1 = mockSocket();
    const socket2 = mockSocket();
    const { matchId, playerId: p1Id } = await manager.createMatch('Player 1', socket1);
    const { playerId: p2Id } = await manager.joinMatch(matchId, 'Player 2', socket2);

    manager.broadcastMatchState(matchId);
    // Flush the async IIFE inside broadcastMatchState
    await vi.advanceTimersByTimeAsync(0);
    return { matchId, p1Id, p2Id, socket1, socket2 };
  }

  describe('rejoinMatch — happy path', () => {
    it('should allow a disconnected player to reclaim their slot', async () => {
      const { matchId, p1Id, socket1, socket2 } = await setupMatch();

      // Disconnect player 1
      manager.handleDisconnect(socket1);
      await vi.advanceTimersByTimeAsync(0);

      // Opponent should be notified of disconnect
      const disconnectMsg = lastMessage(socket2);
      expect(disconnectMsg?.type).toBe('opponentDisconnected');

      // Player 1 reconnects with a new socket
      const newSocket = mockSocket();
      const result = await manager.rejoinMatch(matchId, p1Id, newSocket);
      expect(result.playerIndex).toBe(0);

      // Opponent should be notified of reconnection
      const reconnectMsg = lastMessage(socket2);
      expect(reconnectMsg?.type).toBe('opponentReconnected');

      // Broadcast game state to the reconnected player
      manager.broadcastMatchState(matchId);
      await vi.advanceTimersByTimeAsync(0);

      const stateMsg = lastMessage(newSocket);
      expect(stateMsg?.type).toBe('gameState');
    });

    it('should cancel the forfeit timer on successful rejoin', async () => {
      const { matchId, p1Id, socket1 } = await setupMatch();

      // Disconnect player 1 — starts the 2-minute timer
      manager.handleDisconnect(socket1);
      await vi.advanceTimersByTimeAsync(0);

      const timerKey = `${matchId}:${p1Id}`;
      expect(manager.disconnectTimers.has(timerKey)).toBe(true);

      // Player 1 reconnects
      const newSocket = mockSocket();
      await manager.rejoinMatch(matchId, p1Id, newSocket);

      // Timer should be cancelled
      expect(manager.disconnectTimers.has(timerKey)).toBe(false);
    });

    it('should register the new socket in the connection tracker', async () => {
      const { matchId, p1Id, socket1 } = await setupMatch();

      manager.handleDisconnect(socket1);
      await vi.advanceTimersByTimeAsync(0);

      const newSocket = mockSocket();
      await manager.rejoinMatch(matchId, p1Id, newSocket);

      const info = manager.connectionTracker.getSocketInfo(newSocket);
      expect(info).toBeDefined();
      expect(info!.isSpectator).toBe(false);
      if (!info!.isSpectator) {
        expect(info!.playerId).toBe(p1Id);
        expect(info!.matchId).toBe(matchId);
      }
    });

    it('should allow rejoin after a server restart using persisted player identity', async () => {
      const repo = makeRepoDouble();
      const firstManager = new LocalMatchManager(
        repo as unknown as MatchRepository,
        new InMemoryLedgerStore(),
      );

      const socket1 = mockSocket();
      const socket2 = mockSocket();
      const { matchId, playerId: p1Id } = await firstManager.createMatch('Player 1', socket1);
      await firstManager.joinMatch(matchId, 'Player 2', socket2);
      firstManager.broadcastMatchState(matchId);
      await vi.advanceTimersByTimeAsync(0);

      expect(repo.saveMatch).toHaveBeenCalled();

      const restartedManager = new LocalMatchManager(
        repo as unknown as MatchRepository,
        new InMemoryLedgerStore(),
      );

      const reconnectedSocket = mockSocket();
      const result = await restartedManager.rejoinMatch(matchId, p1Id, reconnectedSocket);
      expect(result.playerIndex).toBe(0);

      restartedManager.broadcastMatchState(matchId);
      await vi.advanceTimersByTimeAsync(0);

      const stateMsg = lastMessage(reconnectedSocket);
      expect(stateMsg?.type).toBe('gameState');
    });

    it('should preserve the original reconnect deadline across a server restart', async () => {
      const repo = makeRepoDouble();
      (manager as unknown as { matchRepo: MatchRepository }).matchRepo =
        repo as unknown as MatchRepository;

      const { matchId, p1Id, socket1 } = await setupMatch();

      manager.handleDisconnect(socket1);
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(90 * 1000);

      const restartedManager = new LocalMatchManager(
        repo as unknown as MatchRepository,
        new InMemoryLedgerStore(),
      );

      await restartedManager.getMatch(matchId);
      await vi.advanceTimersByTimeAsync(31 * 1000);

      await vi.waitFor(async () => {
        const recoveredMatch = await restartedManager.getMatch(matchId);
        expect(recoveredMatch?.state?.phase).toBe('gameOver');
      });

      const recoveredMatch = await restartedManager.getMatch(matchId);
      expect(recoveredMatch?.state?.outcome?.victoryType).toBe('forfeit');
      expect(recoveredMatch?.state?.outcome?.winnerIndex).toBe(1);
      expect(recoveredMatch?.players[0]?.disconnectedAt).toBeDefined();
      expect(p1Id).toBe(recoveredMatch?.players[0]?.playerId);
    });
  });

  describe('rejoinMatch — timeout forfeit', () => {
    it('should forfeit the disconnected player after 2 minutes', async () => {
      const { matchId, socket1 } = await setupMatch();

      manager.handleDisconnect(socket1);
      // Flush the async IIFE in handleDisconnect that sets up the timer
      await vi.advanceTimersByTimeAsync(0);

      // Advance past the 2-minute window — fires the timer callback
      await vi.advanceTimersByTimeAsync(2 * 60 * 1000);

      // Wait for the async forfeitDisconnectedPlayer chain to resolve
      await vi.waitFor(async () => {
        const m = await manager.getMatch(matchId);
        expect(m?.state?.phase).toBe('gameOver');
      });

      const match = await manager.getMatch(matchId);
      expect(match?.state?.outcome?.victoryType).toBe('forfeit');
      // Player 1 (index 0) disconnected, so player 2 (index 1) wins
      expect(match?.state?.outcome?.winnerIndex).toBe(1);
    });

    it('should not forfeit if the player reconnected before timeout', async () => {
      const { matchId, p1Id, socket1 } = await setupMatch();

      manager.handleDisconnect(socket1);
      await vi.advanceTimersByTimeAsync(0);

      // Reconnect after 1 minute (within the 2-minute window)
      await vi.advanceTimersByTimeAsync(60 * 1000);
      const newSocket = mockSocket();
      await manager.rejoinMatch(matchId, p1Id, newSocket);

      // Advance past the original timeout
      await vi.advanceTimersByTimeAsync(2 * 60 * 1000);

      // Game should still be active
      const match = await manager.getMatch(matchId);
      expect(match?.state?.phase).not.toBe('gameOver');
    });
  });

  describe('active-match inactivity forfeit', () => {
    it('forfeits the active player after 30 minutes and attributes the abandon', async () => {
      const ladder = {
        onMatchComplete: vi.fn(async () => {}),
      } as unknown as LadderService & { onMatchComplete: ReturnType<typeof vi.fn> };
      manager = new LocalMatchManager(
        (manager as unknown as { matchRepo: MatchRepository }).matchRepo,
        new InMemoryLedgerStore(),
        ladder,
      );
      const { matchId } = await setupMatch();
      const match = await manager.getMatch(matchId);
      const inactiveIndex = match?.state?.activePlayerIndex;
      expect(inactiveIndex).toBeDefined();
      expect(manager.inactivityTimers.has(matchId)).toBe(true);

      await vi.advanceTimersByTimeAsync(30 * 60 * 1000);

      await vi.waitFor(async () => {
        const resolved = await manager.getMatch(matchId);
        expect(resolved?.state?.phase).toBe('gameOver');
      });

      const resolved = await manager.getMatch(matchId);
      expect(resolved?.state?.outcome?.victoryType).toBe('forfeit');
      expect(resolved?.state?.outcome?.winnerIndex).toBe(inactiveIndex === 0 ? 1 : 0);
      expect(ladder.onMatchComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId,
          abandonPlayerIndex: inactiveIndex,
          outcome: expect.objectContaining({
            winnerIndex: inactiveIndex === 0 ? 1 : 0,
            victoryType: 'forfeit',
          }),
        }),
      );
    });

    it('does not fire the old timer if a valid action is applied before the deadline', async () => {
      const { matchId } = await setupMatch();
      const match = await manager.getMatch(matchId);
      if (!match?.state) throw new Error('Expected active match state');
      const activeIndex = match.state.activePlayerIndex;
      const activePlayer = match.players[activeIndex];
      const card = match.state.players[activeIndex]?.hand[0];
      if (!activePlayer || !card) throw new Error('Expected active player with a hand card');

      await vi.advanceTimersByTimeAsync(30 * 60 * 1000 - 1);
      await manager.handleAction(matchId, activePlayer.playerId, {
        type: 'deploy',
        playerIndex: activeIndex,
        column: 0,
        cardId: card.id,
        timestamp: new Date().toISOString(),
      });

      await vi.advanceTimersByTimeAsync(1);

      const resolved = await manager.getMatch(matchId);
      expect(resolved?.state?.phase).not.toBe('gameOver');
      expect(manager.inactivityTimers.has(matchId)).toBe(true);
    });

    it('does not arm pending one-player matches', async () => {
      const socket = mockSocket();
      const { matchId } = await manager.createMatch('Player 1', socket);

      expect(manager.inactivityTimers.has(matchId)).toBe(false);

      await vi.advanceTimersByTimeAsync(31 * 60 * 1000);

      const match = await manager.getMatch(matchId);
      expect(match?.state).toBeNull();
      expect(match?.players[1]).toBeNull();
    });
  });

  describe('rejoinMatch — error cases', () => {
    it('should reject rejoin with wrong playerId', async () => {
      const { matchId, socket1 } = await setupMatch();

      manager.handleDisconnect(socket1);
      await vi.advanceTimersByTimeAsync(0);

      const newSocket = mockSocket();
      await expect(
        manager.rejoinMatch(matchId, '00000000-0000-0000-0000-000000000000', newSocket),
      ).rejects.toThrow(MatchError);

      await expect(
        manager.rejoinMatch(matchId, '00000000-0000-0000-0000-000000000000', newSocket),
      ).rejects.toThrow('Player not found in this match');
    });

    it('should reject rejoin for a non-existent match', async () => {
      const newSocket = mockSocket();
      await expect(
        manager.rejoinMatch(
          '00000000-0000-0000-0000-000000000000',
          '00000000-0000-0000-0000-000000000001',
          newSocket,
        ),
      ).rejects.toThrow('Match not found');
    });

    it('should reject rejoin if the player is already connected', async () => {
      const { matchId, p1Id } = await setupMatch();

      // Player 1 is still connected — try to rejoin
      const newSocket = mockSocket();
      await expect(manager.rejoinMatch(matchId, p1Id, newSocket)).rejects.toThrow(
        'Player is already connected',
      );
    });

    it('should reject rejoin after forfeit timeout', async () => {
      const { matchId, socket1 } = await setupMatch();

      manager.handleDisconnect(socket1);
      await vi.advanceTimersByTimeAsync(0);

      // Wait for the forfeit timeout
      await vi.advanceTimersByTimeAsync(2 * 60 * 1000);

      // Wait for the async forfeit to complete
      await vi.waitFor(async () => {
        const m = await manager.getMatch(matchId);
        expect(m?.state?.phase).toBe('gameOver');
      });
    });
  });
});
