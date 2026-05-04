import { describe, it, expect } from 'vitest';
import { projectForViewer } from '../src/utils/viewer-projection';
import { createInitialState, drawCards } from '../../engine/src/index';
import type { MatchInstance } from '../src/match-types';
import type { GameState } from '@phalanxduel/shared';

const MATCH_ID = '00000000-0000-0000-0000-000000000099';
const PLAYER_IDS = [
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
] as const;

function buildState(overrides: Partial<GameState> = {}): GameState {
  const config = {
    matchId: MATCH_ID,
    players: [
      { id: PLAYER_IDS[0], name: 'Alice' },
      { id: PLAYER_IDS[1], name: 'Bob' },
    ] as [{ id: string; name: string }, { id: string; name: string }],
    rngSeed: 7,
  };
  const base = createInitialState(config);
  const ts = new Date().toISOString();
  const withCards = drawCards(drawCards(base, 0, 3, ts), 1, 3, ts);
  return { ...withCards, ...overrides };
}

function buildMatch(state: GameState): MatchInstance {
  return {
    matchId: MATCH_ID,
    players: [null, null],
    spectators: [],
    state,
    config: null,
    actionHistory: [],
    lastPreState: null,
    lifecycleEvents: [],
    fatalEvents: [],
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
  };
}

describe('projectForViewer', () => {
  it('player-0 view: own hand visible, player-1 hand/drawpile hidden', () => {
    const match = buildMatch(buildState());
    const result = projectForViewer(match, 0);
    expect(result.postState.players[0]!.hand.length).toBeGreaterThan(0);
    expect(result.postState.players[1]!.hand).toHaveLength(0);
    expect(result.postState.players[1]!.drawpile).toHaveLength(0);
    expect(result.postState.players[1]!.handCount).toBeGreaterThan(0);
    expect(result.viewerIndex).toBe(0);
  });

  it('player-1 view: own hand visible, player-0 hand/drawpile hidden', () => {
    const match = buildMatch(buildState());
    const result = projectForViewer(match, 1);
    expect(result.postState.players[1]!.hand.length).toBeGreaterThan(0);
    expect(result.postState.players[0]!.hand).toHaveLength(0);
    expect(result.postState.players[0]!.drawpile).toHaveLength(0);
    expect(result.viewerIndex).toBe(1);
  });

  it('spectator view: both hands hidden', () => {
    const match = buildMatch(buildState());
    const result = projectForViewer(match, null);
    expect(result.postState.players[0]!.hand).toHaveLength(0);
    expect(result.postState.players[1]!.hand).toHaveLength(0);
    expect(result.postState.players[0]!.handCount).toBeGreaterThan(0);
    expect(result.postState.players[1]!.handCount).toBeGreaterThan(0);
    expect(result.viewerIndex).toBeNull();
  });

  it('completed match: all cards revealed for any viewer', () => {
    const state = buildState({
      phase: 'gameOver',
      outcome: { winnerIndex: 0, victoryType: 'lifepoints', turnNumber: 1 },
    });
    const match = buildMatch(state);
    const spectatorResult = projectForViewer(match, null);
    expect(spectatorResult.postState.players[0]!.hand.length).toBeGreaterThan(0);
    expect(spectatorResult.postState.players[1]!.hand.length).toBeGreaterThan(0);
  });

  it('uses lastPreState as preState when available', () => {
    const pre = buildState();
    const post = buildState();
    const match = buildMatch(post);
    match.lastPreState = pre;
    const result = projectForViewer(match, 0);
    expect(result.preState).toBeDefined();
  });

  it('falls back to postState as preState when lastPreState is null', () => {
    const match = buildMatch(buildState());
    const result = projectForViewer(match, 0);
    expect(result.preState).toBeDefined();
  });
});
