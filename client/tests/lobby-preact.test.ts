import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const getState = vi.fn();

vi.mock('../src/state', () => ({
  getState,
  setDamageMode: vi.fn(),
  setPlayerName: vi.fn(),
  setStartingLifepoints: vi.fn(),
  startActionTimeout: vi.fn(),
}));

vi.mock('../src/debug', () => ({
  renderDebugButton: vi.fn(),
}));

vi.mock('../src/analytics', () => ({
  trackClientEvent: vi.fn(),
}));

vi.mock('../src/renderer', () => ({
  getConnection: vi.fn(() => null),
  renderError: vi.fn(),
}));

vi.mock('../src/experiments', () => ({
  getLobbyFrameworkVariant: vi.fn(() => 'preact'),
}));

describe('renderLobbyPreact', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rows: 2, columns: 4 }),
    }) as typeof fetch;
  });

  afterEach(async () => {
    const { render } = await import('preact');
    render(null, container);
    container.remove();
    vi.clearAllMocks();
  });

  it('shows reconnect guidance when the socket is reconnecting', async () => {
    getState.mockReturnValue({
      playerName: '',
      damageMode: 'classic',
      startingLifepoints: 20,
      connectionState: 'CONNECTING',
      serverHealth: {
        color: 'yellow',
        label: 'Reconnecting',
        hint: 'Attempting to restore the game session',
      },
    });

    const { renderLobbyPreact } = await import('../src/lobby-preact');
    const state = getState();
    renderLobbyPreact(container, state);

    expect(container.querySelector('.lobby-status')?.textContent).toBe(
      'Reconnecting to the game server',
    );
    expect(container.querySelector('.lobby-status-detail')?.textContent).toContain(
      'Attempting to restore the game session',
    );
  });

  it('disables lobby actions while offline', async () => {
    getState.mockReturnValue({
      playerName: '',
      damageMode: 'classic',
      startingLifepoints: 20,
      connectionState: 'DISCONNECTED',
      serverHealth: {
        color: 'red',
        label: 'Offline',
        hint: 'Connection to game server lost',
      },
    });

    const { renderLobbyPreact } = await import('../src/lobby-preact');
    const state = getState();
    renderLobbyPreact(container, state);

    expect(
      (container.querySelector('[data-testid="lobby-create-btn"]') as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      container
        .querySelector('.lobby-status-card')
        ?.classList.contains('lobby-status-card--offline'),
    ).toBe(true);
  });
});
