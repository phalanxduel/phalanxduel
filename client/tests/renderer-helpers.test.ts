import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { AppState, ServerHealth } from '../src/state';

// Mock state module to avoid side effects from clearError
vi.mock('../src/state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/state')>();
  return { ...actual, clearError: vi.fn() };
});

// Mock sub-renderers so render() doesn't pull in full lobby/game DOM trees
vi.mock('../src/lobby', () => ({
  renderLobby: vi.fn(),
  unmountLobby: vi.fn(),
}));
vi.mock('../src/game', () => ({
  renderGame: vi.fn(),
}));
vi.mock('../src/waiting', () => ({
  renderWaiting: vi.fn(),
}));
vi.mock('../src/game-over', () => ({
  renderGameOver: vi.fn(),
}));

import {
  el,
  render,
  renderHealthBadge,
  makeCopyBtn,
  renderError,
  setConnection,
  getConnection,
} from '../src/renderer';

describe('el', () => {
  it('creates an element with the given tag', () => {
    const div = el('div', 'my-class');
    expect(div.tagName).toBe('DIV');
  });

  it('sets the className', () => {
    const btn = el('button', 'btn btn-small');
    expect(btn.className).toBe('btn btn-small');
  });
});

describe('setConnection / getConnection', () => {
  afterEach(() => {
    // Reset connection to null
    setConnection(null as unknown as import('../src/connection').Connection);
  });

  it('returns null when no connection set', () => {
    setConnection(null as unknown as import('../src/connection').Connection);
    expect(getConnection()).toBeNull();
  });

  it('stores and retrieves connection', () => {
    const mock = { send: vi.fn(), close: vi.fn() };
    setConnection(mock);
    expect(getConnection()).toBe(mock);
  });
});

describe('renderHealthBadge', () => {
  it('renders badge with color class', () => {
    const health: ServerHealth = { color: 'green', label: 'Connected', hint: 'v1.0' };
    const badge = renderHealthBadge(health);
    expect(badge.classList.contains('health-badge')).toBe(true);
    expect(badge.classList.contains('health-badge--green')).toBe(true);
  });

  it('includes label text', () => {
    const health: ServerHealth = { color: 'green', label: 'Connected', hint: null };
    const badge = renderHealthBadge(health);
    const label = badge.querySelector('.health-label');
    expect(label?.textContent).toBe('Connected');
  });

  it('exposes a combined accessible label', () => {
    const health: ServerHealth = {
      color: 'yellow',
      label: 'Reconnecting',
      hint: 'Restoring session',
    };
    const badge = renderHealthBadge(health);
    expect(badge.getAttribute('aria-label')).toBe('Reconnecting. Restoring session');
  });

  it('includes hint when present', () => {
    const health: ServerHealth = { color: 'green', label: 'Connected', hint: 'v1.0' };
    const badge = renderHealthBadge(health);
    const hint = badge.querySelector('.health-hint');
    expect(hint?.textContent).toBe('v1.0');
  });

  it('omits hint when null', () => {
    const health: ServerHealth = { color: 'red', label: 'Disconnected', hint: null };
    const badge = renderHealthBadge(health);
    const hint = badge.querySelector('.health-hint');
    expect(hint).toBeNull();
  });

  it('defaults to red/Connecting when health is null', () => {
    const badge = renderHealthBadge(null);
    expect(badge.classList.contains('health-badge--red')).toBe(true);
    const label = badge.querySelector('.health-label');
    expect(label?.textContent).toBe('Connecting\u2026');
  });
});

describe('makeCopyBtn', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn(() => Promise.resolve()) },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates button with label text', () => {
    const btn = makeCopyBtn('Copy Link', () => 'http://test');
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.textContent).toBe('Copy Link');
  });

  it('copies value to clipboard on click', () => {
    const btn = makeCopyBtn('Copy', () => 'test-value');
    btn.click();
    expect(btn.textContent).toBe('Copying...');
  });

  it('shows "Copied" feedback after click', async () => {
    const btn = makeCopyBtn('Copy', () => 'val');
    btn.click();
    await Promise.resolve();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('val');
    expect(btn.textContent).toBe('Copied');
  });
});

describe('renderError', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('appends error banner with message', () => {
    renderError(container, 'Something went wrong');
    const banner = container.querySelector('.error-banner');
    expect(banner).toBeTruthy();
    expect(banner!.textContent).toContain('Something went wrong');
  });

  it('includes close button', () => {
    renderError(container, 'err');
    const closeBtn = container.querySelector('.error-close');
    expect(closeBtn).toBeTruthy();
    expect(closeBtn!.textContent).toBe('\u00d7');
  });

  it('close button removes banner', () => {
    renderError(container, 'err');
    const closeBtn = container.querySelector('.error-close')!;
    closeBtn.click();
    expect(container.querySelector('.error-banner')).toBeNull();
  });

  it('auto-dismisses after 5 seconds with fade-out', () => {
    renderError(container, 'err');
    const banner = container.querySelector('.error-banner');
    expect(banner).toBeTruthy();

    vi.advanceTimersByTime(5000);
    expect(banner!.classList.contains('fade-out')).toBe(true);

    vi.advanceTimersByTime(500);
    expect(container.querySelector('.error-banner')).toBeNull();
  });
});

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
    damageMode: 'classic',
    startingLifepoints: 20,
    serverHealth: null,
    isSpectator: false,
    spectatorCount: 0,
    showHelp: false,
    ...overrides,
  };
}

describe('render', () => {
  let app: HTMLElement;

  beforeEach(() => {
    app = document.createElement('div');
    app.id = 'app';
    document.body.appendChild(app);
  });

  afterEach(() => {
    app.remove();
  });

  it('does nothing when #app is missing', () => {
    app.remove();
    // Should not throw
    render(makeState());
  });

  it('sets page title for lobby screen', () => {
    render(makeState({ screen: 'lobby' }));
    expect(document.title).toContain('Tactical 1v1');
  });

  it('sets page title for waiting screen', () => {
    render(makeState({ screen: 'waiting' }));
    expect(document.title).toContain('Waiting');
  });

  it('sets page title for gameOver screen', () => {
    render(makeState({ screen: 'gameOver' }));
    expect(document.title).toContain('Game Over');
  });

  it('renders error banner when state.error is set', () => {
    vi.useFakeTimers();
    render(makeState({ error: 'test error' }));
    const banner = app.querySelector('.error-banner');
    expect(banner).toBeTruthy();
    expect(banner!.textContent).toContain('test error');
    vi.useRealTimers();
  });

  it('skips full re-render when only serverHealth changes', async () => {
    const lobby = await import('../src/lobby');
    const renderLobby = lobby.renderLobby as unknown as ReturnType<typeof vi.fn>;
    renderLobby.mockClear();

    render(makeState({ screen: 'lobby' }));
    const callsAfterFirst = renderLobby.mock.calls.length;

    // Second call with same screen/state but different health — targeted update only
    render(
      makeState({ screen: 'lobby', serverHealth: { color: 'green', label: 'OK', hint: null } }),
    );
    expect(renderLobby.mock.calls.length).toBe(callsAfterFirst); // Not called again
  });
});
