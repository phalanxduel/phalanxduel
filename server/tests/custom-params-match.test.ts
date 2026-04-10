import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchManager } from '../src/match.js';
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

  beforeEach(() => {
    manager = new MatchManager();
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

  it('preserves non-default canonical initiative and pass rules', async () => {
    const ws1 = mockSocket();
    const ws2 = mockSocket();
    const { matchId } = await manager.createMatch('Player1', ws1, {
      matchParams: {
        classic: {
          enabled: true,
          mode: 'hybrid',
          initiative: { deployFirst: 'P1', attackFirst: 'P2' },
          passRules: { maxConsecutivePasses: 4, maxTotalPassesPerPlayer: 6 },
        },
        initiative: { deployFirst: 'P1', attackFirst: 'P2' },
        modePassRules: { maxConsecutivePasses: 4, maxTotalPassesPerPlayer: 6 },
      },
    });
    await manager.joinMatch(matchId, 'Player2', ws2);

    const match = await manager.getMatch(matchId);
    expect(match?.state?.params.initiative).toEqual({
      deployFirst: 'P1',
      attackFirst: 'P2',
    });
    expect(match?.state?.params.modePassRules).toEqual({
      maxConsecutivePasses: 4,
      maxTotalPassesPerPlayer: 6,
    });
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
    await expect(
      manager.createMatch('Player1', ws1, {
        matchParams: { columns: 3, maxHandSize: 10 },
      }),
    ).rejects.toThrow(/maxHandSize.*cannot exceed.*columns/i);
  });

  it('rejects explicit initialDraw that violates formula', async () => {
    const ws1 = mockSocket();
    await expect(
      manager.createMatch('Player1', ws1, {
        matchParams: { rows: 2, columns: 4, initialDraw: 10 },
      }),
    ).rejects.toThrow(/Initial Draw Formula Mismatch/i);
  });

  it('rejects rows * columns exceeding 48 total slots', async () => {
    const ws1 = mockSocket();
    await expect(
      manager.createMatch('Player1', ws1, {
        matchParams: { rows: 7, columns: 7 },
      }),
    ).rejects.toThrow(/total slots.*cannot exceed 48/i);
  });

  it('rejects card scarcity invariant violations during createMatch', async () => {
    const ws1 = mockSocket();
    await expect(
      manager.createMatch('Player1', ws1, {
        matchParams: {
          rows: 12,
          columns: 4,
          initialDraw: 52,
          classic: {
            enabled: false,
            mode: 'hybrid',
            start: { initialDraw: 52 },
          },
        },
      }),
    ).rejects.toThrow(/Card Scarcity Invariant/i);
  });

  it('rejects strict-mode parity violations during createMatch', async () => {
    const ws1 = mockSocket();
    await expect(
      manager.createMatch('Player1', ws1, {
        matchParams: {
          initiative: { deployFirst: 'P1' },
          classic: {
            enabled: true,
            mode: 'strict',
            initiative: { deployFirst: 'P2' },
          },
        },
      }),
    ).rejects.toThrow(/initiative\.deployFirst.*must match classic block/i);
  });

  it('still fills defaults when params are omitted (no rejection)', async () => {
    const ws1 = mockSocket();
    const ws2 = mockSocket();
    const { matchId } = await manager.createMatch('Player1', ws1, {
      matchParams: { columns: 3 },
    });
    await manager.joinMatch(matchId, 'Player2', ws2);
    const match = await manager.getMatch(matchId);
    expect(match?.state?.params.maxHandSize).toBe(3);
    // initialDraw computed from formula: rows(2) * columns(3) + columns(3) = 9
    expect(match?.state?.params.initialDraw).toBe(9);
  });
});
