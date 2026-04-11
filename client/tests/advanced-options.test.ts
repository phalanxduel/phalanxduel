import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendSpy = vi.fn();

vi.mock('../src/state', () => ({
  getState: vi.fn(() => ({
    playerName: '',
    damageMode: 'cumulative',
    startingLifepoints: 20,
    showHelp: false,
    connectionState: 'OPEN',
    serverHealth: null,
  })),
  setPlayerName: vi.fn(),
  setDamageMode: vi.fn(),
  setStartingLifepoints: vi.fn(),
  resetToLobby: vi.fn(),
  startActionTimeout: vi.fn(),
}));

vi.mock('../src/debug', () => ({
  renderDebugButton: vi.fn(),
}));

vi.mock('../src/renderer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/renderer')>();
  return {
    ...actual,
    getConnection: vi.fn(() => ({ send: sendSpy })),
  };
});

describe('lobby advanced options', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.textContent = '';
    document.body.appendChild(container);
    window.history.replaceState({}, '', '/');
    sendSpy.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          rows: 2,
          columns: 4,
          maxHandSize: 4,
          initialDraw: 12,
        }),
      })),
    );
  });

  it('renders advanced options collapsed by default', async () => {
    const { renderLobby } = await import('../src/lobby');
    renderLobby(container);

    const panel = container.querySelector('[data-testid="advanced-options-panel"]');
    expect(panel).toBeTruthy();
    expect(panel?.classList.contains('is-open')).toBe(false);
  });

  it('shows rows and columns inputs when advanced options are expanded', async () => {
    const { renderLobby } = await import('../src/lobby');
    renderLobby(container);

    const toggle = container.querySelector('[data-testid="advanced-options-toggle"]')!;
    toggle.click();
    await Promise.resolve();

    const rowsInput = container.querySelector('[data-testid="advanced-rows-input"]');
    const columnsInput = container.querySelector('[data-testid="advanced-columns-input"]');
    expect(rowsInput).toBeTruthy();
    expect(columnsInput).toBeTruthy();
  });

  it('includes matchParams in createMatch payload', async () => {
    const { renderLobby } = await import('../src/lobby');
    renderLobby(container);

    const toggle = container.querySelector('[data-testid="advanced-options-toggle"]')!;
    toggle.click();
    await Promise.resolve();

    const nameInput = container.querySelector('[data-testid="lobby-name-input"]')!;
    const rowsInput = container.querySelector('[data-testid="advanced-rows-input"]')!;
    const columnsInput = container.querySelector('[data-testid="advanced-columns-input"]')!;
    const createBtn = container.querySelector('[data-testid="lobby-create-btn"]')!;

    nameInput.value = 'Alice';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    rowsInput.value = '3';
    rowsInput.dispatchEvent(new Event('change', { bubbles: true }));
    columnsInput.value = '3';
    columnsInput.dispatchEvent(new Event('change', { bubbles: true }));
    createBtn.click();

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'createMatch',
        playerName: 'Alice',
        matchParams: {
          rows: 3,
          columns: 3,
          maxHandSize: 3,
          initialDraw: 12,
        },
      }),
    );
  });
});
