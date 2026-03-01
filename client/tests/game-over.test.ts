import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { GameState } from '@phalanxduel/shared';
import type { AppState } from '../src/state';

// Mock resetToLobby so we don't pull in session/storage side effects
vi.mock('../src/state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/state')>();
  return { ...actual, resetToLobby: vi.fn() };
});

import { renderGameOver } from '../src/game-over';

function makePlayer(name: string, lp: number) {
  return {
    player: { name },
    lifepoints: lp,
    hand: [],
    drawpile: [],
    drawpileCount: 0,
    handCount: 0,
    battlefield: [],
    discardPile: [],
  };
}

function makeState(overrides: {
  playerIndex?: number | null;
  winnerIndex?: number;
  victoryType?: string;
  turnNumber?: number;
  p0Lp?: number;
  p1Lp?: number;
}): AppState {
  const {
    playerIndex = 0,
    winnerIndex = 0,
    victoryType = 'lpDepletion',
    turnNumber = 5,
    p0Lp = 12,
    p1Lp = 0,
  } = overrides;

  const gs = {
    turnNumber,
    phase: 'GameOverPhase',
    activePlayerIndex: 0,
    players: [makePlayer('Alice', p0Lp), makePlayer('Bob', p1Lp)],
    outcome: { winnerIndex, victoryType, turnNumber },
    gameOptions: {},
    transactionLog: [],
  } as unknown as GameState;

  return {
    screen: 'gameOver',
    matchId: 'test-match',
    playerId: 'test-player',
    playerIndex,
    playerName: 'Alice',
    gameState: gs,
    selectedAttacker: null,
    selectedDeployCard: null,
    error: null,
    damageMode: 'normal',
    startingLifepoints: 20,
    serverHealth: null,
    isSpectator: false,
    spectatorCount: 0,
    showHelp: false,
  } as AppState;
}

describe('renderGameOver', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders game-over wrapper with data-testid="game-over"', () => {
    renderGameOver(container, makeState({}));
    const wrapper = container.querySelector('[data-testid="game-over"]');
    expect(wrapper).toBeTruthy();
  });

  it('shows "You Win!" with class "win" when player wins', () => {
    const state = makeState({ playerIndex: 0, winnerIndex: 0 });
    renderGameOver(container, state);
    const result = container.querySelector('[data-testid="game-over-result"]');
    expect(result).toBeTruthy();
    expect(result!.textContent).toBe('You Win!');
    expect(result!.classList.contains('win')).toBe(true);
  });

  it('shows "You Lose" with class "lose" when player loses', () => {
    const state = makeState({ playerIndex: 0, winnerIndex: 1 });
    renderGameOver(container, state);
    const result = container.querySelector('[data-testid="game-over-result"]');
    expect(result).toBeTruthy();
    expect(result!.textContent).toBe('You Lose');
    expect(result!.classList.contains('lose')).toBe(true);
  });

  it('shows victory type and turn number', () => {
    const state = makeState({ victoryType: 'lpDepletion', turnNumber: 7 });
    renderGameOver(container, state);
    const detail = container.querySelector('.lp-summary');
    expect(detail).toBeTruthy();
    expect(detail!.textContent).toContain('LP Depletion');
    expect(detail!.textContent).toContain('turn 7');
  });

  it('renders "Play Again" button with data-testid="play-again-btn"', () => {
    renderGameOver(container, makeState({}));
    const btn = container.querySelector('[data-testid="play-again-btn"]');
    expect(btn).toBeTruthy();
    expect(btn!.textContent).toBe('Play Again');
  });
});
