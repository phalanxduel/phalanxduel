import { beforeEach, describe, expect, it, vi } from 'vitest';

const ENV = import.meta.env as ImportMetaEnv & {
  VITE_AB_LOBBY_PREACT_PERCENT?: string;
};

function loadModule() {
  return import('../src/experiments');
}

describe('experiments', () => {
  beforeEach(() => {
    localStorage.clear();
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
    localStorage.setItem('phalanx_visitor_id', 'visitor-1');

    const { getLobbyFrameworkVariant } = await loadModule();
    expect(getLobbyFrameworkVariant()).toBe('preact');
  });

  it('clamps invalid percentage values', async () => {
    ENV.VITE_AB_LOBBY_PREACT_PERCENT = '-10';
    const { getLobbyFrameworkPreactPercent } = await loadModule();
    expect(getLobbyFrameworkPreactPercent()).toBe(0);
  });
});
