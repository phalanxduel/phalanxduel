import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocket } from 'ws';
import { MatchManager } from '../src/match.js';

function mockSocket(): WebSocket {
  return { readyState: 1, send: vi.fn() } as unknown as WebSocket;
}

const BOT_OPTIONS = {
  botOptions: {
    opponent: 'bot-random' as const,
    botConfig: { strategy: 'random' as const, seed: 42 },
  },
};

describe('bot match', () => {
  let manager: MatchManager;

  beforeEach(() => {
    manager = new MatchManager();
  });

  it('creates a match with bot that auto-starts immediately', () => {
    const ws = mockSocket();
    const result = manager.createMatch('Human', ws, BOT_OPTIONS);
    expect(result.matchId).toBeTruthy();
    const match = manager.getMatch(result.matchId);
    expect(match?.state).toBeTruthy();
    expect(match?.state?.phase).toBeDefined();
  });

  it('bot match has two players', () => {
    const ws = mockSocket();
    const { matchId } = manager.createMatch('Human', ws, BOT_OPTIONS);
    const match = manager.getMatch(matchId);
    expect(match?.players[0]).toBeTruthy();
    expect(match?.players[1]).toBeTruthy();
    expect(match?.players[1]?.playerName).toBe('Bot (Random)');
  });

  it('bot player has null socket', () => {
    const ws = mockSocket();
    const { matchId } = manager.createMatch('Human', ws, BOT_OPTIONS);
    const match = manager.getMatch(matchId);
    expect(match?.players[1]?.socket).toBeNull();
  });

  it('stores botConfig and botPlayerIndex on match', () => {
    const ws = mockSocket();
    const { matchId } = manager.createMatch('Human', ws, BOT_OPTIONS);
    const match = manager.getMatch(matchId);
    expect(match?.botConfig).toEqual({ strategy: 'random', seed: 42 });
    expect(match?.botPlayerIndex).toBe(1);
  });

  it('normal match (no bot) still works as before', () => {
    const ws = mockSocket();
    const result = manager.createMatch('Player1', ws);
    const match = manager.getMatch(result.matchId);
    expect(match?.state).toBeNull(); // Game not started yet
    expect(match?.players[1]).toBeNull();
    expect(match?.botConfig).toBeUndefined();
  });

  it('has scheduleBotTurn method', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(typeof (manager as any).scheduleBotTurn).toBe('function');
  });

  it('bot responds when it is active player after init', async () => {
    vi.useFakeTimers();
    const ws = mockSocket();
    const { matchId } = manager.createMatch('Human', ws, {
      ...BOT_OPTIONS,
      rngSeed: 42,
    });

    const match = manager.getMatch(matchId);
    const initialActivePlayer = match?.state?.activePlayerIndex;
    const initialHistoryLen = match?.actionHistory.length ?? 0;

    // If bot is active player, advancing timers should cause bot to act
    if (initialActivePlayer === 1) {
      await vi.advanceTimersByTimeAsync(500);
      const afterMatch = manager.getMatch(matchId);
      expect(afterMatch?.actionHistory.length).toBeGreaterThan(initialHistoryLen);
    }

    vi.useRealTimers();
  });

  it('bot does not act when human is active player', async () => {
    vi.useFakeTimers();
    const ws = mockSocket();
    const { matchId } = manager.createMatch('Human', ws, {
      ...BOT_OPTIONS,
      rngSeed: 42,
    });

    const match = manager.getMatch(matchId);
    const initialHistoryLen = match?.actionHistory.length ?? 0;

    // If human is active player, bot should not act
    if (match?.state?.activePlayerIndex === 0) {
      await vi.advanceTimersByTimeAsync(500);
      const afterMatch = manager.getMatch(matchId);
      expect(afterMatch?.actionHistory.length).toBe(initialHistoryLen);
    }

    vi.useRealTimers();
  });

  it('scheduleBotTurn is a no-op for non-bot matches', () => {
    const ws = mockSocket();
    const result = manager.createMatch('Player1', ws);
    const match = manager.getMatch(result.matchId);
    // Should not throw even though match has no bot
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => (manager as any).scheduleBotTurn(match)).not.toThrow();
  });
});
