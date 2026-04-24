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
    damageMode: 'cumulative',
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
    const detail = container.querySelector('.lp-summary'); // Updated selector
    expect(detail).toBeTruthy();
    expect(detail!.textContent).toContain('LP Depletion'); // Updated text
    expect(detail!.textContent).toContain('turn 7'); // Updated case/text
  });

  it('renders a turning-point summary', () => {
    const state = makeState({ victoryType: 'lpDepletion', turnNumber: 7 });
    state.gameState!.transactionLog = [
      {
        sequenceNumber: 1,
        action: {
          type: 'attack',
          playerIndex: 0,
          attackingColumn: 0,
          defendingColumn: 0,
          timestamp: '',
        },
        stateHashBefore: 'before',
        stateHashAfter: 'after',
        timestamp: '',
        details: {
          type: 'attack',
          combat: {
            turnNumber: 7,
            attackerPlayerIndex: 0,
            attackerCard: { id: 'atk', face: 'T', suit: 'spades', value: 10, type: 'number' },
            targetColumn: 0,
            baseDamage: 10,
            totalLpDamage: 4,
            steps: [{ target: 'playerLp', damage: 4, lpBefore: 8, lpAfter: 4 }],
          },
          reinforcementTriggered: false,
          victoryTriggered: true,
        },
      } as never,
    ];

    renderGameOver(container, state);

    const summary = container.querySelector('[data-testid="turning-point-summary"]');
    expect(summary).toBeTruthy();
    expect(summary!.textContent).toContain('TURNING_POINT');
    expect(summary!.textContent).toContain('Turn 7');
    expect(summary!.textContent).toContain('WHY');
    expect(summary!.textContent).toContain('RESULT');
  });

  it('renders "Play Again" button with data-testid="play-again-btn"', () => {
    renderGameOver(container, makeState({}));
    const btn = container.querySelector('[data-testid="play-again-btn"]');
    expect(btn).toBeTruthy();
    expect(btn!.textContent).toBe('Play Again');
  });

  it('shows correct message when player wins by forfeit', () => {
    const state = makeState({
      playerIndex: 0,
      winnerIndex: 0,
      victoryType: 'forfeit',
      turnNumber: 36,
    });
    renderGameOver(container, state);

    const detail = container.querySelector('.lp-summary');
    expect(detail!.textContent).toBe('Forfeit on turn 36');
  });

  it('renders copy result button', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn(() => Promise.resolve()) },
    });

    const state = makeState({ victoryType: 'lpDepletion', turnNumber: 7 });
    renderGameOver(container, state);

    const btn = container.querySelector('button');
    expect(btn?.textContent).toContain('COPY_RESULT');

    btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
