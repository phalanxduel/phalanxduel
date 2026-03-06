export type LobbyFrameworkVariant = 'control' | 'preact';

const VISITOR_ID_KEY = 'phalanx_visitor_id';
let cachedVariant: LobbyFrameworkVariant | null = null;

function getVisitorId(): string {
  const existing = localStorage.getItem(VISITOR_ID_KEY);
  if (existing) return existing;

  const generated =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(VISITOR_ID_KEY, generated);
  return generated;
}

function hashToBucket(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) % 100;
}

function getPreactPercent(): number {
  const raw = import.meta.env['VITE_AB_LOBBY_PREACT_PERCENT'];
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.trunc(parsed)));
}

export function getLobbyFrameworkVariant(): LobbyFrameworkVariant {
  if (cachedVariant) return cachedVariant;

  const percent = getPreactPercent();
  if (percent <= 0) {
    cachedVariant = 'control';
    return cachedVariant;
  }

  const visitorId = getVisitorId();
  const bucket = hashToBucket(`lobby_framework:${visitorId}`);
  cachedVariant = bucket < percent ? 'preact' : 'control';
  return cachedVariant;
}

export function isPreactLobbyExperimentEnabled(): boolean {
  return getLobbyFrameworkVariant() === 'preact';
}

export function getLobbyFrameworkPreactPercent(): number {
  return getPreactPercent();
}
