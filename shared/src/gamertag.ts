export function formatGamertag(gamertag: string, suffix: number | null): string {
  return suffix != null ? `${gamertag}#${suffix}` : gamertag;
}

export function normalizeGamertag(gamertag: string): string {
  return gamertag.toLowerCase().replace(/[\s_-]/g, '');
}

type ValidationResult = { ok: true } | { ok: false; reason: string };

export function validateGamertag(gamertag: string): ValidationResult {
  if (gamertag.length < 3 || gamertag.length > 20) {
    return { ok: false, reason: 'Gamertag must be 3-20 characters' };
  }
  if (gamertag !== gamertag.trim()) {
    return { ok: false, reason: 'No leading or trailing whitespace' };
  }
  if (/ {2}/.test(gamertag)) {
    return { ok: false, reason: 'No consecutive spaces' };
  }
  if (!/^[a-zA-Z0-9 _-]+$/.test(gamertag)) {
    return { ok: false, reason: 'Only letters, numbers, spaces, hyphens, and underscores allowed' };
  }
  if (!/[a-zA-Z]/.test(gamertag)) {
    return { ok: false, reason: 'Must contain at least one letter' };
  }
  return { ok: true };
}
