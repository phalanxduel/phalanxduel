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
