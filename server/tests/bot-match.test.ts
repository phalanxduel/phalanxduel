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
});
