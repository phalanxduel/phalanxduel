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
  if (isBlockedGamertag(normalized)) return 'That gamertag is not available';

  return null;
}
