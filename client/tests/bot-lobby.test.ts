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
    renderLobby(container);
    const botBtn = container.querySelector('[data-testid="create-bot-match"]');
    expect(botBtn).toBeTruthy();
    expect(botBtn?.textContent).toContain('Bot');
  });
});
