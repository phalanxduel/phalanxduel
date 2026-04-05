import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GameState, BattlefieldCard } from '@phalanxduel/shared';
import {
  getPhaseLabel,
  getTurnIndicatorText,
  getActionButtons,
  createBattlefieldCell,
  attachCellInteraction,
  renderBattlefield,
  renderStatsBlock,
} from '../src/game';
import { getBaseStats } from '../src/game-preact';
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

function makeMinimalGs(overrides: Partial<GameState> = {}): GameState {
  return {
    players: [
      {
        player: { name: 'Alice' },
        lifepoints: 20,
        hand: [],
        drawpile: [],
        drawpileCount: 0,
        handCount: 0,
        battlefield: Array(8).fill(null),
        discardPile: [],
      },
      {
        player: { name: 'Bob' },
        lifepoints: 20,
        hand: [],
        drawpile: [],
        drawpileCount: 0,
        handCount: 0,
        battlefield: Array(8).fill(null),
        discardPile: [],
      },
    ],
    activePlayerIndex: 0,
    phase: 'AttackPhase',
    turnNumber: 1,
    ...overrides,
  } as GameState;
}

describe('getPhaseLabel', () => {
  it('returns "Deployment" for DeploymentPhase', () => {
    const gs = makeMinimalGs({ phase: 'DeploymentPhase' as GameState['phase'] });
    expect(getPhaseLabel(gs)).toBe('Deployment');
  });

  it('returns "Reinforce col N" for ReinforcementPhase', () => {
    const gs = makeMinimalGs({
      phase: 'ReinforcementPhase' as GameState['phase'],
      reinforcement: { column: 2, attackerIndex: 0 },
    });
    expect(getPhaseLabel(gs)).toBe('Reinforce col 3');
  });

  it('returns "Reinforce col 1" when reinforcement is missing', () => {
    const gs = makeMinimalGs({
      phase: 'ReinforcementPhase' as GameState['phase'],
    });
    expect(getPhaseLabel(gs)).toBe('Reinforce col 1');
  });

  it('returns "Combat" for AttackPhase', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'] });
    expect(getPhaseLabel(gs)).toBe('Combat');
  });
});

describe('getTurnIndicatorText', () => {
  it('returns player name for spectators with isMyTurn=false', () => {
    const gs = makeMinimalGs({ activePlayerIndex: 0 });
    const result = getTurnIndicatorText(gs, true, 1);
    expect(result.text).toBe("Alice's turn");
    expect(result.isMyTurn).toBe(false);
  });

  it('returns "Your turn" when active player matches myIdx', () => {
    const gs = makeMinimalGs({ activePlayerIndex: 0 });
    const result = getTurnIndicatorText(gs, false, 0);
    expect(result.text).toBe('Your turn');
    expect(result.isMyTurn).toBe(true);
  });

  it('returns "Opponent\'s turn" when not active', () => {
    const gs = makeMinimalGs({ activePlayerIndex: 1 });
    const result = getTurnIndicatorText(gs, false, 0);
    expect(result.text).toBe("Opponent's turn");
    expect(result.isMyTurn).toBe(false);
  });

  it('returns "Reinforce your column" during ReinforcementPhase when active', () => {
    const gs = makeMinimalGs({
      phase: 'ReinforcementPhase' as GameState['phase'],
      activePlayerIndex: 0,
    });
    const result = getTurnIndicatorText(gs, false, 0);
    expect(result.text).toBe('Reinforce your column');
    expect(result.isMyTurn).toBe(true);
  });

  it('returns "Opponent reinforcing" during ReinforcementPhase when not active', () => {
    const gs = makeMinimalGs({
      phase: 'ReinforcementPhase' as GameState['phase'],
      activePlayerIndex: 1,
    });
    const result = getTurnIndicatorText(gs, false, 0);
    expect(result.text).toBe('Opponent reinforcing');
    expect(result.isMyTurn).toBe(false);
  });

  it('falls back to "Player N" when player name is missing', () => {
    const gs = makeMinimalGs({ activePlayerIndex: 1 });
    // Remove the player at index 1
    gs.players[1] = undefined as never;
    const result = getTurnIndicatorText(gs, true, 0);
    expect(result.text).toBe("Player 2's turn");
    expect(result.isMyTurn).toBe(false);
  });
});

