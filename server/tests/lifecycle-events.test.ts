import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchManager, buildMatchEventLog } from '../src/match.js';
import type { WebSocket } from 'ws';
import { TelemetryName } from '@phalanxduel/shared';
import { computeStateHash } from '@phalanxduel/shared/hash';

function mockSocket(): WebSocket {
  return {
    send: vi.fn(),
    readyState: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    on: vi.fn(),
    close: vi.fn(),
  } as unknown as WebSocket;
}

const BOT_OPTIONS = {
  botOptions: {
    opponent: 'bot-random' as const,
    botConfig: { strategy: 'random' as const, seed: 42 },
  },
};

describe('match lifecycle events', () => {
  let manager: MatchManager;

  beforeEach(() => {
    manager = new MatchManager();
  });

  describe('human-vs-human match', () => {
    it('emits match.created on createMatch', () => {
      const ws = mockSocket();
      const { matchId } = manager.createMatch('Alice', ws);
      const match = manager.getMatchSync(matchId)!;

      const created = match.lifecycleEvents.find(
        (e) => e.name === TelemetryName.EVENT_MATCH_CREATED,
      );
      expect(created).toBeDefined();
      expect(created!.payload['matchId']).toBe(matchId);
      expect(created!.payload['params']).toBeDefined();
      expect((created!.payload['params'] as Record<string, unknown>)['rows']).toBe(2);
    });

    it('emits player.joined for creator (P0) on createMatch', () => {
      const ws = mockSocket();
      const { matchId, playerId } = manager.createMatch('Alice', ws);
      const match = manager.getMatchSync(matchId)!;

      const joined = match.lifecycleEvents.find(
        (e) => e.name === TelemetryName.EVENT_PLAYER_JOINED && e.payload['playerIndex'] === 0,
      );
      expect(joined).toBeDefined();
      expect(joined!.payload['playerId']).toBe(playerId);
      expect(joined!.payload['isBot']).toBe(false);
    });

    it('emits player.joined for second player on joinMatch', async () => {
      const ws1 = mockSocket();
      const ws2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', ws1);
      const { playerId: p2Id } = await manager.joinMatch(matchId, 'Bob', ws2);

      const match = manager.getMatchSync(matchId)!;
      const joined = match.lifecycleEvents.find(
        (e) => e.name === TelemetryName.EVENT_PLAYER_JOINED && e.payload['playerIndex'] === 1,
      );
      expect(joined).toBeDefined();
      expect(joined!.payload['playerId']).toBe(p2Id);
      expect(joined!.payload['isBot']).toBe(false);
    });

    it('emits game.initialized after both players join', async () => {
      const ws1 = mockSocket();
      const ws2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', ws1);
      await manager.joinMatch(matchId, 'Bob', ws2);

      const match = manager.getMatchSync(matchId)!;
      const initialized = match.lifecycleEvents.find(
        (e) => e.name === TelemetryName.EVENT_GAME_INITIALIZED,
      );
      expect(initialized).toBeDefined();
      expect(typeof initialized!.payload['initialStateHash']).toBe('string');
      expect((initialized!.payload['initialStateHash'] as string).length).toBe(64); // SHA-256 hex
    });

    it('lifecycle event IDs follow the deterministic pattern', async () => {
      const ws1 = mockSocket();
      const ws2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', ws1);
      await manager.joinMatch(matchId, 'Bob', ws2);

      const match = manager.getMatchSync(matchId)!;
      expect(match.lifecycleEvents[0]!.id).toBe(`${matchId}:lc:match_created`);
      expect(match.lifecycleEvents[1]!.id).toBe(`${matchId}:lc:player_0_joined`);
      expect(match.lifecycleEvents[2]!.id).toBe(`${matchId}:lc:player_1_joined`);
      expect(match.lifecycleEvents[3]!.id).toBe(`${matchId}:lc:game_initialized`);
    });

    it('lifecycle event sequence is: match.created → player.joined×2 → game.initialized', async () => {
      const ws1 = mockSocket();
      const ws2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', ws1);
      await manager.joinMatch(matchId, 'Bob', ws2);

      const match = manager.getMatchSync(matchId)!;
      const names = match.lifecycleEvents.map((e) => e.name);
      expect(names).toEqual([
        TelemetryName.EVENT_MATCH_CREATED,
        TelemetryName.EVENT_PLAYER_JOINED,
        TelemetryName.EVENT_PLAYER_JOINED,
        TelemetryName.EVENT_GAME_INITIALIZED,
      ]);
    });

    it('emits game.completed when a player forfeits', async () => {
      const ws1 = mockSocket();
      const ws2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', ws1);
      const { playerId: p1Id } = await manager.joinMatch(matchId, 'Bob', ws2);

      await manager.handleAction(matchId, p1Id, {
        type: 'forfeit',
        playerIndex: 1,
        timestamp: new Date().toISOString(),
      });

      const match = manager.getMatchSync(matchId)!;
      const completed = match.lifecycleEvents.find(
        (e) => e.name === TelemetryName.EVENT_GAME_COMPLETED,
      );
      expect(completed).toBeDefined();
      expect(completed!.payload['winnerIndex']).toBeDefined();
      expect(completed!.payload['victoryType']).toBe('forfeit');
      expect(typeof completed!.payload['durationMs']).toBe('number');
      expect(Array.isArray(completed!.payload['finalLp'])).toBe(true);
    });

    it('game.completed is only emitted once even if called multiple times', async () => {
      const ws1 = mockSocket();
      const ws2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', ws1);
      const { playerId: p1Id } = await manager.joinMatch(matchId, 'Bob', ws2);

      await manager.handleAction(matchId, p1Id, {
        type: 'forfeit',
        playerIndex: 1,
        timestamp: new Date().toISOString(),
      });

      const match = manager.getMatchSync(matchId)!;
      const completedEvents = match.lifecycleEvents.filter(
        (e) => e.name === TelemetryName.EVENT_GAME_COMPLETED,
      );
      expect(completedEvents.length).toBe(1);
    });
  });

  describe('bot match', () => {
    it('emits match.created and player.joined×2 (isBot=true for bot) on createMatch', () => {
      const ws = mockSocket();
      const { matchId } = manager.createMatch('Human', ws, BOT_OPTIONS);
      const match = manager.getMatchSync(matchId)!;

      const names = match.lifecycleEvents
        .filter(
          (e) =>
            e.name === TelemetryName.EVENT_MATCH_CREATED ||
            e.name === TelemetryName.EVENT_PLAYER_JOINED,
        )
        .map((e) => ({ name: e.name, isBot: e.payload['isBot'] }));

      expect(names[0]!.name).toBe(TelemetryName.EVENT_MATCH_CREATED);
      expect(names[1]).toEqual({ name: TelemetryName.EVENT_PLAYER_JOINED, isBot: false });
      expect(names[2]).toEqual({ name: TelemetryName.EVENT_PLAYER_JOINED, isBot: true });
    });

    it('bot match emits game.initialized immediately after createMatch', () => {
      const ws = mockSocket();
      const { matchId } = manager.createMatch('Human', ws, BOT_OPTIONS);
      const match = manager.getMatchSync(matchId)!;

      const initialized = match.lifecycleEvents.find(
        (e) => e.name === TelemetryName.EVENT_GAME_INITIALIZED,
      );
      expect(initialized).toBeDefined();
      expect(typeof initialized!.payload['initialStateHash']).toBe('string');
    });
  });

  describe('buildMatchEventLog', () => {
    it('returns matchId, events, fingerprint, generatedAt', async () => {
      const ws1 = mockSocket();
      const ws2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', ws1);
      await manager.joinMatch(matchId, 'Bob', ws2);

      const match = manager.getMatchSync(matchId)!;
      const log = buildMatchEventLog(match);

      expect(log.matchId).toBe(matchId);
      expect(Array.isArray(log.events)).toBe(true);
      expect(typeof log.fingerprint).toBe('string');
      expect(log.fingerprint.length).toBe(64); // SHA-256 hex
      expect(typeof log.generatedAt).toBe('string');
    });

    it('events array starts with lifecycle events followed by turn events', async () => {
      const ws1 = mockSocket();
      const ws2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', ws1);
      await manager.joinMatch(matchId, 'Bob', ws2);

      const match = manager.getMatchSync(matchId)!;
      const log = buildMatchEventLog(match);

      expect(log.events[0]!.name).toBe(TelemetryName.EVENT_MATCH_CREATED);
      // After lifecycle events, turn events from transactionLog begin
      const lifecycleCount = match.lifecycleEvents.length;
      expect(log.events.length).toBeGreaterThan(lifecycleCount);
    });

    it('fingerprint can be independently re-derived from the events array', async () => {
      const ws1 = mockSocket();
      const ws2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', ws1);
      await manager.joinMatch(matchId, 'Bob', ws2);

      const match = manager.getMatchSync(matchId)!;
      const log = buildMatchEventLog(match);

      // Re-derive fingerprint from events alone
      const rederived = computeStateHash(log.events);
      expect(rederived).toBe(log.fingerprint);
    });

    it('fingerprint changes when a new action is applied', async () => {
      const ws1 = mockSocket();
      const ws2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', ws1);
      const { playerId: p2Id } = await manager.joinMatch(matchId, 'Bob', ws2);

      const match = manager.getMatchSync(matchId)!;
      const logBefore = buildMatchEventLog(match);

      // P1 deploys a card
      const card = match.state!.players[1]!.hand[0]!;
      await manager.handleAction(matchId, p2Id, {
        type: 'deploy',
        playerIndex: 1,
        column: 0,
        cardId: card.id,
        timestamp: new Date().toISOString(),
      });

      const logAfter = buildMatchEventLog(match);
      expect(logAfter.fingerprint).not.toBe(logBefore.fingerprint);
      expect(logAfter.events.length).toBeGreaterThan(logBefore.events.length);
    });
  });
});
