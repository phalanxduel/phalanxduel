import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LocalMatchManager } from '../src/match.js';
import type { MatchInstance } from '../src/match.js';
import { InMemoryLedgerStore } from '../src/db/ledger-store.js';
import type { MatchRepository } from '../src/db/match-repo.js';
import { mockSocket } from './helpers/socket.js';

interface LocalMatchManagerBotTurnHarness {
  scheduleBotTurn(match: MatchInstance): void;
}

function getBotTurnHarness(manager: LocalMatchManager): LocalMatchManagerBotTurnHarness {
  return manager as unknown as LocalMatchManagerBotTurnHarness;
}

const BOT_OPTIONS = {
  botOptions: {
    opponent: 'bot-random' as const,
    botConfig: { strategy: 'random' as const, seed: 42 },
  },
};

describe('bot match', () => {
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
    vi.useRealTimers();
  });

  it('creates a match with bot that auto-starts immediately', async () => {
    const ws = mockSocket();
    const result = await manager.createMatch('Human', ws, BOT_OPTIONS);
    expect(result.matchId).toBeTruthy();
    const match = manager.getMatchSync(result.matchId);
    expect(match).toBeTruthy();
    expect(match?.state).toBeTruthy();
    expect(match?.state?.phase).toBeDefined();
  });

  it('bot match has two players', async () => {
    const ws = mockSocket();
    const { matchId } = await manager.createMatch('Human', ws, BOT_OPTIONS);
    const match = manager.getMatchSync(matchId);
    expect(match?.players[0]).toBeTruthy();
    expect(match?.players[1]).toBeTruthy();
    expect(match?.players[1]?.playerName).toBe('Bot (Random)');
  });

  it('bot player has null socket', async () => {
    const ws = mockSocket();
    const { matchId } = await manager.createMatch('Human', ws, BOT_OPTIONS);
    const match = manager.getMatchSync(matchId);
    expect(match?.players[1]?.socket).toBeNull();
  });

  it('stores botConfig and botPlayerIndex on match', async () => {
    const ws = mockSocket();
    const { matchId } = await manager.createMatch('Human', ws, BOT_OPTIONS);
    const match = manager.getMatchSync(matchId);
    expect(match?.botConfig).toEqual({ strategy: 'random' as const, seed: 42 });
    expect(match?.botPlayerIndex).toBe(1);
  });

  it('normal match (no bot) still works as before', async () => {
    const ws = mockSocket();
    const result = await manager.createMatch('Player1', ws);
    const match = manager.getMatchSync(result.matchId);
    expect(match?.state).toBeNull(); // Game not started yet
    expect(match?.players[1]).toBeNull();
    expect(match?.botConfig).toBeUndefined();
  });

  it('has scheduleBotTurn method', () => {
    expect(typeof getBotTurnHarness(manager).scheduleBotTurn).toBe('function');
  });

  it('bot responds when it is active player after init', async () => {
    const ws = mockSocket();
    const { matchId } = await manager.createMatch('Human', ws, {
      ...BOT_OPTIONS,
      rngSeed: 42,
    });

    const match = manager.getMatchSync(matchId);
    const initialActivePlayer = match?.state?.activePlayerIndex;
    const initialHistoryLen = match?.actionHistory.length ?? 0;

    // If bot is active player, advancing timers should cause bot to act
    if (initialActivePlayer === 1) {
      await vi.advanceTimersByTimeAsync(1500);
      const afterMatch = manager.getMatchSync(matchId);
      expect(afterMatch?.actionHistory.length).toBeGreaterThan(initialHistoryLen);
    }

    vi.useRealTimers();
  });

  it('bot does not act when human is active player', async () => {
    const ws = mockSocket();
    const { matchId } = await manager.createMatch('Human', ws, {
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
    const result = await manager.createMatch('Player1', ws);
    const match = manager.getMatchSync(result.matchId);
    expect(match).toBeTruthy();
    if (!match) {
      throw new Error('Expected created match to exist');
    }
    expect(() => {
      getBotTurnHarness(manager).scheduleBotTurn(match);
    }).not.toThrow();
  });
});
