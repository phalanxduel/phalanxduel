import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { ServerMessage, GameState } from '@phalanxduel/shared';

// Stub sessionStorage before importing state.ts
const store: Record<string, string> = {};
vi.stubGlobal('sessionStorage', {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, val: string) => {
    store[key] = val;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
});

import {
  getState,
  subscribe,
  dispatch,
  selectAttacker,
  selectDeployCard,
  clearSelection,
  setPlayerName,
  setDamageMode,
  setStartingLifepoints,
  setServerHealth,
  toggleHelp,
  clearError,
  resetToLobby,
  getSavedSession,
  onTurnResult,
} from '../src/state';

function makeGameState(phase = 'AttackPhase'): GameState {
  return {
    phase,
    turnNumber: 1,
    activePlayerIndex: 0,
    players: [],
    gameOptions: { damageMode: 'classic', startingLifepoints: 20 },
    transactionLog: [],
  } as unknown as GameState;
}

describe('state', () => {
  let unsubs: (() => void)[];

  beforeEach(() => {
    unsubs = [];
    resetToLobby();
    for (const key of Object.keys(store)) delete store[key];
    vi.clearAllMocks();
  });

  afterEach(() => {
    unsubs.forEach((fn) => fn());
  });

  describe('getState', () => {
    it('returns initial lobby state', () => {
      const s = getState();
      expect(s.screen).toBe('lobby');
      expect(s.matchId).toBeNull();
      expect(s.playerIndex).toBeNull();
      expect(s.gameState).toBeNull();
      expect(s.damageMode).toBe('classic');
      expect(s.startingLifepoints).toBe(20);
    });
  });

  describe('subscribe', () => {
    it('notifies listener on state change', () => {
      const listener = vi.fn();
      unsubs.push(subscribe(listener));
      setPlayerName('Alice');
      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0]![0].playerName).toBe('Alice');
    });

    it('unsubscribe stops notifications', () => {
      const listener = vi.fn();
      const unsub = subscribe(listener);
      unsub();
      setPlayerName('Bob');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('dispatch matchCreated', () => {
    it('transitions to waiting screen and saves session', () => {
      setPlayerName('Alice');
      dispatch({
        type: 'matchCreated',
        matchId: 'm1',
        playerId: 'p1',
        playerIndex: 0,
      } as ServerMessage);

      const s = getState();
      expect(s.screen).toBe('waiting');
      expect(s.matchId).toBe('m1');
      expect(s.playerId).toBe('p1');
      expect(s.playerIndex).toBe(0);
      expect(sessionStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('dispatch matchJoined', () => {
    it('sets match info and saves session', () => {
      dispatch({
        type: 'matchJoined',
        matchId: 'm2',
        playerId: 'p2',
        playerIndex: 1,
      } as ServerMessage);

      const s = getState();
      expect(s.matchId).toBe('m2');
      expect(s.playerIndex).toBe(1);
      expect(sessionStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('dispatch spectatorJoined', () => {
    it('sets spectator mode and game screen', () => {
      dispatch({
        type: 'spectatorJoined',
        matchId: 'm3',
      } as ServerMessage);

      const s = getState();
      expect(s.screen).toBe('game');
      expect(s.isSpectator).toBe(true);
      expect(s.playerIndex).toBeNull();
    });
  });

  describe('dispatch gameState', () => {
    it('updates game screen for non-gameOver phase', () => {
      const gs = makeGameState('AttackPhase');
      dispatch({
        type: 'gameState',
        matchId: 'm1',
        result: {
          postState: gs,
          preState: gs,
          matchId: 'm1',
          playerId: 'p1',
          action: null,
          events: [],
        },
        spectatorCount: 3,
      } as unknown as ServerMessage);

      const s = getState();
      expect(s.screen).toBe('game');
      expect(s.gameState).toBe(gs);
      expect(s.spectatorCount).toBe(3);
      expect(s.selectedAttacker).toBeNull();
      expect(s.selectedDeployCard).toBeNull();
    });

    it('transitions to gameOver screen for gameOver phase', () => {
      const gs = makeGameState('gameOver');
      dispatch({
        type: 'gameState',
        matchId: 'm1',
        result: {
          postState: gs,
          preState: gs,
          matchId: 'm1',
          playerId: 'p1',
          action: null,
          events: [],
        },
      } as unknown as ServerMessage);

      expect(getState().screen).toBe('gameOver');
    });

    it('invokes turnResultCallback if registered', () => {
      const cb = vi.fn();
      onTurnResult(cb);
      const gs = makeGameState();
      const result = {
        postState: gs,
        preState: gs,
        matchId: 'm1',
        playerId: 'p1',
        action: null,
        events: [],
      };
      dispatch({
        type: 'gameState',
        matchId: 'm1',
        result,
      } as unknown as ServerMessage);

      expect(cb).toHaveBeenCalledWith(result);
    });
  });

  describe('dispatch errors', () => {
    it('actionError sets error', () => {
      dispatch({ type: 'actionError', error: 'bad move' } as ServerMessage);
      expect(getState().error).toBe('bad move');
    });

    it('matchError sets error', () => {
      dispatch({ type: 'matchError', error: 'match full' } as ServerMessage);
      expect(getState().error).toBe('match full');
    });

    it('opponentDisconnected sets error', () => {
      dispatch({ type: 'opponentDisconnected' } as ServerMessage);
      expect(getState().error).toContain('disconnected');
    });

    it('opponentReconnected clears error', () => {
      dispatch({ type: 'opponentDisconnected' } as ServerMessage);
      dispatch({ type: 'opponentReconnected' } as ServerMessage);
      expect(getState().error).toBeNull();
    });
  });

  describe('selection', () => {
    it('selectAttacker sets position and clears error', () => {
      dispatch({ type: 'actionError', error: 'oops' } as ServerMessage);
      selectAttacker({ row: 0, col: 2 });
      const s = getState();
      expect(s.selectedAttacker).toEqual({ row: 0, col: 2 });
      expect(s.error).toBeNull();
    });

    it('selectDeployCard sets cardId and clears error', () => {
      selectDeployCard('card-42');
      expect(getState().selectedDeployCard).toBe('card-42');
    });

    it('clearSelection resets both', () => {
      selectAttacker({ row: 0, col: 0 });
      selectDeployCard('card-1');
      clearSelection();
      const s = getState();
      expect(s.selectedAttacker).toBeNull();
      expect(s.selectedDeployCard).toBeNull();
    });
  });

  describe('settings', () => {
    it('setPlayerName updates name', () => {
      setPlayerName('Charlie');
      expect(getState().playerName).toBe('Charlie');
    });

    it('setDamageMode updates mode', () => {
      setDamageMode('cumulative');
      expect(getState().damageMode).toBe('cumulative');
    });

    it('setStartingLifepoints clamps to [1, 500]', () => {
      setStartingLifepoints(0);
      expect(getState().startingLifepoints).toBe(1);
      setStartingLifepoints(501);
      expect(getState().startingLifepoints).toBe(500);
      setStartingLifepoints(3.7);
      expect(getState().startingLifepoints).toBe(3);
      setStartingLifepoints(50);
      expect(getState().startingLifepoints).toBe(50);
    });

    it('setServerHealth updates health', () => {
      const health = { color: 'green' as const, label: 'Connected', hint: 'v1.0' };
      setServerHealth(health);
      expect(getState().serverHealth).toEqual(health);
    });

    it('toggleHelp flips showHelp', () => {
      expect(getState().showHelp).toBe(false);
      toggleHelp();
      expect(getState().showHelp).toBe(true);
      toggleHelp();
      expect(getState().showHelp).toBe(false);
    });

    it('clearError sets error to null', () => {
      dispatch({ type: 'actionError', error: 'err' } as ServerMessage);
      clearError();
      expect(getState().error).toBeNull();
    });
  });

  describe('session persistence', () => {
    it('getSavedSession returns null when empty', () => {
      expect(getSavedSession()).toBeNull();
    });

    it('getSavedSession returns stored session after matchCreated', () => {
      setPlayerName('Alice');
      dispatch({
        type: 'matchCreated',
        matchId: 'm1',
        playerId: 'p1',
        playerIndex: 0,
      } as ServerMessage);

      const stored = JSON.parse(store['phalanx_session']!);
      expect(stored.matchId).toBe('m1');
      expect(stored.playerId).toBe('p1');
      expect(stored.playerName).toBe('Alice');
    });

    it('resetToLobby clears session', () => {
      dispatch({
        type: 'matchCreated',
        matchId: 'm1',
        playerId: 'p1',
        playerIndex: 0,
      } as ServerMessage);
      resetToLobby();
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('phalanx_session');
      expect(getState().screen).toBe('lobby');
      expect(getState().matchId).toBeNull();
    });
  });
});
