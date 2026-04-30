import { describe, it, expect } from 'vitest';
import { filterStateForPlayer } from '../src/match';
import { filterEventLogForPublic } from '../src/utils/redaction';
import { createInitialState, drawCards, getPlayer, setPlayer } from '../../engine/src/index';
import type { GameState, MatchEventLog, PartialCard } from '@phalanxduel/shared';
import { TelemetryName } from '@phalanxduel/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildStateWithCards(hand0Count: number, hand1Count: number): GameState {
  const config = {
    matchId: 'test-match-id',
    players: [
      { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
      { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
    ] as [{ id: string; name: string }, { id: string; name: string }],
    rngSeed: 42,
  };
  let state = createInitialState(config);

  // createInitialState performs automatic 12-card draws.
  // We need to override this for specific test counts.
  for (let i = 0; i < 2; i++) {
    const p = getPlayer(state, i);
    // Move all hand cards back to drawpile
    const newDrawpile = [
      ...p.hand.map((c) => ({ ...c, id: undefined })),
      ...p.drawpile,
    ] as PartialCard[];
    state = setPlayer(state, i, {
      ...p,
      hand: [],
      drawpile: newDrawpile,
    });
  }

  const ts = new Date().toISOString();
  if (hand0Count > 0) state = drawCards(state, 0, hand0Count, ts);
  if (hand1Count > 0) state = drawCards(state, 1, hand1Count, ts);
  return state;
}

// ---------------------------------------------------------------------------
// filterStateForPlayer
// ---------------------------------------------------------------------------

describe('filterStateForPlayer', () => {
  describe('given playerIndex 0 is the viewing player', () => {
    it("should preserve own player's hand unchanged", () => {
      // Arrange
      const state = buildStateWithCards(5, 4);
      const originalHand = [...state.players[0]!.hand];

      // Act
      const filtered = filterStateForPlayer(state, 0);

      // Assert
      expect(filtered.players[0]!.hand).toEqual(originalHand);
    });

    it("should preserve own player's drawpile unchanged", () => {
      // Arrange
      const state = buildStateWithCards(5, 4);
      const originalDraw = [...state.players[0]!.drawpile];

      // Act
      const filtered = filterStateForPlayer(state, 0);

      // Assert
      expect(filtered.players[0]!.drawpile).toEqual(originalDraw);
    });

    it('should have handCount on own player state', () => {
      // Arrange
      const state = buildStateWithCards(5, 4);

      // Act
      const filtered = filterStateForPlayer(state, 0);

      // Assert — handCount is now part of initialized state
      expect((filtered.players[0] as Record<string, unknown>).handCount).toBe(5);
    });

    it('should have drawpileCount on own player state', () => {
      // Arrange
      const state = buildStateWithCards(5, 4);

      // Act
      const filtered = filterStateForPlayer(state, 0);

      // Assert
      expect((filtered.players[0] as Record<string, unknown>).drawpileCount).toBe(47);
    });

    it("should redact opponent's hand to an empty array", () => {
      // Arrange
      const state = buildStateWithCards(5, 4);
      expect(state.players[1]!.hand.length).toBeGreaterThan(0);

      // Act
      const filtered = filterStateForPlayer(state, 0);

      // Assert
      expect(filtered.players[1]!.hand).toEqual([]);
    });

    it("should redact opponent's drawpile to an empty array", () => {
      // Arrange
      const state = buildStateWithCards(5, 4);
      expect(state.players[1]!.drawpile.length).toBeGreaterThan(0);

      // Act
      const filtered = filterStateForPlayer(state, 0);

      // Assert
      expect(filtered.players[1]!.drawpile).toEqual([]);
    });

    it('should set opponent handCount equal to the original hand length', () => {
      // Arrange
      const state = buildStateWithCards(5, 4);
      const originalOpponentHandLen = state.players[1]!.hand.length;

      // Act
      const filtered = filterStateForPlayer(state, 0);

      // Assert
      expect(filtered.players[1]!.handCount).toBe(originalOpponentHandLen);
    });

    it('should set opponent drawpileCount equal to the original drawpile length', () => {
      // Arrange
      const state = buildStateWithCards(5, 4);
      const originalOpponentDrawLen = state.players[1]!.drawpile.length;

      // Act
      const filtered = filterStateForPlayer(state, 0);

      // Assert
      expect(filtered.players[1]!.drawpileCount).toBe(originalOpponentDrawLen);
    });
  });

  describe('given playerIndex 1 is the viewing player', () => {
    it("should preserve player 1's own hand unchanged", () => {
      // Arrange
      const state = buildStateWithCards(3, 6);
      const originalHand = [...state.players[1]!.hand];

      // Act
      const filtered = filterStateForPlayer(state, 1);

      // Assert
      expect(filtered.players[1]!.hand).toEqual(originalHand);
    });

    it("should redact player 0's hand to an empty array", () => {
      // Arrange
      const state = buildStateWithCards(3, 6);
      expect(state.players[0]!.hand.length).toBeGreaterThan(0);

      // Act
      const filtered = filterStateForPlayer(state, 1);

      // Assert
      expect(filtered.players[0]!.hand).toEqual([]);
    });

    it("should set player 0's handCount correctly when viewed from player 1", () => {
      // Arrange
      const state = buildStateWithCards(3, 6);
      const originalLen = state.players[0]!.hand.length;

      // Act
      const filtered = filterStateForPlayer(state, 1);

      // Assert
      expect(filtered.players[0]!.handCount).toBe(originalLen);
    });

    it("should set player 0's drawpileCount correctly when viewed from player 1", () => {
      // Arrange
      const state = buildStateWithCards(3, 6);
      const originalLen = state.players[0]!.drawpile.length;

      // Act
      const filtered = filterStateForPlayer(state, 1);

      // Assert
      expect(filtered.players[0]!.drawpileCount).toBe(originalLen);
    });
  });

  describe('given the opponent has an empty hand', () => {
    it('should set handCount to 0 when opponent hand is empty', () => {
      // Arrange — draw only for player 0; player 1 starts with no hand cards
      const state = buildStateWithCards(5, 0);
      expect(state.players[1]!.hand).toEqual([]);

      // Act
      const filtered = filterStateForPlayer(state, 0);

      // Assert
      expect(filtered.players[1]!.handCount).toBe(0);
    });

    it('should still correctly report drawpileCount when opponent hand is empty', () => {
      // Arrange
      const state = buildStateWithCards(5, 0);
      const drawLen = state.players[1]!.drawpile.length;

      // Act
      const filtered = filterStateForPlayer(state, 0);

      // Assert
      expect(filtered.players[1]!.drawpileCount).toBe(drawLen);
    });
  });

  describe('given other state fields', () => {
    it('should pass through phase unchanged', () => {
      const state = buildStateWithCards(4, 4);
      expect(filterStateForPlayer(state, 0).phase).toBe(state.phase);
    });

    it('should pass through turnNumber unchanged', () => {
      const state = buildStateWithCards(4, 4);
      expect(filterStateForPlayer(state, 0).turnNumber).toBe(state.turnNumber);
    });

    it('should pass through activePlayerIndex unchanged', () => {
      const state = buildStateWithCards(4, 4);
      expect(filterStateForPlayer(state, 0).activePlayerIndex).toBe(state.activePlayerIndex);
    });

    it('should pass through rngSeed unchanged', () => {
      const state = buildStateWithCards(4, 4);
      expect(filterStateForPlayer(state, 0).rngSeed).toBe(state.rngSeed);
    });

    it("should pass through opponent's discardPile unchanged (discard is public info)", () => {
      const state = buildStateWithCards(4, 4);
      expect(filterStateForPlayer(state, 0).players[1]!.discardPile).toEqual(
        state.players[1]!.discardPile,
      );
    });

    it("should pass through opponent's lifepoints unchanged", () => {
      const state = buildStateWithCards(4, 4);
      expect(filterStateForPlayer(state, 0).players[1]!.lifepoints).toBe(
        state.players[1]!.lifepoints,
      );
    });

    it("should pass through opponent's battlefield unchanged", () => {
      const state = buildStateWithCards(4, 4);
      expect(filterStateForPlayer(state, 0).players[1]!.battlefield).toEqual(
        state.players[1]!.battlefield,
      );
    });
  });

  describe('given immutability', () => {
    it('should not mutate the original state hand arrays', () => {
      // Arrange
      const state = buildStateWithCards(5, 4);
      const originalHand1 = state.players[1]!.hand;

      // Act
      filterStateForPlayer(state, 0);

      // Assert — original state is untouched
      expect(state.players[1]!.hand).toBe(originalHand1);
      expect(state.players[1]!.hand.length).toBeGreaterThan(0);
    });

    it('should not mutate the original state drawpile arrays', () => {
      // Arrange
      const state = buildStateWithCards(5, 4);
      const originalDraw1 = state.players[1]!.drawpile;

      // Act
      filterStateForPlayer(state, 0);

      // Assert
      expect(state.players[1]!.drawpile).toBe(originalDraw1);
    });
  });
});

// ---------------------------------------------------------------------------
// filterEventLogForPublic — redaction of PhalanxEvent logs
// ---------------------------------------------------------------------------

describe('filterEventLogForPublic', () => {
  function makeEventLog(eventName: string): MatchEventLog {
    return {
      matchId: '00000000-0000-0000-0000-000000000001',
      events: [
        {
          id: 'test-match:seq1:ev0',
          parentId: 'test-match:seq1:turn',
          type: 'functional_update',
          name: eventName,
          timestamp: '2026-01-01T00:00:00.000Z',
          payload: { type: 'attack_resolved', outcome: { playerDamaged: false } },
          status: 'ok',
        },
      ],
      fingerprint: 'ignored-input',
      generatedAt: '2026-01-01T00:00:00.000Z',
    };
  }

  it('passes attack.resolved events through without redaction', () => {
    const log = makeEventLog(TelemetryName.EVENT_ATTACK_RESOLVED);
    const result = filterEventLogForPublic(log);

    const found = result.events.find((e) => e.name === TelemetryName.EVENT_ATTACK_RESOLVED);
    expect(found).toBeDefined();
    expect(found!.payload.type).toBe('attack_resolved');
  });

  it('preserves the full payload of attack.resolved events', () => {
    const log = makeEventLog(TelemetryName.EVENT_ATTACK_RESOLVED);
    const result = filterEventLogForPublic(log);

    const original = log.events[0]!;
    const filtered = result.events[0]!;
    expect(JSON.stringify(filtered.payload)).toBe(JSON.stringify(original.payload));
  });

  it('recomputes fingerprint from the filtered events', () => {
    const log = makeEventLog(TelemetryName.EVENT_ATTACK_RESOLVED);
    const result = filterEventLogForPublic(log);

    // fingerprint must be deterministic: calling again produces the same value
    const second = filterEventLogForPublic(log);
    expect(result.fingerprint).toBe(second.fingerprint);
    // and it should differ from the placeholder input fingerprint
    expect(result.fingerprint).not.toBe('ignored-input');
  });

  it('passes through all standard functional_update event names without removal', () => {
    const names = [
      TelemetryName.EVENT_INIT,
      TelemetryName.EVENT_DEPLOY,
      TelemetryName.EVENT_COMBAT_STEP,
      TelemetryName.EVENT_ATTACK_RESOLVED,
      TelemetryName.EVENT_PASS,
      TelemetryName.EVENT_REINFORCE,
      TelemetryName.EVENT_FORFEIT,
    ];

    for (const name of names) {
      const log = makeEventLog(name);
      const result = filterEventLogForPublic(log);
      expect(result.events).toHaveLength(1);
      expect(result.events[0]!.name).toBe(name);
    }
  });
});
