import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderMatchHistory } from '../src/match-history';

const SAMPLE_MATCHES = [
  {
    matchId: 'match-aaa',
    playerIds: ['p1', 'p2'],
    playerNames: ['Alice', 'Bob'],
    winnerIndex: 0,
    victoryType: 'lpDepletion',
    turnCount: 12,
    fingerprint: 'abc123',
    createdAt: '2026-03-15T10:00:00.000Z',
    completedAt: '2026-03-15T10:05:00.000Z',
  },
  {
    matchId: 'match-bbb',
    playerIds: ['p3', 'bot'],
    playerNames: ['Carol', 'Bot'],
    winnerIndex: 1,
    victoryType: 'forfeit',
    turnCount: 3,
    fingerprint: 'def456',
    createdAt: '2026-03-15T11:00:00.000Z',
    completedAt: '2026-03-15T11:02:00.000Z',
  },
];

describe('renderMatchHistory', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a loading state immediately', () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {})); // never resolves
    renderMatchHistory(container);
    expect(container.textContent).toContain('Loading');
  });

  it('renders match rows after fetch resolves', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => SAMPLE_MATCHES,
    } as Response);
    renderMatchHistory(container);
    await vi.waitFor(() => {
      expect(container.querySelectorAll('[data-testid="match-row"]').length).toBe(2);
    });
  });

  it('each row shows player names', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => SAMPLE_MATCHES,
    } as Response);
    renderMatchHistory(container);
    await vi.waitFor(() => {
      const rows = container.querySelectorAll('[data-testid="match-row"]');
      expect(rows[0]!.textContent).toContain('Alice');
      expect(rows[0]!.textContent).toContain('Bob');
    });
  });

  it('each row has a View Log link pointing to /matches/:id/log', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => SAMPLE_MATCHES,
    } as Response);
    renderMatchHistory(container);
    await vi.waitFor(() => {
      const link = container.querySelector(
        '[data-testid="match-row"] [data-testid="match-log-link"]',
      )!;
      expect(link).toBeTruthy();
      expect(link.href).toContain('/matches/match-aaa/log');
    });
  });

  it('shows empty state message when no matches returned', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);
    renderMatchHistory(container);
    await vi.waitFor(() => {
      expect(container.textContent).toContain('No completed matches');
    });
  });

  it('shows error message when fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));
    renderMatchHistory(container);
    await vi.waitFor(() => {
      expect(container.textContent).toContain('Failed to load');
    });
  });
});
