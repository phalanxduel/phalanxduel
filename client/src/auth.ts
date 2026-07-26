import { setUser } from './state';
import type { AuthUser } from './state';

let token: string | null = null;

export function getToken(): string | null {
  return token;
}

export function setToken(t: string | null): void {
  token = t;
}

export function clearToken(): void {
  token = null;
}

export async function logout(): Promise<void> {
  clearToken();
  setUser(null);
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // Best-effort cookie clear
  }
}

/// Hands off the current web session to the native desktop app via a
/// short-lived, single-use code exchanged for a real session token — the
/// long-lived session token itself is never placed in the phalanxduel://
/// URL. See server/src/routes/auth.ts's /api/auth/handoff(/exchange).
export async function openInDesktopApp(): Promise<void> {
  const res = await fetch('/api/auth/handoff', {
    method: 'POST',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) return;
  const data = (await res.json()) as { code: string };
  window.location.href = `phalanxduel://auth?code=${encodeURIComponent(data.code)}`;
}

export async function restoreSession(): Promise<void> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return;
    const data = (await res.json()) as { token: string; user: AuthUser };
    token = data.token;
    setUser(data.user);
  } catch {
    // No session to restore
  }
}