describe('getActionButtons', () => {
  it('returns pass+forfeit+help during AttackPhase on my turn (no attacker)', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'], activePlayerIndex: 0 });
    const buttons = getActionButtons({
      gs,
      isSpectator: false,
      myIdx: 0,
      selectedAttacker: null,
      showHelp: false,
    });
    const labels = buttons.map((b) => b.label);
    expect(labels).toEqual(['Pass', 'Forfeit', '? Help']);
  });

  it('includes Cancel when attacker is selected during AttackPhase', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'], activePlayerIndex: 0 });
    const buttons = getActionButtons({
      gs,
      isSpectator: false,
      myIdx: 0,
      selectedAttacker: { row: 0, col: 1 },
      showHelp: false,
    });
    const labels = buttons.map((b) => b.label);
    expect(labels).toEqual(['Cancel', 'Pass', 'Forfeit', '? Help']);
    expect(buttons[0]?.testId).toBe('combat-cancel-btn');
  });

  it('returns skip+forfeit+help during ReinforcementPhase on my turn', () => {
    const gs = makeMinimalGs({
      phase: 'ReinforcementPhase' as GameState['phase'],
      activePlayerIndex: 0,
    });
    const buttons = getActionButtons({
      gs,
      isSpectator: false,
      myIdx: 0,
      selectedAttacker: null,
      showHelp: false,
    });
    const labels = buttons.map((b) => b.label);
    expect(labels).toEqual(['Skip', 'Forfeit', '? Help']);
  });

  it('returns only help for spectators', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'], activePlayerIndex: 0 });
    const buttons = getActionButtons({
      gs,
      isSpectator: true,
      myIdx: 0,
      selectedAttacker: null,
      showHelp: false,
    });
    const labels = buttons.map((b) => b.label);
    expect(labels).toEqual(['? Help']);
  });

  it('returns only help when not my turn', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'], activePlayerIndex: 1 });
    const buttons = getActionButtons({
      gs,
      isSpectator: false,
      myIdx: 0,
      selectedAttacker: null,
      showHelp: false,
    });
    const labels = buttons.map((b) => b.label);
    expect(labels).toEqual(['? Help']);
  });

  it('help label is "Exit Help" when showHelp=true', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'], activePlayerIndex: 0 });
    const buttons = getActionButtons({
      gs,
      isSpectator: false,
      myIdx: 0,
      selectedAttacker: null,
      showHelp: true,
    });
    const helpBtn = buttons.find((b) => b.label === '× Help');
    expect(helpBtn).toBeDefined();
  });

  it('forfeit button has btn-forfeit className', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'], activePlayerIndex: 0 });
    const buttons = getActionButtons({
      gs,
      isSpectator: false,
      myIdx: 0,
      selectedAttacker: null,
      showHelp: false,
    });
    const forfeit = buttons.find((b) => b.label === 'Forfeit');
    expect(forfeit?.className).toBe('btn-forfeit');
    expect(forfeit?.testId).toBe('combat-forfeit-btn');
  });

  it('pass button has correct testId', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'], activePlayerIndex: 0 });
    const buttons = getActionButtons({
      gs,
      isSpectator: false,
      myIdx: 0,
      selectedAttacker: null,
      showHelp: false,
    });
    const pass = buttons.find((b) => b.label === 'Pass');
    expect(pass?.testId).toBe('combat-pass-btn');
  });

  it('shows Skip button during ReinforcementPhase', () => {
    const gs = makeMinimalGs({
      phase: 'ReinforcementPhase' as GameState['phase'],
      activePlayerIndex: 0,
    });
    const buttons = getActionButtons({
      gs,
      isSpectator: false,
      myIdx: 0,
      selectedAttacker: null,
      showHelp: false,
    });
    const skip = buttons.find((b) => b.label === 'Skip');
    expect(skip?.testId).toBe('combat-skip-reinforce-btn');
    expect(skip?.className).toBe('btn-skip');
  });
});

function makeBCard(overrides?: Partial<BattlefieldCard>): BattlefieldCard {
  return {
    card: { id: 'c1', suit: 'spades', face: '7', value: 7, type: 'number' },
    currentHp: 7,
    ...overrides,
  } as BattlefieldCard;
}

function makeState(overrides?: Partial<AppState>): AppState {
  return {
    screen: 'game',
    matchId: 'match-1',
    playerId: 'player-1',
    playerIndex: 0,
    playerName: 'Alice',
    gameState: null,
    selectedAttacker: null,
    selectedDeployCard: null,
    error: null,
    damageMode: 'cumulative',
    startingLifepoints: 20,
    serverHealth: null,
    isSpectator: false,
    spectatorCount: 0,
    showHelp: false,
    ...overrides,
  } as AppState;
}

