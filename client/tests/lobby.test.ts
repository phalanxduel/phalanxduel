import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'preact/test-utils';
import { setConnection } from '../src/renderer';
import { setPlayerName } from '../src/state';

vi.mock('../src/state', () => ({
  getState: vi.fn(() => ({
    playerName: '',
    damageMode: 'cumulative',
    startingLifepoints: 20,
    showHelp: false,
    serverHealth: null,
  })),
  setPlayerName: vi.fn(),
  rememberSession: vi.fn(),
  forgetSession: vi.fn(),
  setScreen: vi.fn(),
  setProfileId: vi.fn(),
  setDamageMode: vi.fn(),
  setStartingLifepoints: vi.fn(),
  setThemePhx: vi.fn(),
  startActionTimeout: vi.fn(),
  resetToLobby: vi.fn(),
}));

import type { AppState } from '../src/state';

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    connectionState: 'OPEN',
    screen: 'lobby',
    matchId: null,
    playerId: null,
    playerIndex: null,
    playerName: null,
    user: null,
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
    validActions: [],
    isMobile: false,
    themePhx: true,
    ...overrides,
  };
}

async function waitForLobbyEffects(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });
  }
}

vi.mock('../src/debug', () => ({
  renderDebugButton: vi.fn(),
}));

vi.mock('../src/match-history', () => ({
  renderMatchHistory: vi.fn(),
}));

