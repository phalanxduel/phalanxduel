import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/state', () => ({
  getState: vi.fn(() => ({
    playerName: '',
    damageMode: 'cumulative',
    startingLifepoints: 20,
    showHelp: false,
    serverHealth: null,
  })),
  setPlayerName: vi.fn(),
  setDamageMode: vi.fn(),
  setStartingLifepoints: vi.fn(),
  resetToLobby: vi.fn(),
}));

vi.mock('../src/debug', () => ({
  renderDebugButton: vi.fn(),
}));

vi.mock('../src/match-history', () => ({
  renderMatchHistory: vi.fn(),
}));

vi.mock('../src/renderer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/renderer')>();
  return {
    ...actual,
    getConnection: vi.fn(() => null),
  };
});

describe('lobby module', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    window.history.replaceState({}, '', '/');
    vi.clearAllMocks();
  });

  describe('renderLobby', () => {
    it('renders lobby wrapper with title "Phalanx Duel"', async () => {
      const { renderLobby } = await import('../src/lobby');
      renderLobby(container);

      const title = container.querySelector('.title');
      expect(title).toBeTruthy();
      expect(title!.textContent).toBe('Phalanx Duel');
    });

    it('renders name input with data-testid="lobby-name-input"', async () => {
      const { renderLobby } = await import('../src/lobby');
      renderLobby(container);

      const input = container.querySelector('[data-testid="lobby-name-input"]');
      expect(input).toBeTruthy();
      expect(input!.tagName).toBe('INPUT');
    });

    it('renders Create Match button with data-testid="lobby-create-btn"', async () => {
      const { renderLobby } = await import('../src/lobby');
      renderLobby(container);

      const btn = container.querySelector('[data-testid="lobby-create-btn"]');
      expect(btn).toBeTruthy();
      expect(btn!.textContent).toBe('Create Match');
    });

    it('renders Join Match button with data-testid="lobby-join-btn"', async () => {
      const { renderLobby } = await import('../src/lobby');
      renderLobby(container);

      const btn = container.querySelector('[data-testid="lobby-join-btn"]');
      expect(btn).toBeTruthy();
      expect(btn!.textContent).toBe('Join Match');
    });

    it('renders "Past Games" button with data-testid="past-games-btn"', async () => {
      const { renderLobby } = await import('../src/lobby');
      renderLobby(container);
      const btn = container.querySelector('[data-testid="past-games-btn"]');
      expect(btn).toBeTruthy();
      expect(btn!.textContent).toBe('Past Games \u25bc');
    });

    it('Past Games panel is hidden on initial render', async () => {
      const { renderLobby } = await import('../src/lobby');
      renderLobby(container);
      const panel = container.querySelector('.match-history-panel');
      expect(panel).toBeTruthy();
      expect(panel!.classList.contains('is-open')).toBe(false);
    });

    it('clicking Past Games button opens the panel', async () => {
      const { renderLobby } = await import('../src/lobby');
      renderLobby(container);
      const btn = container.querySelector('[data-testid="past-games-btn"]')!;
      btn.click();
      const panel = container.querySelector('.match-history-panel');
      expect(panel!.classList.contains('is-open')).toBe(true);
    });

    it('renderMatchHistory is called once on first open, not on subsequent opens', async () => {
      const { renderMatchHistory } = await import('../src/match-history');
      const { renderLobby } = await import('../src/lobby');
      renderLobby(container);
      const btn = container.querySelector('[data-testid="past-games-btn"]')!;

      btn.click(); // first open
      expect(vi.mocked(renderMatchHistory)).toHaveBeenCalledTimes(1);

      btn.click(); // close
      btn.click(); // second open
      expect(vi.mocked(renderMatchHistory)).toHaveBeenCalledTimes(1); // still 1
    });
  });

  describe('renderWaiting', () => {
    it('renders match ID display with data-testid="waiting-match-id" showing the matchId', async () => {
      const { renderWaiting } = await import('../src/lobby');
      const state = {
        screen: 'waiting' as const,
        matchId: 'abc-123',
        playerId: 'p1',
        playerIndex: 0,
        playerName: 'TestPlayer',
        user: null,
        gameState: null,
        selectedAttacker: null,
        selectedDeployCard: null,
        error: null,
        damageMode: 'cumulative' as const,
        startingLifepoints: 20,
        serverHealth: null,
        isSpectator: false,
        spectatorCount: 0,
        showHelp: false,
      };
      renderWaiting(container, state);

      const matchIdEl = container.querySelector('[data-testid="waiting-match-id"]');
      expect(matchIdEl).toBeTruthy();
      expect(matchIdEl!.textContent).toBe('abc-123');
    });
  });

  describe('validatePlayerName', () => {
    it('rejects empty/short names (returns truthy error)', async () => {
      const { validatePlayerName } = await import('../src/lobby');
      expect(validatePlayerName('')).toBeTruthy();
      expect(validatePlayerName('A')).toBeTruthy();
    });

    it('accepts valid names (returns null)', async () => {
      const { validatePlayerName } = await import('../src/lobby');
      expect(validatePlayerName('Warrior')).toBeNull();
      expect(validatePlayerName('Player1')).toBeNull();
    });

    it('rejects symbol-only names', async () => {
      const { validatePlayerName } = await import('../src/lobby');
      expect(validatePlayerName('!!!')).toBeTruthy();
      expect(validatePlayerName('...')).toBeTruthy();
      expect(validatePlayerName('___')).toBeTruthy();
    });
  });
});