describe('createBattlefieldCell', () => {
  it('creates div with class bf-cell', () => {
    const gs = makeMinimalGs();
    const cell = createBattlefieldCell(null, { row: 0, col: 0 }, false, gs);
    expect(cell.tagName).toBe('DIV');
    expect(cell.classList.contains('bf-cell')).toBe(true);
  });

  it('sets data-testid with player prefix when not opponent', () => {
    const gs = makeMinimalGs();
    const cell = createBattlefieldCell(null, { row: 1, col: 2 }, false, gs);
    expect(cell.getAttribute('data-testid')).toBe('player-cell-r1-c2');
  });

  it('sets data-testid with opponent prefix when isOpponent', () => {
    const gs = makeMinimalGs();
    const cell = createBattlefieldCell(null, { row: 0, col: 3 }, true, gs);
    expect(cell.getAttribute('data-testid')).toBe('opponent-cell-r0-c3');
  });

  it('marks empty cells with .empty class', () => {
    const gs = makeMinimalGs();
    const cell = createBattlefieldCell(null, { row: 0, col: 0 }, false, gs);
    expect(cell.classList.contains('empty')).toBe(true);
  });

  it('marks occupied cells with .occupied and suit aura', () => {
    const gs = makeMinimalGs();
    const bCard = makeBCard();
    const cell = createBattlefieldCell(bCard, { row: 0, col: 0 }, false, gs);
    expect(cell.classList.contains('occupied')).toBe(true);
    expect(cell.classList.contains('pz-aura-spades')).toBe(true);
  });

  it('adds card-rank, card-pip, card-hp, card-type children for occupied cells', () => {
    const gs = makeMinimalGs();
    const bCard = makeBCard();
    const cell = createBattlefieldCell(bCard, { row: 0, col: 0 }, false, gs);
    expect(cell.querySelector('.card-rank')).toBeTruthy();
    expect(cell.querySelector('.card-pip')).toBeTruthy();
    expect(cell.querySelector('.card-hp')).toBeTruthy();
    expect(cell.querySelector('.card-type')).toBeTruthy();
  });

  it('shows x2 multiplier tag for weapon suits during AttackPhase on own battlefield', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'] });
    const bCard = makeBCard({
      card: {
        id: 'c1',
        suit: 'spades',
        face: '7',
        value: 7,
        type: 'number',
      } as BattlefieldCard['card'],
    });
    const cell = createBattlefieldCell(bCard, { row: 0, col: 0 }, false, gs);
    const multiplier = cell.querySelector('.pz-multiplier');
    expect(multiplier).toBeTruthy();
    expect(multiplier!.textContent).toBe('x2');
  });

  it('does not show x2 multiplier for opponent battlefield', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'] });
    const bCard = makeBCard();
    const cell = createBattlefieldCell(bCard, { row: 0, col: 0 }, true, gs);
    expect(cell.querySelector('.pz-multiplier')).toBeFalsy();
  });
});

describe('attachCellInteraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds valid-target class for opponent card in selected attacker column', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'], activePlayerIndex: 0 });
    const state = makeState({ selectedAttacker: { row: 0, col: 2 }, playerIndex: 0 });
    const bCard = makeBCard();
    const cell = document.createElement('div');

    attachCellInteraction({ cell, bCard, pos: { row: 0, col: 2 }, gs, state, isOpponent: true });
    expect(cell.classList.contains('valid-target')).toBe(true);
  });

  it('adds valid-target class for empty cell during deployment when card selected', () => {
    const gs = makeMinimalGs({
      phase: 'DeploymentPhase' as GameState['phase'],
      activePlayerIndex: 0,
    });
    const state = makeState({ selectedDeployCard: 'card-1', playerIndex: 0 });
    const cell = document.createElement('div');

    attachCellInteraction({
      cell,
      bCard: null,
      pos: { row: 0, col: 1 },
      gs,
      state,
      isOpponent: false,
    });
    expect(cell.classList.contains('valid-target')).toBe(true);
  });

  it('adds selected class for currently selected attacker', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'], activePlayerIndex: 0 });
    const state = makeState({ selectedAttacker: { row: 0, col: 1 }, playerIndex: 0 });
    const bCard = makeBCard();
    const cell = document.createElement('div');

    attachCellInteraction({ cell, bCard, pos: { row: 0, col: 1 }, gs, state, isOpponent: false });
    expect(cell.classList.contains('selected')).toBe(true);
  });

  it('adds pz-active-pulse for front-row weapon during AttackPhase', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'], activePlayerIndex: 0 });
    const state = makeState({ playerIndex: 0 });
    const bCard = makeBCard(); // spades = weapon
    const cell = document.createElement('div');

    attachCellInteraction({ cell, bCard, pos: { row: 0, col: 0 }, gs, state, isOpponent: false });
    expect(cell.classList.contains('pz-active-pulse')).toBe(true);
  });

  it('adds valid-target for ghost targeting on empty opponent cell', () => {
    const gs = makeMinimalGs({ phase: 'AttackPhase' as GameState['phase'], activePlayerIndex: 0 });
    const state = makeState({ selectedAttacker: { row: 0, col: 2 }, playerIndex: 0 });
    const cell = document.createElement('div');

    attachCellInteraction({
      cell,
      bCard: null,
      pos: { row: 0, col: 2 },
      gs,
      state,
      isOpponent: true,
    });
    expect(cell.classList.contains('valid-target')).toBe(true);
  });
});

