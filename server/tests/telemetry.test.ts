import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TelemetryAttribute,
  TelemetryName,
  type Action,
  type GameState,
} from '@phalanxduel/shared';

describe('telemetry', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('records action spans and victory metrics through the OTel wrappers', async () => {
    const span = {
      setAttributes: vi.fn(),
    };
    const withActiveSpan = vi.fn(async (_name, _options, callback) => callback(span));
    const outcomeCounterAdd = vi.fn();
    const outcomeTurnRecord = vi.fn();
    const createCounter = vi.fn(() => ({ add: outcomeCounterAdd }));
    const createHistogram = vi.fn(() => ({ record: outcomeTurnRecord }));

    vi.doMock('../src/observability.js', () => ({
      withActiveSpan,
      createCounter,
      createHistogram,
    }));

    // Mock instrument.js to avoid booting the SDK in unit tests
    vi.doMock('../src/instrument.js', () => ({
      emitOtlpLog: vi.fn(),
    }));

    const { recordAction } = await import('../src/telemetry.js');

    const matchId = 'match-1';
    const action: Action = {
      type: 'pass',
      playerIndex: 0,
      timestamp: '2026-03-10T12:00:00.000Z',
    };

    const result = await recordAction(matchId, action, async () => {
      return {
        matchId,
        playerId: 'player-1',
        preState: {} as GameState,
        postState: {
          turnNumber: 9,
          phase: 'gameOver',
          outcome: {
            victoryType: 'elimination',
            winnerIndex: 0,
            turnNumber: 9,
          },
          players: [{}, {}],
        } as unknown as GameState,
        action,
      };
    });

    expect(result.matchId).toBe(matchId);
    expect(withActiveSpan).toHaveBeenCalledWith(
      TelemetryName.SPAN_GAME_ACTION,
      {
        attributes: {
          [TelemetryAttribute.MATCH_ID]: matchId,
          [TelemetryAttribute.ACTION_TYPE]: action.type,
          [TelemetryAttribute.PLAYER_INDEX]: action.playerIndex,
          'phalanx.span.op': 'game.logic',
        },
      },
      expect.any(Function),
    );
    expect(span.setAttributes).toHaveBeenCalledWith({
      [TelemetryAttribute.TURN_NUMBER]: 9,
      [TelemetryAttribute.PHASE]: 'gameOver',
    });
    expect(createCounter).toHaveBeenCalledWith('game.outcome', expect.any(Object));
    expect(createHistogram).toHaveBeenCalledWith('game.outcome.turn_number', expect.any(Object));
    expect(outcomeCounterAdd).toHaveBeenCalledWith(1, {
      victory_type: 'elimination',
      winner: '0',
    });
    expect(outcomeTurnRecord).toHaveBeenCalledWith(9, {
      victory_type: 'elimination',
    });
  });

  it('records spans on action failures', async () => {
    const span = {
      setAttributes: vi.fn(),
    };
    const withActiveSpan = vi.fn(async (_name, _options, callback) => callback(span));

    vi.doMock('../src/observability.js', () => ({
      withActiveSpan,
      createCounter: vi.fn(() => ({ add: vi.fn() })),
      createHistogram: vi.fn(() => ({ record: vi.fn() })),
    }));

    vi.doMock('../src/instrument.js', () => ({
      emitOtlpLog: vi.fn(),
    }));

    const { recordAction } = await import('../src/telemetry.js');

    const action: Action = {
      type: 'deploy',
      playerIndex: 1,
      column: 0,
      cardId: 'card-1',
      timestamp: '2026-03-10T12:00:00.000Z',
    };
    const failure = new Error('invalid move');

    await expect(
      recordAction('match-2', action, async () => {
        throw failure;
      }),
    ).rejects.toThrow('invalid move');

    expect(withActiveSpan).toHaveBeenCalledTimes(1);
    expect(span.setAttributes).not.toHaveBeenCalled();
  });
});
