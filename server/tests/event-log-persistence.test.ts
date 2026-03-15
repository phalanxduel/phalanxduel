import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchManager, buildMatchEventLog } from '../src/match.js';
import { MatchRepository } from '../src/db/match-repo.js';
import type { WebSocket } from 'ws';
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

describe('event log persistence', () => {
  let manager: MatchManager;

  beforeEach(() => {
    manager = new MatchManager();
  });

  describe('MatchRepository — no-DB guard paths', () => {
    it('saveEventLog is a no-op when no database is configured', async () => {
      const repo = new MatchRepository();
      const log = {
        matchId: '00000000-0000-0000-0000-000000000001',
        events: [],
        fingerprint: 'abc123',
        generatedAt: new Date().toISOString(),
      };
      // Should not throw with no DATABASE_URL
      await expect(repo.saveEventLog(log.matchId, log)).resolves.toBeUndefined();
    });

    it('getEventLog returns null when no database is configured', async () => {
      const repo = new MatchRepository();
      const result = await repo.getEventLog('00000000-0000-0000-0000-000000000001');
      expect(result).toBeNull();
    });
  });

  describe('buildMatchEventLog — fingerprint integrity', () => {
    it('fingerprint is a 64-char SHA-256 hex string', async () => {
      const ws1 = mockSocket();
      const ws2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', ws1);
      await manager.joinMatch(matchId, 'Bob', ws2);

      const match = manager.getMatchSync(matchId)!;
      const log = buildMatchEventLog(match);

      expect(log.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    });

    it('fingerprint matches independent re-computation from events array', async () => {
      const ws1 = mockSocket();
      const ws2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', ws1);
      await manager.joinMatch(matchId, 'Bob', ws2);

      const match = manager.getMatchSync(matchId)!;
      const log = buildMatchEventLog(match);

      expect(computeStateHash(log.events)).toBe(log.fingerprint);
    });

    it('fingerprint changes after a new action is applied', async () => {
      const ws1 = mockSocket();
      const ws2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', ws1);
      const { playerId: p2Id } = await manager.joinMatch(matchId, 'Bob', ws2);

      const match = manager.getMatchSync(matchId)!;
      const logBefore = buildMatchEventLog(match);

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
    });

    it('log contains more events after forfeit (game.completed appended)', async () => {
      const ws1 = mockSocket();
      const ws2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', ws1);
      const { playerId: p2Id } = await manager.joinMatch(matchId, 'Bob', ws2);

      const match = manager.getMatchSync(matchId)!;
      const countBefore = buildMatchEventLog(match).events.length;

      await manager.handleAction(matchId, p2Id, {
        type: 'forfeit',
        playerIndex: 1,
        timestamp: new Date().toISOString(),
      });

      const logAfter = buildMatchEventLog(match);
      expect(logAfter.events.length).toBeGreaterThan(countBefore);
    });
  });

  describe('event log for bot match', () => {
    it('bot match event log has lifecycle events + turn events', () => {
      const ws = mockSocket();
      const { matchId } = manager.createMatch('Human', ws, BOT_OPTIONS);
      const match = manager.getMatchSync(matchId)!;

      const log = buildMatchEventLog(match);
      expect(log.matchId).toBe(matchId);
      expect(log.events.length).toBeGreaterThan(0);
      // Lifecycle events: match.created, player.joined×2, game.initialized
      expect(log.events[0]!.name).toBe('match.created');
    });

    it('bot match partial log fingerprint is valid before game ends', () => {
      const ws = mockSocket();
      const { matchId } = manager.createMatch('Human', ws, BOT_OPTIONS);
      const match = manager.getMatchSync(matchId)!;

      const log = buildMatchEventLog(match);
      expect(log.fingerprint).toMatch(/^[0-9a-f]{64}$/);
      expect(computeStateHash(log.events)).toBe(log.fingerprint);
    });
  });

  describe('event log generatedAt', () => {
    it('generatedAt is a valid ISO timestamp', async () => {
      const ws1 = mockSocket();
      const ws2 = mockSocket();
      const { matchId } = manager.createMatch('Alice', ws1);
      await manager.joinMatch(matchId, 'Bob', ws2);

      const match = manager.getMatchSync(matchId)!;
      const log = buildMatchEventLog(match);

      expect(() => new Date(log.generatedAt)).not.toThrow();
      expect(new Date(log.generatedAt).toISOString()).toBe(log.generatedAt);
    });
  });
});
