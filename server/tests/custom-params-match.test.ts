import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchManager } from '../src/match.js';
import { InMemoryStateStore, EventEmitterBus } from '../src/db/in-memory-store.js';
import { DEFAULT_MATCH_PARAMS } from '@phalanxduel/shared';
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

describe('custom match params', () => {
  let manager: MatchManager;

  beforeEach(async () => {
    manager = new MatchManager(new InMemoryStateStore(), new EventEmitterBus());
  });

  it('propagates full custom params into initialized game state', async () => {
    const ws1 = mockSocket();
    const ws2 = mockSocket();
    const customParams = {
      rows: 3,
      columns: 3,
      maxHandSize: 3,
      initialDraw: 12,
    };

    const { matchId } = await manager.createMatch('Player1', ws1, {
      matchParams: customParams,
    });
    await manager.joinMatch(matchId, 'Player2', ws2);

    const match = await manager.getMatch(matchId);
    expect(match?.state?.params.rows).toBe(3);
    expect(match?.state?.params.columns).toBe(3);
    expect(match?.state?.params.maxHandSize).toBe(3);
  });

  it('uses default params when createMatch omits matchParams', async () => {
    const ws1 = mockSocket();
    const ws2 = mockSocket();
    const { matchId } = await manager.createMatch('Player1', ws1);
    await manager.joinMatch(matchId, 'Player2', ws2);

    const match = await manager.getMatch(matchId);
    expect(match?.state?.params.rows).toBe(DEFAULT_MATCH_PARAMS.rows);
    expect(match?.state?.params.columns).toBe(DEFAULT_MATCH_PARAMS.columns);
    expect(match?.state?.params.maxHandSize).toBe(DEFAULT_MATCH_PARAMS.maxHandSize);
  });

  it('normalizes partial params deterministically', async () => {
    const ws1 = mockSocket();
    const ws2 = mockSocket();
    const { matchId } = await manager.createMatch('Player1', ws1, {
      matchParams: { columns: 2, maxHandSize: 2 },
    });
    await manager.joinMatch(matchId, 'Player2', ws2);

    const match = await manager.getMatch(matchId);
    expect(match?.state?.params.rows).toBe(DEFAULT_MATCH_PARAMS.rows);
    expect(match?.state?.params.columns).toBe(2);
    expect(match?.state?.params.maxHandSize).toBe(2);
  });

  it('rejects explicit maxHandSize exceeding columns', async () => {
    const ws1 = mockSocket();
    const ws2 = mockSocket();
    const { matchId } = await manager.createMatch('Player1', ws1, {
      matchParams: { columns: 3, maxHandSize: 10 },
    });
    await expect(manager.joinMatch(matchId, 'Player2', ws2)).rejects.toThrow(
      /maxHandSize.*cannot exceed.*columns/i,
    );
  });

  it('rejects explicit initialDraw that violates formula', async () => {
    const ws1 = mockSocket();
    const ws2 = mockSocket();
    const { matchId } = await manager.createMatch('Player1', ws1, {
      matchParams: { rows: 2, columns: 4, initialDraw: 99 },
    });
    await expect(manager.joinMatch(matchId, 'Player2', ws2)).rejects.toThrow(
      /initialDraw.*must equal/i,
    );
  });

  it('rejects rows * columns exceeding 48 total slots', async () => {
    const ws1 = mockSocket();
    const ws2 = mockSocket();
    const { matchId } = await manager.createMatch('Player1', ws1, {
      matchParams: { rows: 10, columns: 10 },
    });
    await expect(manager.joinMatch(matchId, 'Player2', ws2)).rejects.toThrow(
      /total slots.*cannot exceed 48/i,
    );
  });

  it('still fills defaults when params are omitted (no rejection)', async () => {
    const ws1 = mockSocket();
    const ws2 = mockSocket();
    const { matchId } = await manager.createMatch('Player1', ws1, {
      matchParams: { columns: 3 },
    });
    await manager.joinMatch(matchId, 'Player2', ws2);
    const match = await manager.getMatch(matchId);
    // maxHandSize defaults to DEFAULT but clamped to columns=3
    expect(match?.state?.params.maxHandSize).toBe(3);
    // initialDraw computed from formula: rows(2) * columns(3) + columns(3) = 9
    expect(match?.state?.params.initialDraw).toBe(9);
  });
});
