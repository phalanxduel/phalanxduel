import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import { DEFAULT_MATCH_PARAMS } from '@phalanxduel/shared';
import { MatchManager } from '../src/match.js';

function mockSocket(): WebSocket {
  return { readyState: 1, send: vi.fn() } as unknown as WebSocket;
}

describe('custom match params', () => {
  let manager: MatchManager;

  beforeEach(() => {
    manager = new MatchManager();
  });

  it('propagates full custom params into initialized game state', () => {
    const ws1 = mockSocket();
    const ws2 = mockSocket();
    const customParams = { rows: 3, columns: 3, maxHandSize: 3, initialDraw: 12 };
    const { matchId } = manager.createMatch('Alice', ws1, { matchParams: customParams });

    manager.joinMatch(matchId, 'Bob', ws2);

    const match = manager.getMatch(matchId);
    expect(match?.state?.params.rows).toBe(3);
    expect(match?.state?.params.columns).toBe(3);
    expect(match?.state?.params.maxHandSize).toBe(3);
    expect(match?.state?.params.initialDraw).toBe(12);
    expect(match?.state?.players[0]?.battlefield).toHaveLength(9);
    expect(match?.state?.players[1]?.battlefield).toHaveLength(9);
  });

  it('uses default params when createMatch omits matchParams', () => {
    const ws1 = mockSocket();
    const ws2 = mockSocket();
    const { matchId } = manager.createMatch('Alice', ws1);

    manager.joinMatch(matchId, 'Bob', ws2);

    const match = manager.getMatch(matchId);
    expect(match?.state?.params.rows).toBe(DEFAULT_MATCH_PARAMS.rows);
    expect(match?.state?.params.columns).toBe(DEFAULT_MATCH_PARAMS.columns);
    expect(match?.state?.params.maxHandSize).toBe(DEFAULT_MATCH_PARAMS.maxHandSize);
    expect(match?.state?.params.initialDraw).toBe(DEFAULT_MATCH_PARAMS.initialDraw);
  });

  it('normalizes partial params deterministically', () => {
    const ws1 = mockSocket();
    const ws2 = mockSocket();
    const { matchId } = manager.createMatch('Alice', ws1, {
      matchParams: { columns: 2 },
    });

    manager.joinMatch(matchId, 'Bob', ws2);

    const match = manager.getMatch(matchId);
    expect(match?.state?.params.rows).toBe(DEFAULT_MATCH_PARAMS.rows);
    expect(match?.state?.params.columns).toBe(2);
    expect(match?.state?.params.maxHandSize).toBe(2);
    expect(match?.state?.params.initialDraw).toBe(6);
  });
});
