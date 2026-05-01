import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PartialCard } from '@phalanxduel/shared';

const SAMPLE_CARDS: PartialCard[] = [
  { id: 'c1', face: 'K', suit: 'spades', type: 'king', value: 10 },
  { id: 'c2', face: 'Q', suit: 'hearts', type: 'queen', value: 10 },
  { id: 'c3', face: '7', suit: 'diamonds', type: 'number', value: 7 },
  { id: 'c4', face: '3', suit: 'clubs', type: 'number', value: 3 },
];

describe('manifest module (isolated)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('getManifest returns [] before any fetch', async () => {
    const { getManifest } = await import('../src/manifest');
    expect(getManifest()).toEqual([]);
  });

  it('fetchCardsManifest populates the cache', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(SAMPLE_CARDS) }),
    );
    const { fetchCardsManifest, getManifest } = await import('../src/manifest');
    await fetchCardsManifest();
    expect(getManifest()).toEqual(SAMPLE_CARDS);
  });

  it('fetchCardsManifest is idempotent — only fetches once', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(SAMPLE_CARDS) });
    vi.stubGlobal('fetch', mockFetch);
    const { fetchCardsManifest } = await import('../src/manifest');
    await fetchCardsManifest();
    await fetchCardsManifest();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('fetchCardsManifest handles non-ok response gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const { fetchCardsManifest, getManifest } = await import('../src/manifest');
    await expect(fetchCardsManifest()).resolves.toBeUndefined();
    expect(getManifest()).toEqual([]);
  });

  it('getManifestSuits returns all 4 suits as fallback when cache is empty', async () => {
    const { getManifestSuits } = await import('../src/manifest');
    const suits = getManifestSuits();
    expect(suits).toEqual(new Set(['spades', 'hearts', 'diamonds', 'clubs']));
  });

  it('getManifestSuits returns only suits present in manifest after load', async () => {
    const spadeOnly: PartialCard[] = [
      { id: 'c1', face: 'K', suit: 'spades', type: 'king', value: 10 },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(spadeOnly) }),
    );
    const { fetchCardsManifest, getManifestSuits } = await import('../src/manifest');
    await fetchCardsManifest();
    expect(getManifestSuits()).toEqual(new Set(['spades']));
  });

  it('getManifestCardsBySuit filters by suit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(SAMPLE_CARDS) }),
    );
    const { fetchCardsManifest, getManifestCardsBySuit } = await import('../src/manifest');
    await fetchCardsManifest();
    const spadesCards = getManifestCardsBySuit('spades');
    expect(spadesCards).toHaveLength(1);
    expect(spadesCards[0].face).toBe('K');
  });

  it('getManifestCardsBySuit returns [] for suit not in manifest', async () => {
    const spadeOnly: PartialCard[] = [
      { id: 'c1', face: 'K', suit: 'spades', type: 'king', value: 10 },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(spadeOnly) }),
    );
    const { fetchCardsManifest, getManifestCardsBySuit } = await import('../src/manifest');
    await fetchCardsManifest();
    expect(getManifestCardsBySuit('hearts')).toEqual([]);
  });
});

describe('isFace with manifest cache (isolated)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('falls back to card.type when manifest is empty', async () => {
    const { isFace } = await import('../src/cards');
    expect(isFace({ id: 'x', face: 'K', suit: 'spades', type: 'king', value: 10 })).toBe(true);
    expect(isFace({ id: 'x', face: '7', suit: 'spades', type: 'number', value: 7 })).toBe(false);
  });

  it('uses manifest type when cache is populated', async () => {
    const manifestCards: PartialCard[] = [
      { id: 'c1', face: 'K', suit: 'spades', type: 'king', value: 10 },
      { id: 'c2', face: '7', suit: 'hearts', type: 'number', value: 7 },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(manifestCards) }),
    );
    const { fetchCardsManifest } = await import('../src/manifest');
    await fetchCardsManifest();
    const { isFace } = await import('../src/cards');
    expect(isFace({ id: 'c1', face: 'K', suit: 'spades', type: 'king', value: 10 })).toBe(true);
    expect(isFace({ id: 'c2', face: '7', suit: 'hearts', type: 'number', value: 7 })).toBe(false);
  });
});
