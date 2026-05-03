import { normalizeGamertag, validateGamertag } from '@phalanxduel/shared';
import { isBlockedGamertag } from './content-filter.js';

export { normalizeGamertag, validateGamertag };

interface ExistingTagInfo {
  maxSuffix: number | null;
  count: number;
}

interface SuffixAssignment {
  newSuffix: number | null;
  updateExisting: number | null;
}

export function assignGamertagSuffix(existing: ExistingTagInfo | null): SuffixAssignment {
  if (!existing) {
    return { newSuffix: null, updateExisting: null };
  }

  if (existing.maxSuffix === null) {
    return { newSuffix: 2, updateExisting: 1 };
  }

  return { newSuffix: existing.maxSuffix + 1, updateExisting: null };
}

export function validateGamertagFull(gamertag: string): string | null {
  const validation = validateGamertag(gamertag);
  if (!validation.ok) return validation.reason;

  const normalized = normalizeGamertag(gamertag);
  let blocked = false;
  try {
    blocked = isBlockedGamertag(normalized);
  } catch (err) {
    // Fail-open: if the content filter is unavailable, allow the gamertag through
    // rather than blocking registration. Log so ops can detect filter outages.
    console.error('[content-filter] isBlockedGamertag threw; failing open', err);
  }
  if (blocked) return 'That gamertag is not available';

  return null;
}