describe('renderBattlefield dynamic grid', () => {
  const state = {
    screen: 'game',
    matchId: 'test',
    playerIndex: 0,
    selectedAttacker: null,
    selectedDeployCard: null,
    showHelp: false,
    serverHealth: null,
  } as AppState;

  it('renders 8 cells for default 2x4 grid', () => {
    const gs = makeMinimalGs();
    const grid = renderBattlefield(gs, 0, state, false);
    const cells = grid.querySelectorAll('.bf-cell');
    expect(cells.length).toBe(8);
  });

  function makeGridGs(rows: number, columns: number): GameState {
    const base = makeMinimalGs({
      params: {
        rows,
        columns,
        maxHandSize: columns,
        initialDraw: rows * columns + columns,
      } as GameState['params'],
    });
    const bf = Array(rows * columns).fill(null);
    base.players[0]!.battlefield = bf as (typeof base.players)[0]['battlefield'];
    base.players[1]!.battlefield = [...bf] as (typeof base.players)[1]['battlefield'];
    return base;
  }

  it('renders 9 cells for 3x3 grid', () => {
    const gs = makeGridGs(3, 3);
    const grid = renderBattlefield(gs, 0, state, false);
    const cells = grid.querySelectorAll('.bf-cell');
    expect(cells.length).toBe(9);
  });

  it('renders 4 cells for 1x4 single-row grid', () => {
    const gs = makeGridGs(1, 4);
    const grid = renderBattlefield(gs, 0, state, false);
    const cells = grid.querySelectorAll('.bf-cell');
    expect(cells.length).toBe(4);
  });

  it('sets gridTemplateColumns based on params', () => {
    const gs = makeGridGs(2, 6);
    const grid = renderBattlefield(gs, 0, state, false);
    expect(grid.style.gridTemplateColumns).toBe('repeat(6, 1fr)');
  });
});

describe('getBaseStats', () => {
  it('returns base stats for a player', () => {
    const gs = makeMinimalGs();
    const stats = getBaseStats(gs, 0);
    const labels = stats.map((s) => s.label);
    expect(labels).toContain('LP');
    expect(labels).toContain('Hand');
    expect(labels).toContain('Deck');
    expect(labels).toContain('GY');
    expect(labels).not.toContain('Pass');
  });

  it('includes Pass counts when non-zero', () => {
    const gs = makeMinimalGs({
      passState: {
        consecutivePasses: [1, 0],
        totalPasses: [2, 0],
      },
    });
    const stats = getBaseStats(gs, 0);
    const pass = stats.find((s) => s.label === 'Pass');
    expect(pass?.value).toBe('1/2');
  });

  it('formats pass values correctly for player index 1', () => {
    const gs = makeMinimalGs({
      passState: {
        consecutivePasses: [0, 2],
        totalPasses: [0, 4],
      },
    });
    const stats = getBaseStats(gs, 1);
    const pass = stats.find((s) => s.label === 'Pass');
    expect(pass?.value).toBe('2/4');
  });
});

describe('renderStatsBlock', () => {
  it('renders pass counts when non-zero', () => {
    const gs = makeMinimalGs({
      passState: {
        consecutivePasses: [1, 0],
        totalPasses: [2, 0],
      },
    });
    const block = renderStatsBlock(gs, 0, true);
    const passRow = Array.from(block.querySelectorAll('.stats-row')).find(
      (r) => r.querySelector('.stats-label')?.textContent === 'Pass',
    );
    expect(passRow).toBeTruthy();
    expect(passRow?.querySelector('.stats-value')?.textContent).toBe('1/2');
  });

  it('shows FORFEIT RISK badge at threshold for current player', () => {
    const gs = makeMinimalGs({
      passState: {
        consecutivePasses: [2, 0],
        totalPasses: [4, 0],
      },
    });
    const block = renderStatsBlock(gs, 0, true);
    const badge = block.querySelector('.pass-warning-badge');
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toBe('FORFEIT RISK');
  });

  it('does not show warning badge for opponent', () => {
    const gs = makeMinimalGs({
      passState: {
        consecutivePasses: [0, 2],
        totalPasses: [0, 4],
      },
    });
    const block = renderStatsBlock(gs, 1, false);
    const badge = block.querySelector('.pass-warning-badge');
    expect(badge).toBeNull();
  });
});
