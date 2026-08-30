import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, render } from 'preact';
import type { AppState } from '../src/state';
import { SettingsPanel } from '../src/components/SettingsPanel';

function settingsState(): AppState {
  return {
    screen: 'settings',
    user: {
      id: '00000000-0000-4000-8000-000000000001',
      gamertag: 'LoopTester',
      suffix: 1,
      email: 'loop@example.test',
      elo: 1000,
      emailNotifications: true,
      reminderNotifications: true,
    },
  } as AppState;
}

describe('SettingsPanel cosmetic loadout', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  it('shows owned Dual Loop art and its equipped state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          equippedCardSkinId: 'dual-loop',
          ownedCardSkinIds: ['default', 'dual-loop'],
        }),
      }),
    );

    render(h(SettingsPanel, { state: settingsState(), onClose: () => {} }), container);
    await new Promise((resolve) => setTimeout(resolve, 25));

    const dualLoop = container.querySelector('.cosmetic-loadout-card[data-card-theme="dual-loop"]');
    expect(dualLoop?.getAttribute('data-state')).toBe('equipped');
    expect(dualLoop?.textContent).toContain('Dual Loop');
    expect(dualLoop?.textContent).toContain('EQUIPPED');
    expect(dualLoop?.querySelector('.cosmetic-card-back-art')).toBeTruthy();
  });

  it('keeps Dual Loop locked when the entitlement is absent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          equippedCardSkinId: 'default',
          ownedCardSkinIds: ['default'],
        }),
      }),
    );

    render(h(SettingsPanel, { state: settingsState(), onClose: () => {} }), container);
    await new Promise((resolve) => setTimeout(resolve, 25));

    const dualLoop = container.querySelector('.cosmetic-loadout-card[data-card-theme="dual-loop"]');
    expect(dualLoop?.getAttribute('data-state')).toBe('locked');
    expect(dualLoop?.querySelector('button')?.disabled).toBe(true);
    expect(dualLoop?.textContent).toContain('Complete one match');
  });
});
