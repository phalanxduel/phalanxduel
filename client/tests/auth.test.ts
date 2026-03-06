import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('auth module', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('getToken returns null initially', async () => {
    const { getToken } = await import('../src/auth');
    expect(getToken()).toBeNull();
  });

  it('setToken stores token in memory', async () => {
    const { getToken, setToken } = await import('../src/auth');
    setToken('test-jwt-token');
    expect(getToken()).toBe('test-jwt-token');
  });

  it('clearToken removes token', async () => {
    const { getToken, setToken, clearToken } = await import('../src/auth');
    setToken('test-jwt-token');
    clearToken();
    expect(getToken()).toBeNull();
  });

  it('logout clears token and calls setUser(null)', async () => {
    const { setToken, logout } = await import('../src/auth');
    const state = await import('../src/state');
    const setUserSpy = vi.spyOn(state, 'setUser');

    setToken('test-jwt-token');

    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

    await logout();

    expect(setUserSpy).toHaveBeenCalledWith(null);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
  });

  it('restoreSession calls /api/auth/me and sets user on success', async () => {
    const { restoreSession, getToken } = await import('../src/auth');
    const state = await import('../src/state');
    const setUserSpy = vi.spyOn(state, 'setUser');

    const mockUser = { id: '1', name: 'Alice', email: 'a@b.com', elo: 1200 };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'fresh-token', user: mockUser }),
    });

    await restoreSession();

    expect(setUserSpy).toHaveBeenCalledWith(mockUser);
    expect(getToken()).toBe('fresh-token');
  });

  it('restoreSession does nothing on 401', async () => {
    const { restoreSession, getToken } = await import('../src/auth');
    const state = await import('../src/state');
    const setUserSpy = vi.spyOn(state, 'setUser');

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });

    await restoreSession();

    expect(setUserSpy).not.toHaveBeenCalled();
    expect(getToken()).toBeNull();
  });
});