describe('lobby module', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    window.history.replaceState({}, '', '/');
    vi.clearAllMocks();
    setConnection(null as unknown as import('../src/connection').Connection);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url === '/api/matches/active') {
          return {
            ok: true,
            json: async () => [],
          } as Response;
        }
        if (url === '/api/spectator/matches?status=all') {
          return {
            ok: true,
            json: async () => [
              {
                matchId: '33333333-3333-3333-3333-333333333333',
                status: 'active',
                phase: 'AttackPhase',
                turnNumber: 5,
                player1Name: 'Alice',
                player2Name: 'Bob',
                spectatorCount: 2,
                createdAt: '2026-04-30T15:00:00.000Z',
                updatedAt: '2026-04-30T15:05:00.000Z',
              },
              {
                matchId: '44444444-4444-4444-4444-444444444444',
                status: 'waiting',
                phase: null,
                turnNumber: null,
                player1Name: 'Cora',
                player2Name: null,
                spectatorCount: 0,
                createdAt: '2026-04-30T15:01:00.000Z',
                updatedAt: '2026-04-30T15:01:00.000Z',
              },
            ],
          } as Response;
        }
        if (url.startsWith('/api/ladder/')) {
          return {
            ok: true,
            json: async () => ({ rankings: [] }),
          } as Response;
        }
        if (url === '/matches/completed') {
          return {
            ok: true,
            json: async () => [],
          } as Response;
        }
        return {
          ok: true,
          json: async () => ({}),
        } as Response;
      }),
    );
  });

  afterEach(() => {
    setConnection(null as unknown as import('../src/connection').Connection);
  });

  describe('renderLobby', () => {
    it('renders lobby wrapper with title "Phalanx Duel"', async () => {
      const { renderLobby } = await import('../src/lobby');
      renderLobby(container, makeState());

      const title = container.querySelector('.title');
      expect(title).toBeTruthy();
      expect(title!.textContent).toBe('PHALANX DUEL');
    });

    it('renders name input with data-testid="lobby-name-input"', async () => {
      const { renderLobby } = await import('../src/lobby');
      renderLobby(container, makeState());

      const input = container.querySelector('[data-testid="lobby-name-input"]');
      expect(input).toBeTruthy();
      expect(input!.tagName).toBe('INPUT');
    });

    it('renders Private Match button with data-testid="lobby-create-btn"', async () => {
      const { renderLobby } = await import('../src/lobby');
      renderLobby(container, makeState());

      const btn = container.querySelector('[data-testid="lobby-create-btn"]');
      expect(btn).toBeTruthy();
      expect(btn!.textContent).toBe('PRIVATE_MATCH');
    });

    it('renders Quick Match button with data-testid="lobby-quick-match-btn"', async () => {
      const { renderLobby } = await import('../src/lobby');
      renderLobby(container, makeState());

      const btn = container.querySelector('[data-testid="lobby-quick-match-btn"]');
      expect(btn).toBeTruthy();
      expect(btn!.textContent).toBe('QUICK_START');
    });

    it('renders Join Match button with data-testid="lobby-join-btn"', async () => {
      const { renderLobby } = await import('../src/lobby');
      renderLobby(container, makeState());

      const btn = container.querySelector('[data-testid="lobby-join-btn"]');
      expect(btn).toBeTruthy();
      expect(btn!.textContent).toBe('JOIN');
    });

    it('renders "MATCH_HISTORY" button', async () => {
      const { renderLobby } = await import('../src/lobby');
      renderLobby(container, makeState());
      const btn = container.querySelector('.phx-match-history-btn');
      expect(btn).toBeTruthy();
      expect(btn!.textContent).toContain('MATCH_HISTORY');
    });

    it('Past Games panel is hidden on initial render', async () => {
      const { renderLobby } = await import('../src/lobby');
      renderLobby(container, makeState());
      const panel = container.querySelector('.phx-history-list');
      expect(panel).toBeTruthy();
      expect(panel!.classList.contains('is-open')).toBe(false);
    });

    it('clicking Match History button opens the panel', async () => {
      const { renderLobby } = await import('../src/lobby');
      renderLobby(container, makeState());
      const btn = container.querySelector('.phx-match-history-btn')!;
      (btn as HTMLElement).click();

      // Wait for re-render
      await Promise.resolve();

      const panel = container.querySelector('.phx-history-list');
      expect(panel).toBeTruthy();
      expect(panel!.classList.contains('is-open')).toBe(true);
    });

    it('quick match seeds a default name and creates a bot-random match', async () => {
      const send = vi.fn();
      setConnection({ send } as never);

      const { renderLobby } = await import('../src/lobby');
      renderLobby(container, makeState({ playerName: '' }));

      const btn = container.querySelector(
        '[data-testid="lobby-quick-match-btn"]',
      ) as HTMLButtonElement;
      btn.click();

      expect(setPlayerName).toHaveBeenCalledWith('OPERATIVE');
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'createMatch',
          playerName: 'OPERATIVE',
          opponent: 'bot-random',
        }),
      );
    });

    it('past games panel is conditional based on isOpen', async () => {
      const { renderLobby } = await import('../src/lobby');
      renderLobby(container, makeState());
      const btn = container.querySelector('.phx-match-history-btn')!;

      (btn as HTMLElement).click(); // first open
      await Promise.resolve();
      const panel = container.querySelector('.phx-history-list');
      expect(panel).toBeTruthy();
    });

    it('renders active match recovery panel for authenticated users', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock.mockImplementation(async (input: string | URL | Request) => {
        const url = String(input);
        if (url === '/api/matches/active') {
          return {
            ok: true,
            json: async () => [
              {
                matchId: '11111111-1111-1111-1111-111111111111',
                playerId: '22222222-2222-2222-2222-222222222222',
                playerIndex: 0,
                role: 'P0',
                opponentName: 'Bot (Heuristic)',
                botStrategy: 'heuristic',
                status: 'active',
                phase: 'AttackPhase',
                turnNumber: 3,
                disconnected: false,
                createdAt: '2026-04-22T00:00:00.000Z',
                updatedAt: '2026-04-22T00:00:00.000Z',
              },
            ],
          } as Response;
        }
        if (url.startsWith('/api/ladder/')) {
          return {
            ok: true,
            json: async () => ({ rankings: [] }),
          } as Response;
        }
        if (url === '/matches/completed') {
          return {
            ok: true,
            json: async () => [],
          } as Response;
        }
        return {
          ok: true,
          json: async () => ({}),
        } as Response;
      });

      const { renderLobby } = await import('../src/lobby');
      renderLobby(
        container,
        makeState({
          user: {
            id: 'user-1',
            gamertag: 'Alice',
            suffix: 1,
            email: 'alice@example.com',
            elo: 1000,
          },
        }),
      );

      await Promise.resolve();
      await waitForLobbyEffects();

      expect(container.querySelector('[data-testid="active-match-panel"]')).toBeTruthy();
    });

    it('renders main lobby navigation to the spectator lobby', async () => {
      const { renderLobby } = await import('../src/lobby');
      renderLobby(container, makeState());

      const link = container.querySelector('[data-testid="lobby-spectator-lobby-btn"]');
      expect(link).toBeTruthy();
      expect(link!.textContent).toBe('SPECTATOR_LOBBY');
    });

    it('renders spectator lobby rows and filters waiting/active matches', async () => {
      const { renderLobby } = await import('../src/lobby');
      await act(async () => {
        renderLobby(container, makeState({ screen: 'spectator_lobby' }));
      });

      await Promise.resolve();
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

      expect(container.querySelector('.title')!.textContent).toBe('SPECTATOR_LOBBY');
      expect(container.textContent).toContain('Alice vs Bob');
      expect(container.textContent).toContain('AttackPhase · TURN 5');
      expect(container.textContent).toContain('2 WATCHING');
      expect(container.textContent).toContain('Cora vs Waiting for opponent');
      expect(container.textContent).toContain('Will open when both players join');
      expect(container.querySelectorAll('[data-testid="spectator-lobby-watch-btn"]')).toHaveLength(
        1,
      );

      (
        container.querySelector('[data-testid="spectator-lobby-filter-waiting"]') as HTMLElement
      ).click();
      await Promise.resolve();
      expect(container.textContent).not.toContain('Alice vs Bob');
      expect(container.textContent).toContain('Cora vs Waiting for opponent');

      (
        container.querySelector('[data-testid="spectator-lobby-filter-active"]') as HTMLElement
      ).click();
      await Promise.resolve();
      expect(container.textContent).toContain('Alice vs Bob');
      expect(container.textContent).not.toContain('Cora vs Waiting for opponent');
    });

    it('sends watchMatch when an active spectator lobby row is watched', async () => {
      const send = vi.fn();
      setConnection({ send } as never);

      const { renderLobby } = await import('../src/lobby');
      await act(async () => {
        renderLobby(container, makeState({ screen: 'spectator_lobby' }));
      });

      await waitForLobbyEffects();

      const watchButton = container.querySelector(
        '[data-testid="spectator-lobby-watch-btn"]',
      ) as HTMLButtonElement;
      expect(watchButton).toBeTruthy();
      watchButton.click();

      expect(send).toHaveBeenCalledWith({
        type: 'watchMatch',
        matchId: '33333333-3333-3333-3333-333333333333',
      });
    });

    it('auto-refreshes spectator lobby every 15 seconds', async () => {
      vi.useFakeTimers();
      try {
        const { renderLobby } = await import('../src/lobby');
        const fetchMock = vi.mocked(fetch);
        await act(async () => {
          renderLobby(container, makeState({ screen: 'spectator_lobby' }));
        });

        await act(async () => {
          await vi.advanceTimersByTimeAsync(0);
          await vi.advanceTimersByTimeAsync(15_000);
        });

        const spectatorFetches = fetchMock.mock.calls.filter(
          ([input]) => String(input) === '/api/spectator/matches?status=all',
        );
        expect(spectatorFetches.length).toBeGreaterThanOrEqual(2);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('renderWaiting', () => {
    it('renders match ID display with data-testid="waiting-match-id" showing the matchId', async () => {
      const { renderWaiting } = await import('../src/waiting');
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
        showHelp: false,
        themePhx: true,
        connectionState: 'OPEN',
        isSpectator: false,
        spectatorCount: 0,
        validActions: [],
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
