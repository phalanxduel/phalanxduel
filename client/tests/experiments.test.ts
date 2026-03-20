import { beforeEach, describe, expect, it, vi } from 'vitest';

const ENV = import.meta.env as ImportMetaEnv & {
  VITE_AB_LOBBY_PREACT_PERCENT?: string;
};

// Node 25+ ships a built-in localStorage that lacks clear/setItem/getItem,
// clobbering jsdom's implementation. Provide a minimal Storage shim.
const store = new Map<string, string>();
const storageMock: Storage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
  clear: () => {
    store.clear();
  },
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
};
Object.defineProperty(globalThis, 'localStorage', { value: storageMock, writable: true });

function loadModule() {
  return import('../src/experiments');
}

describe('experiments', () => {
  beforeEach(() => {
    store.clear();
    vi.resetModules();
    ENV.VITE_AB_LOBBY_PREACT_PERCENT = undefined;
  });

  it('defaults to control when percentage is not configured', async () => {
    const { getLobbyFrameworkVariant, isPreactLobbyExperimentEnabled } = await loadModule();

    expect(getLobbyFrameworkVariant()).toBe('control');
    expect(isPreactLobbyExperimentEnabled()).toBe(false);
  });

  it('assigns deterministic variant from stored visitor id', async () => {
    ENV.VITE_AB_LOBBY_PREACT_PERCENT = '100';
    window.localStorage.setItem('phalanx_visitor_id', 'visitor-1');

    const { getLobbyFrameworkVariant } = await loadModule();
    expect(getLobbyFrameworkVariant()).toBe('preact');
  });

  it('clamps invalid percentage values', async () => {
    ENV.VITE_AB_LOBBY_PREACT_PERCENT = '-10';
    const { getLobbyFrameworkPreactPercent } = await loadModule();
    expect(getLobbyFrameworkPreactPercent()).toBe(0);
  });
});
