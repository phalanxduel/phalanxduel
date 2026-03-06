import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchManager } from '../src/match.js';
import type { WebSocket } from 'ws';

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
  opponent: 'bot-random' as const,
  botConfig: { strategy: 'random' as const, seed: 42 },
};

describe('bot match', () => {
  let manager: MatchManager;

  beforeEach(() => {
    manager = new MatchManager();
  });

  it('creates a match with bot that auto-starts immediately', async () => {
    const ws = mockSocket();
    const result = manager.createMatch('Human', ws, BOT_OPTIONS);
    expect(result.matchId).toBeTruthy();
    const match = manager.getMatchSync(result.matchId);
    expect(match).toBeTruthy();
    expect(match?.state).toBeTruthy();
    expect(match?.state?.phase).toBeDefined();
  });

  it('bot match has two players', async () => {
    const ws = mockSocket();
    const { matchId } = manager.createMatch('Human', ws, BOT_OPTIONS);
    const match = manager.getMatchSync(matchId);
    expect(match?.players[0]).toBeTruthy();
    expect(match?.players[1]).toBeTruthy();
    expect(match?.players[1]?.playerName).toBe('Bot (Random)');
  });

  it('bot player has null socket', async () => {
    const ws = mockSocket();
    const { matchId } = manager.createMatch('Human', ws, BOT_OPTIONS);
    const match = manager.getMatchSync(matchId);
    expect(match?.players[1]?.socket).toBeNull();
  });

  it('stores botConfig and botPlayerIndex on match', async () => {
    const ws = mockSocket();
    const { matchId } = manager.createMatch('Human', ws, BOT_OPTIONS);
    const match = manager.getMatchSync(matchId);
    expect(match?.botConfig).toEqual({ strategy: 'random', seed: 42 });
    expect(match?.botPlayerIndex).toBe(1);
  });

  it('normal match (no bot) still works as before', async () => {
    const ws = mockSocket();
    const result = manager.createMatch('Player1', ws);
    const match = manager.getMatchSync(result.matchId);
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

    const match = manager.getMatchSync(matchId);
    const initialActivePlayer = match?.state?.activePlayerIndex;
    const initialHistoryLen = match?.actionHistory.length ?? 0;

    // If bot is active player, advancing timers should cause bot to act
    if (initialActivePlayer === 1) {
      await vi.advanceTimersByTimeAsync(500);
      const afterMatch = manager.getMatchSync(matchId);
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

    const match = manager.getMatchSync(matchId);
    const initialHistoryLen = match?.actionHistory.length ?? 0;

    // If human is active player, bot should not act
    if (match?.state?.activePlayerIndex === 0) {
      await vi.advanceTimersByTimeAsync(500);
      const afterMatch = manager.getMatchSync(matchId);
      expect(afterMatch?.actionHistory.length).toBe(initialHistoryLen);
    }

    vi.useRealTimers();
  });

  it('scheduleBotTurn is a no-op for non-bot matches', async () => {
    const ws = mockSocket();
    const result = manager.createMatch('Player1', ws);
    const match = manager.getMatchSync(result.matchId);
    // Should not throw even though match has no bot
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => (manager as any).scheduleBotTurn(match)).not.toThrow();
  });
});
