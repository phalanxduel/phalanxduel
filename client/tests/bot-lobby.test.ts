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
    ...overrides,
  };
}

vi.mock('../src/debug', () => ({
  renderDebugButton: vi.fn(),
}));

vi.mock('../src/renderer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/renderer')>();
  return {
    ...actual,
    getConnection: vi.fn(() => null),
  };
});

describe('bot lobby option', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.textContent = '';
    document.body.appendChild(container);
    window.history.replaceState({}, '', '/');
  });

  it('renders "Play vs Bot" button', async () => {
    const { renderLobby } = await import('../src/lobby');
    renderLobby(container, makeState());
    const botBtn = container.querySelector('[data-testid="lobby-bot-btn-easy"]');
    expect(botBtn).toBeTruthy();
    expect(botBtn?.textContent).toContain('BOT');
  });
});
