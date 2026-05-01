import type { PartialCard, Suit } from '@phalanxduel/shared';

let cache: PartialCard[] | null = null;
let fetchPromise: Promise<void> | null = null;

export function getManifest(): PartialCard[] {
  return cache ?? [];
}

export function fetchCardsManifest(): Promise<void> {
  if (cache !== null) return Promise.resolve();
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch('/api/cards/manifest')
    .then((res) => {
      if (!res.ok) throw new Error(`Manifest fetch failed: ${res.status}`);
      return res.json() as Promise<PartialCard[]>;
    })
    .then((cards) => {
      cache = cards;
    })
    .catch((err) => {
      console.warn('[manifest] Could not load card manifest, falling back to defaults', err);
      fetchPromise = null;
    });

  return fetchPromise;
}

/** Returns the set of all suit names present in the manifest, or all 4 suits as fallback. */
export function getManifestSuits(): Set<Suit> {
  const manifest = getManifest();
  if (manifest.length === 0) {
    return new Set(['spades', 'hearts', 'diamonds', 'clubs']);
  }
  return new Set(manifest.map((c) => c.suit));
}

/** Returns all manifest cards matching a given suit. */
export function getManifestCardsBySuit(suit: Suit): PartialCard[] {
  return getManifest().filter((c) => c.suit === suit);
}
