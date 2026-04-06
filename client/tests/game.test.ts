import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { GameState, Action } from '@phalanxduel/shared';
import type { AppState } from '../src/state';

vi.mock('../src/state', () => ({
  getState: vi.fn(() => ({ showHelp: false, serverHealth: null })),
  selectAttacker: vi.fn(),
  selectDeployCard: vi.fn(),
  clearSelection: vi.fn(),
  toggleHelp: vi.fn(),
}));

vi.mock('../src/renderer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/renderer')>();
  return {
    ...actual,
    getConnection: vi.fn(() => null),
  };
});

function makePlayer(name: string, lp: number) {
  return {
    player: { name },
    lifepoints: lp,
    hand: [],
    drawpile: [],
    drawpileCount: 0,
    handCount: 0,
    battlefield: Array(8).fill(null),
    discardPile: [],
  };
}

function makeGameState(overrides?: {
  turnNumber?: number;
  phase?: string;
  activePlayerIndex?: number;
  p0Name?: string;
  p1Name?: string;
  p0Lp?: number;
  p1Lp?: number;
  consecutivePasses?: [number, number];
  totalPasses?: [number, number];
}): AppState {
  const {
    turnNumber = 3,
    phase = 'AttackPhase',
    activePlayerIndex = 0,
    p0Name = 'Alice',
    p1Name = 'Bob',
    p0Lp = 20,
    p1Lp = 20,
    consecutivePasses = [0, 0] as [number, number],
    totalPasses = [0, 0] as [number, number],
  } = overrides ?? {};

  const gs = {
    turnNumber,
    phase,
    activePlayerIndex,
    players: [makePlayer(p0Name, p0Lp), makePlayer(p1Name, p1Lp)],
    gameOptions: {},
    transactionLog: [],
    reinforcement: null,
    params: {
      modePassRules: { maxConsecutivePasses: 3, maxTotalPassesPerPlayer: 5 },
    },
    passState: { consecutivePasses, totalPasses },
  } as unknown as GameState;

  return {
    screen: 'game',
    matchId: 'match-1',
    playerId: 'player-1',
    playerIndex: 0,
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
    validActions: [
      { type: 'pass', playerIndex: 0, timestamp: '' } as Action,
      { type: 'forfeit', playerIndex: 0, timestamp: '' } as Action,
    ],
  } as AppState;
}

describe('renderGame', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders game layout with data-testid="game-layout"', async () => {
    const { renderGame } = await import('../src/game');
    renderGame(container, makeGameState());

    const layout = container.querySelector('[data-testid="game-layout"]');
    expect(layout).toBeTruthy();
  });

  it('shows phase label and turn count separately', async () => {
    const { renderGame } = await import('../src/game');
    renderGame(container, makeGameState({ turnNumber: 3 }));

    const phase = container.querySelector('[data-testid="phase-indicator"]');
    expect(phase).toBeTruthy();

    const turnCount = container.querySelector('.turn-count');
    expect(turnCount).toBeTruthy();
    expect(turnCount!.textContent).toBe('T3');
  });

  it('shows "Your turn" when active player (data-testid="turn-indicator")', async () => {
    const { renderGame } = await import('../src/game');
    renderGame(container, makeGameState({ activePlayerIndex: 0 }));

    const turn = container.querySelector('[data-testid="turn-indicator"]');
    expect(turn).toBeTruthy();
    expect(turn!.textContent).toBe('Your turn');
  });

  it('shows "Opponent\'s turn" when not active', async () => {
    const { renderGame } = await import('../src/game');
    renderGame(container, makeGameState({ activePlayerIndex: 1 }));

    const turn = container.querySelector('[data-testid="turn-indicator"]');
    expect(turn).toBeTruthy();
    expect(turn!.textContent).toBe("Opponent's turn");
  });

  it('shows pass button during attack phase on my turn (data-testid="combat-pass-btn")', async () => {
    const { renderGame } = await import('../src/game');
    renderGame(container, makeGameState({ phase: 'AttackPhase', activePlayerIndex: 0 }));

    const passBtn = container.querySelector('[data-testid="combat-pass-btn"]');
    expect(passBtn).toBeTruthy();
    expect(passBtn!.textContent).toBe('Pass');
  });

  it('renders both battlefields (.battlefield count = 2)', async () => {
    const { renderGame } = await import('../src/game');
    renderGame(container, makeGameState());

    const battlefields = container.querySelectorAll('.battlefield');
    expect(battlefields.length).toBe(2);
  });

  it('returns early if no gameState (container stays empty)', async () => {
    const { renderGame } = await import('../src/game');
    const state = makeGameState();
    state.gameState = null;
    renderGame(container, state);

    expect(container.children.length).toBe(0);
  });

  it('confirms lethal pass during AttackPhase (data-testid="combat-pass-btn")', async () => {
    const { renderGame } = await import('../src/game');
    const state = makeGameState({
      phase: 'AttackPhase',
      activePlayerIndex: 0,
      consecutivePasses: [2, 0],
    });
    renderGame(container, state);

    const passBtn = container.querySelector('[data-testid="combat-pass-btn"]') as HTMLButtonElement;
    expect(passBtn).toBeTruthy();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    passBtn.click();

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('You will FORFEIT'));
    confirmSpy.mockRestore();
  });
});
