import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { GameState, Action, TransactionLogEntry } from '@phalanxduel/shared';
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
      rows: 2,
      columns: 4,
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

    const layout = container.querySelector('[data-testid="game-layout"]');
    expect(layout).toBeTruthy();
    expect(layout?.getAttribute('data-phase')).toBe('AttackPhase');
    expect(layout?.getAttribute('data-phase-tone')).toBe('attack');

    const phase = container.querySelector('[data-testid="phase-indicator"]');
    expect(phase).toBeTruthy();
    expect(phase?.getAttribute('data-phase')).toBe('AttackPhase');
    expect(phase?.getAttribute('data-phase-tone')).toBe('attack');

    const turnCount = container.querySelector('.phx-match-meta');
    expect(turnCount).toBeTruthy();
    expect(turnCount!.textContent).toContain('T3');
  });

  it('shows "Your turn" when active player (data-testid="turn-indicator")', async () => {
    const { renderGame } = await import('../src/game');
    renderGame(container, makeGameState({ activePlayerIndex: 0 }));

    const turn = container.querySelector('[data-testid="turn-indicator"]');
    expect(turn).toBeTruthy();
    expect(turn!.textContent).toBe('YOUR_TURN');
  });

  it('shows "Opponent\'s turn" when not active', async () => {
    const { renderGame } = await import('../src/game');
    renderGame(container, makeGameState({ activePlayerIndex: 1 }));

    const turn = container.querySelector('[data-testid="turn-indicator"]');
    expect(turn).toBeTruthy();
    expect(turn!.textContent).toBe('OPPONENT_THINKING...');
  });

  it('renders spectator status and play-by-play context', async () => {
    const { renderGame } = await import('../src/game');
    const state = makeGameState({ activePlayerIndex: 1 });
    state.isSpectator = true;
    state.playerIndex = null;
    state.spectatorCount = 2;
    state.gameState!.transactionLog = [
      {
        sequenceNumber: 1,
        action: { type: 'pass', playerIndex: 1, timestamp: '' },
        stateHashBefore: 'before',
        stateHashAfter: 'after',
        timestamp: '',
        details: { type: 'pass' },
      } as TransactionLogEntry,
    ];

    renderGame(container, state);

    const layout = container.querySelector('[data-testid="game-layout"]');
    expect(layout?.getAttribute('data-match-id')).toBe('match-1');
    expect(layout?.getAttribute('data-spectator')).toBe('true');
    expect(container.querySelector('[data-testid="spectator-banner"]')?.textContent).toBe(
      'SPECTATOR_STREAM',
    );
    expect(container.querySelector('[data-testid="turn-indicator"]')?.textContent).toBe(
      'LIVE: Bob',
    );
    expect(container.querySelector('[data-testid="spectator-count"]')?.textContent).toContain(
      '2 watching',
    );
    expect(container.querySelector('[data-testid="spectator-live-panel"]')?.textContent).toContain(
      'ACTIVE',
    );
    expect(container.textContent).toContain('PLAY_BY_PLAY');
    expect(container.textContent).toContain('Bob passed');
  });

  it('shows pass button during attack phase on my turn (data-testid="combat-pass-btn")', async () => {
    const { renderGame } = await import('../src/game');
    renderGame(container, makeGameState({ phase: 'AttackPhase', activePlayerIndex: 0 }));

    const passBtn = container.querySelector('.btn-primary');
    expect(passBtn).toBeTruthy();
    expect(passBtn!.textContent).toBe('PASS');
  });

  it('renders both battlefields (.battlefield count = 2)', async () => {
    const { renderGame } = await import('../src/game');
    renderGame(container, makeGameState());

    const battlefields = container.querySelectorAll('.phx-battlefield');
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

    const passBtn = container.querySelector('.btn-primary') as HTMLButtonElement;
    expect(passBtn).toBeTruthy();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    passBtn.click();

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('Confirm PASS?'));
    confirmSpy.mockRestore();
  });

  it('sets .status-my-turn when activePlayerIndex matches playerIndex', async () => {
    const { renderGame } = await import('../src/game');
    renderGame(container, makeGameState({ activePlayerIndex: 0 }));

    const turnEl = container.querySelector('[data-testid="turn-indicator"]');
    expect(turnEl?.classList.contains('status-my-turn')).toBe(true);
    expect(turnEl?.classList.contains('status-opp-turn')).toBe(false);
  });

  it('omits .status-my-turn when it is the opponent turn', async () => {
    const { renderGame } = await import('../src/game');
    renderGame(container, makeGameState({ activePlayerIndex: 1 }));

    const turnEl = container.querySelector('[data-testid="turn-indicator"]');
    expect(turnEl?.classList.contains('status-my-turn')).toBe(false);
    expect(turnEl?.classList.contains('status-opp-turn')).toBe(true);
  });

  it('phase indicator text is "COMBAT" for AttackPhase', async () => {
    const { renderGame } = await import('../src/game');
    renderGame(container, makeGameState({ phase: 'AttackPhase' }));

    const phase = container.querySelector('[data-testid="phase-indicator"]');
    expect(phase?.textContent).toBe('COMBAT');
  });

  it('phase indicator text is "DEPLOYMENT" for DeploymentPhase', async () => {
    const { renderGame } = await import('../src/game');
    renderGame(container, makeGameState({ phase: 'DeploymentPhase' }));

    const phase = container.querySelector('[data-testid="phase-indicator"]');
    expect(phase?.textContent).toBe('DEPLOYMENT');
  });

  it('sets data-qa-attackable="true" and attack-playable on front-row cell when attack action valid', async () => {
    const { renderGame } = await import('../src/game');
    const state = makeGameState({ phase: 'AttackPhase', activePlayerIndex: 0 });

    state.gameState!.players[0]!.battlefield = [
      {
        card: { id: 'atk', face: '5', suit: 'spades', value: 5, type: 'number' },
        position: { row: 0, col: 0 },
        currentHp: 5,
        faceDown: false,
      },
      ...Array(7).fill(null),
    ];
    state.validActions = [
      {
        type: 'attack',
        playerIndex: 0,
        attackingColumn: 0,
        defendingColumn: 0,
        timestamp: '',
      } as Action,
      { type: 'pass', playerIndex: 0, timestamp: '' } as Action,
    ];

    renderGame(container, state);

    const cell = container.querySelector('[data-testid="player-cell-r0-c0"]');
    expect(cell?.getAttribute('data-qa-attackable')).toBe('true');
    expect(cell?.classList.contains('attack-playable')).toBe(true);
    expect(cell?.classList.contains('bf-cell')).toBe(true);
  });

  it('does not set data-qa-attackable on front-row cell without attack valid action', async () => {
    const { renderGame } = await import('../src/game');
    const state = makeGameState({ phase: 'AttackPhase', activePlayerIndex: 0 });

    state.gameState!.players[0]!.battlefield = [
      {
        card: { id: 'noatk', face: '3', suit: 'hearts', value: 3, type: 'number' },
        position: { row: 0, col: 0 },
        currentHp: 3,
        faceDown: false,
      },
      ...Array(7).fill(null),
    ];
    state.validActions = [{ type: 'pass', playerIndex: 0, timestamp: '' } as Action];

    renderGame(container, state);

    const cell = container.querySelector('[data-testid="player-cell-r0-c0"]');
    expect(cell?.getAttribute('data-qa-attackable')).toBeNull();
    expect(cell?.classList.contains('attack-playable')).toBe(false);
  });

  it('opponent cells get valid-target and bf-cell when selected attacker has matching attack action', async () => {
    const { renderGame } = await import('../src/game');
    const state = makeGameState({ phase: 'AttackPhase', activePlayerIndex: 0 });

    state.selectedAttacker = { row: 0, col: 0 };
    state.validActions = [
      {
        type: 'attack',
        playerIndex: 0,
        attackingColumn: 0,
        defendingColumn: 1,
        timestamp: '',
      } as Action,
      { type: 'pass', playerIndex: 0, timestamp: '' } as Action,
    ];
    state.gameState!.players[0]!.battlefield = [
      {
        card: { id: 'atk', face: '5', suit: 'spades', value: 5, type: 'number' },
        position: { row: 0, col: 0 },
        currentHp: 5,
        faceDown: false,
      },
      ...Array(7).fill(null),
    ];

    renderGame(container, state);

    const target = container.querySelector('[data-testid="opponent-cell-r0-c1"]');
    expect(target?.classList.contains('valid-target')).toBe(true);
    expect(target?.classList.contains('bf-cell')).toBe(true);
  });

  it('hand cards get playable class when deploy action exists for that card', async () => {
    const { renderGame } = await import('../src/game');
    const state = makeGameState({ phase: 'DeploymentPhase', activePlayerIndex: 0 });

    const card = { id: 'hand1', face: '4', suit: 'clubs', value: 4, type: 'number' };
    state.gameState!.players[0]!.hand = [card];
    state.validActions = [
      { type: 'deploy', playerIndex: 0, cardId: 'hand1', column: 0, timestamp: '' } as Action,
      { type: 'pass', playerIndex: 0, timestamp: '' } as Action,
    ];

    renderGame(container, state);

    const handCard = container.querySelector('[data-testid="hand-card-0"]');
    expect(handCard?.classList.contains('hand-card')).toBe(true);
    expect(handCard?.classList.contains('playable')).toBe(true);
  });

  it('player cell gets valid-target + bf-cell when selectedDeployCard matches a deploy action', async () => {
    const { renderGame } = await import('../src/game');
    const state = makeGameState({ phase: 'DeploymentPhase', activePlayerIndex: 0 });

    const card = { id: 'hand1', face: '4', suit: 'clubs', value: 4, type: 'number' };
    state.gameState!.players[0]!.hand = [card];
    state.selectedDeployCard = 'hand1';
    state.validActions = [
      { type: 'deploy', playerIndex: 0, cardId: 'hand1', column: 0, timestamp: '' } as Action,
      { type: 'pass', playerIndex: 0, timestamp: '' } as Action,
    ];

    renderGame(container, state);

    const target = container.querySelector('[data-testid="player-cell-r0-c0"]');
    expect(target?.classList.contains('bf-cell')).toBe(true);
    expect(target?.classList.contains('valid-target')).toBe(true);
  });

  it('hand cards get reinforce-playable class during reinforcement', async () => {
    const { renderGame } = await import('../src/game');
    const state = makeGameState({ phase: 'ReinforcementPhase', activePlayerIndex: 0 });

    const card = { id: 'rcard', face: '2', suit: 'diamonds', value: 2, type: 'number' };
    state.gameState!.players[0]!.hand = [card];
    state.gameState!.reinforcement = { column: 2 } as GameState['reinforcement'];
    state.validActions = [
      { type: 'reinforce', playerIndex: 0, cardId: 'rcard', timestamp: '' } as Action,
      { type: 'pass', playerIndex: 0, timestamp: '' } as Action,
    ];

    renderGame(container, state);

    const handCard = container.querySelector('[data-testid="hand-card-0"]');
    expect(handCard?.classList.contains('reinforce-playable')).toBe(true);
  });

  it('reinforce column cells get is-reinforce-col and reinforce-col during ReinforcementPhase', async () => {
    const { renderGame } = await import('../src/game');
    const state = makeGameState({ phase: 'ReinforcementPhase', activePlayerIndex: 0 });

    state.gameState!.reinforcement = { column: 1 } as GameState['reinforcement'];
    state.validActions = [{ type: 'pass', playerIndex: 0, timestamp: '' } as Action];

    renderGame(container, state);

    const col1r0 = container.querySelector('[data-testid="player-cell-r0-c1"]');
    const col1r1 = container.querySelector('[data-testid="player-cell-r1-c1"]');
    expect(col1r0?.classList.contains('is-reinforce-col')).toBe(true);
    expect(col1r0?.classList.contains('reinforce-col')).toBe(true);
    expect(col1r1?.classList.contains('is-reinforce-col')).toBe(true);
    const col0r0 = container.querySelector('[data-testid="player-cell-r0-c0"]');
    expect(col0r0?.classList.contains('is-reinforce-col')).toBe(false);
  });

  it('combat-skip-reinforce-btn visible during ReinforcementPhase with no reinforce actions', async () => {
    const { renderGame } = await import('../src/game');
    const state = makeGameState({ phase: 'ReinforcementPhase', activePlayerIndex: 0 });

    state.gameState!.reinforcement = { column: 0 } as GameState['reinforcement'];
    state.validActions = [
      { type: 'pass', playerIndex: 0, timestamp: '' } as Action,
      { type: 'forfeit', playerIndex: 0, timestamp: '' } as Action,
    ];

    renderGame(container, state);

    const skip = container.querySelector('[data-testid="combat-skip-reinforce-btn"]');
    expect(skip).toBeTruthy();
    expect(skip?.textContent).toBe('SKIP');
  });

  it('combat-forfeit-btn visible when forfeit is in validActions', async () => {
    const { renderGame } = await import('../src/game');
    const state = makeGameState({ phase: 'AttackPhase', activePlayerIndex: 0 });
    state.validActions = [
      { type: 'pass', playerIndex: 0, timestamp: '' } as Action,
      { type: 'forfeit', playerIndex: 0, timestamp: '' } as Action,
    ];

    renderGame(container, state);

    const forfeit = container.querySelector('[data-testid="combat-forfeit-btn"]');
    expect(forfeit).toBeTruthy();
    expect(forfeit?.textContent).toBe('FORFEIT');
  });

  it('shows action preview and combat feedback for a new attack', async () => {
    const { renderGame } = await import('../src/game');
    const state = makeGameState({ phase: 'AttackPhase', activePlayerIndex: 0 });

    state.selectedAttacker = { row: 0, col: 0 };
    state.validActions = [
      {
        type: 'attack',
        playerIndex: 0,
        attackingColumn: 0,
        defendingColumn: 0,
        timestamp: '',
      } as Action,
    ];
    state.gameState!.players[0]!.battlefield = [
      {
        card: { id: 'atk', face: '7', suit: 'spades', value: 7, type: 'number' },
        position: { row: 0, col: 0 },
        currentHp: 7,
        faceDown: false,
      },
      ...Array(7).fill(null),
    ];
    state.gameState!.players[1]!.battlefield = [
      {
        card: { id: 'def', face: '3', suit: 'hearts', value: 3, type: 'number' },
        position: { row: 0, col: 0 },
        currentHp: 3,
        faceDown: false,
      },
      null,
      null,
      null,
      {
        card: { id: 'back', face: '4', suit: 'clubs', value: 4, type: 'number' },
        position: { row: 1, col: 0 },
        currentHp: 4,
        faceDown: false,
      },
      null,
      null,
      null,
    ];

    renderGame(container, state);

    const previewCell = container.querySelector('[data-testid="opponent-cell-r0-c0"]');
    expect(previewCell?.getAttribute('data-action-preview')).toBe('WINNING_EXCHANGE');
    expect(container.querySelector('.phx-action-preview-chip')?.textContent).toBe(
      'WINNING_EXCHANGE',
    );

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
            turnNumber: 3,
            attackerPlayerIndex: 0,
            attackerCard: { id: 'atk', face: '7', suit: 'spades', value: 7, type: 'number' },
            targetColumn: 0,
            baseDamage: 7,
            totalLpDamage: 3,
            steps: [{ target: 'playerLp', damage: 3, lpBefore: 20, lpAfter: 17 }],
          },
          reinforcementTriggered: false,
          victoryTriggered: false,
        },
      } as TransactionLogEntry,
    ];

    renderGame(container, state);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(container.querySelector('[data-testid="combat-feedback-banner"]')?.textContent).toBe(
      'LP_DAMAGE',
    );
  });
});
