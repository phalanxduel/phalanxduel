import { describe, it, expect, vi, afterEach } from 'vitest';
import { h, render } from 'preact';
import { CascadeVisualizer } from '../src/lobby/CascadeVisualizer';
import { renderProfileName } from '../src/lobby/ProfileLink';
import { PublicProfileView } from '../src/lobby/PublicProfileView';

describe('lobby extracted components', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders CascadeVisualizer with classic and cumulative modes', () => {
    const container = document.createElement('div');
    render(h(CascadeVisualizer, { damageMode: 'classic', startingLifepoints: 20 }), container);
    expect(container.textContent).toContain('ATK');
    expect(container.textContent).toContain('FRN');
    expect(container.textContent).toContain('BCK');
    expect(container.textContent).toContain('20');

    render(h(CascadeVisualizer, { damageMode: 'cumulative', startingLifepoints: 12 }), container);
    expect(container.textContent).toContain('12');

    const atkNode = container.querySelector('.viz-node.active');
    atkNode?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    atkNode?.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
  });

  it('renders fallback, plain name, and clickable profile button via renderProfileName', () => {
    const onOpen = vi.fn();
    expect(renderProfileName(null, null, 'OPEN_SLOT', onOpen)).toBe('OPEN_SLOT');
    expect(renderProfileName('GuestBot', null, 'OPEN_SLOT', onOpen)).toBe('GuestBot');

    const container = document.createElement('div');
    render(h('div', null, renderProfileName('Alice', 'user-123', 'OPEN_SLOT', onOpen)), container);
    const btn = container.querySelector('button');
    expect(btn?.textContent).toBe('Alice');
    btn?.click();
    expect(onOpen).toHaveBeenCalledWith('user-123');
  });

  it('renders PublicProfileView with mocked API data and handles close', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/profiles/')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                userId: 'user-1',
                gamertag: 'Ace',
                displayName: 'Ace#1001',
                elo: 1120,
                record: { wins: 5, losses: 2, draws: 0, gamesPlayed: 7 },
                streak: 2,
                confidenceLabel: 'Calibrating',
                recentMatches: [
                  {
                    matchId: 'm-1',
                    result: 'win',
                    mode: 'pvp',
                    opponentName: 'Rival',
                    completedAt: '2026-11-20T00:00:00Z',
                    turnNumber: 14,
                  },
                ],
              }),
          });
        }
        if (url.includes('/achievements')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                achievements: [{ type: 'FIRST_WIN', awardedAt: '2026-11-20T00:00:00Z' }],
              }),
          });
        }
        if (url.includes('/favorites')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([{ matchId: 'm-1', player1Name: 'Ace', player2Name: 'Rival' }]),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ followers: 3, following: 2 }),
        });
      }),
    );

    const onClose = vi.fn();
    const container = document.createElement('div');
    render(h(PublicProfileView, { profileId: 'user-1', onClose }), container);
    await new Promise((r) => setTimeout(r, 25));
    expect(container.textContent).toContain('Ace#1001');
    expect(container.textContent).toContain('1120');
    expect(container.textContent).toContain('First Blood');
    const closeBtn = container.querySelector('button');
    closeBtn?.click();
    expect(onClose).toHaveBeenCalled();
  });
});
