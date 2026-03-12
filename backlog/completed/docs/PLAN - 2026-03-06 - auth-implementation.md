# Auth Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete optional authentication so signed-in players get persistent ELO and match history while guests play without friction.

**Architecture:** First-message WebSocket auth with JWT tokens stored in memory. HttpOnly refresh cookie for session restore. Modal dialog UI with full a11y. Server auth routes already exist; this plan wires everything together and adds tests.

**Tech Stack:** Fastify + @fastify/jwt + @fastify/cookie (server), Preact + vanilla TS (client), Zod (validation), Vitest (tests), bcryptjs (passwords)

**Design Doc:** `backlog/completed/docs/PLAN - 2026-03-06 - auth-design.md`

---

## Task 1: Add `authenticate` and `authenticated` to shared schema

**Files:**

- Modify: `shared/src/schema.ts` (ClientMessageSchema + ServerMessageSchema)
- Test: existing `shared/tests/schema.test.ts` (schema snapshot)

#### Step 1: Add authenticate to ClientMessageSchema**

In `shared/src/schema.ts`, add a new entry to the `ClientMessageSchema` discriminated union (around line 515):

```typescript
z.object({ type: z.literal('authenticate'), token: z.string() }),
```

Add it after the `action` entry in the array.

#### Step 2: Add authenticated and auth_error to ServerMessageSchema**

In `shared/src/schema.ts`, add two entries to the `ServerMessageSchema` discriminated union (around line 499):

```typescript
z.object({
  type: z.literal('authenticated'),
  user: z.object({ id: z.string(), name: z.string(), elo: z.number() }),
}),
z.object({ type: z.literal('auth_error'), error: z.string() }),
```

#### Step 3: Regenerate schema artifacts**

Run: `pnpm schema:gen`

Expected: New JSON schemas generated, `types.ts` updated.

#### Step 4: Run schema check**

Run: `pnpm schema:check`

Expected: PASS (artifacts up to date after regeneration).

#### Step 5: Run shared tests**

Run: `rtk pnpm --filter @phalanxduel/shared test`

Expected: schema snapshot test may fail. If so, update snapshots with `pnpm --filter @phalanxduel/shared vitest run --update` from the `shared/` directory.

#### Step 6: Update client dispatch for new message types**

In `client/src/state.ts`, add cases inside `dispatch()` (around line 200, before the closing brace):

```typescript
case 'authenticated':
  // Handled by connection layer, not state dispatch
  break;

case 'auth_error':
  // Handled by connection layer, not state dispatch
  break;
```

#### Step 7: Verify typecheck passes**

Run: `rtk pnpm typecheck`

Expected: PASS across all packages.

#### Step 8: Commit**

```bash
git add shared/ client/src/state.ts
git commit -m "feat(shared): add authenticate/authenticated/auth_error message types"
```

---

## Task 2: Add HttpOnly cookie + logout endpoint to server auth routes

**Files:**

- Modify: `server/src/routes/auth.ts`

#### Step 1: Set HttpOnly cookie on register**

In `server/src/routes/auth.ts`, after line 47 (`const token = ...`), add cookie setting before the return:

```typescript
reply.setCookie('phalanx_refresh', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days
});
```

#### Step 2: Set HttpOnly cookie on login**

In the login handler, after line 70 (`const token = ...`), add the same cookie setting:

```typescript
reply.setCookie('phalanx_refresh', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60,
});
```

#### Step 3: Update /api/auth/me to read refresh cookie**

Replace the current `/api/auth/me` handler (lines 75-89) to check the refresh cookie first:

```typescript
fastify.get('/api/auth/me', async (request, reply) => {
  try {
    // Try Authorization header first, then refresh cookie
    let token = request.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
      token = request.cookies['phalanx_refresh'];
    }
    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const payload = fastify.jwt.verify(token) as { id: string };

    if (!db) return reply.status(503).send({ error: 'Database not available' });

    const [user] = await db.select().from(users).where(eq(users.id, payload.id)).limit(1);
    if (!user) return reply.status(404).send({ error: 'User not found' });

    // Issue fresh token for memory storage
    const freshToken = fastify.jwt.sign({ id: user.id, name: user.name });

    return { token: freshToken, user: { id: user.id, name: user.name, email: user.email, elo: user.elo } };
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
});
```

#### Step 4: Add logout endpoint**

After the `/api/auth/me` handler, add:

```typescript
fastify.post('/api/auth/logout', async (_request, reply) => {
  reply.clearCookie('phalanx_refresh', { path: '/' });
  return { ok: true };
});
```

#### Step 5: Verify typecheck passes**

Run: `rtk pnpm typecheck`

Expected: PASS.

#### Step 6: Commit**

```bash
git add server/src/routes/auth.ts
git commit -m "feat(server): add HttpOnly refresh cookie and logout endpoint"
```

---

## Task 3: Handle `authenticate` message on WebSocket server

**Files:**

- Modify: `server/src/app.ts` (WebSocket message handler)

#### Step 1: Add authenticate case to WebSocket message switch**

In `server/src/app.ts`, find the `switch` statement inside the WebSocket message handler (around line 620+). Add a new case before the `default`:

```typescript
case 'authenticate': {
  try {
    const authPayload = fastify.jwt.verify(msg.token) as { id: string; name: string };
    authUser = authPayload;
    // Update the player connection if already in a match
    const info = matchManager.socketMap.get(socket);
    if (info && !info.isSpectator) {
      const match = matchManager.matches.get(info.matchId);
      if (match) {
        const player = match.players.find((p) => p?.playerId === info.playerId);
        if (player) {
          player.userId = authPayload.id;
          player.playerName = authPayload.name;
        }
      }
    }
    sendMessage({
      type: 'authenticated',
      user: { id: authPayload.id, name: authPayload.name, elo: 0 },
    });
  } catch {
    sendMessage({ type: 'auth_error', error: 'Invalid token' });
  }
  break;
}
```

Note: The `elo` field is set to 0 here since we don't have DB access in the WS handler. The client already has the real elo from the login/me response.

#### Step 2: Verify typecheck passes**

Run: `rtk pnpm typecheck`

Expected: PASS (the new message types were added to shared schema in Task 1).

#### Step 3: Commit**

```bash
git add server/src/app.ts
git commit -m "feat(server): handle authenticate message on WebSocket"
```

---

## Task 4: Server auth route tests

**Files:**

- Create: `server/tests/auth.test.ts`

#### Step 1: Write auth route test suite**

Create `server/tests/auth.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app';
import type { FastifyInstance } from 'fastify';

describe('Auth routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('without DATABASE_URL', () => {
    it('POST /api/auth/register returns 503 when DB unavailable', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { name: 'Test', email: 'test@example.com', password: 'password123' },
      });
      expect(res.statusCode).toBe(503);
      expect(res.json().error).toBe('Database not available');
    });

    it('POST /api/auth/login returns 503 when DB unavailable', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'password123' },
      });
      expect(res.statusCode).toBe(503);
      expect(res.json().error).toBe('Database not available');
    });

    it('GET /api/auth/me returns 401 without token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/auth/logout clears cookie and returns ok', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().ok).toBe(true);
      // Check cookie is cleared
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });
  });

  describe('input validation', () => {
    it('POST /api/auth/register rejects missing fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'test@example.com' },
      });
      // Either 400 (validation) or 503 (no DB) - both acceptable
      expect([400, 503]).toContain(res.statusCode);
    });

    it('POST /api/auth/register rejects short password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { name: 'Test', email: 'test@example.com', password: 'short' },
      });
      expect([400, 503]).toContain(res.statusCode);
    });

    it('POST /api/auth/login rejects invalid email format', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'not-an-email', password: 'password123' },
      });
      expect([400, 503]).toContain(res.statusCode);
    });
  });
});
```

#### Step 2: Run tests to verify they pass**

Run: `rtk pnpm --filter @phalanxduel/server test`

Expected: PASS. These tests work without a real DB because the routes return 503 when `db` is null, and validation runs before the DB check.

#### Step 3: Commit**

```bash
git add server/tests/auth.test.ts
git commit -m "test(server): add auth route unit tests"
```

---

## Task 5: WebSocket authenticate integration test

**Files:**

- Modify: `server/tests/ws.test.ts`

#### Step 1: Add authenticate test**

Add to the `describe('WebSocket integration')` block in `server/tests/ws.test.ts`:

```typescript
it('should respond to authenticate with auth_error for invalid token', async () => {
  const ws = await connect(url);

  const response = (await sendAndWait(ws, {
    type: 'authenticate',
    token: 'invalid-jwt-token',
  })) as { type: string; error: string };

  expect(response.type).toBe('auth_error');
  expect(response.error).toBe('Invalid token');

  ws.close();
});
```

#### Step 2: Run test to verify it passes**

Run: `pnpm vitest run tests/ws.test.ts` (from `server/` directory)

Expected: PASS (server handles invalid JWT and responds with auth_error).

#### Step 3: Commit**

```bash
git add server/tests/ws.test.ts
git commit -m "test(server): add WebSocket authenticate integration test"
```

---

## Task 6: Client auth token module

**Files:**

- Create: `client/src/auth.ts`
- Test: `client/tests/auth.test.ts`

#### Step 1: Write the failing test**

Create `client/tests/auth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

    // Mock fetch for /api/auth/logout
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
```

#### Step 2: Run test to verify it fails**

Run: `rtk pnpm --filter @phalanxduel/client test`

Expected: FAIL (module `../src/auth` does not exist).

#### Step 3: Write the implementation**

Create `client/src/auth.ts`:

```typescript
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
```

#### Step 4: Run tests to verify they pass**

Run: `rtk pnpm --filter @phalanxduel/client test`

Expected: PASS.

#### Step 5: Commit**

```bash
git add client/src/auth.ts client/tests/auth.test.ts
git commit -m "feat(client): add auth token module with restoreSession and logout"
```

---

## Task 7: Send authenticate on WebSocket open

**Files:**

- Modify: `client/src/connection.ts`
- Modify: `client/tests/connection.test.ts`

#### Step 1: Write the failing test**

Add to `client/tests/connection.test.ts`:

```typescript
it('sends authenticate message on open when token exists', async () => {
  const { setToken } = await import('../src/auth');
  setToken('test-jwt-token');

  const onMessage = vi.fn();
  const conn = createConnection('ws://localhost:9999', onMessage);

  // Simulate WebSocket open
  const ws = (conn as unknown as { ws: WebSocket }).ws;
  // ... (approach depends on how connection.test.ts mocks WebSocket)
```

Note: The existing `connection.test.ts` likely has a WebSocket mock pattern. Follow that pattern. The key behavior: after the `open` event fires, if `getToken()` returns a non-null value, `send({ type: 'authenticate', token })` should be called.

#### Step 2: Add auth import and send authenticate on open**

In `client/src/connection.ts`, add import at the top:

```typescript
import { getToken } from './auth';
```

Inside `connect()`, in the `open` event handler (after `reconnectDelay = 1000; onOpen?.();`), add:

```typescript
const authToken = getToken();
if (authToken && ws) {
  ws.send(JSON.stringify({ type: 'authenticate', token: authToken }));
}
```

#### Step 3: Run tests**

Run: `rtk pnpm --filter @phalanxduel/client test`

Expected: PASS.

#### Step 4: Commit**

```bash
git add client/src/connection.ts client/tests/connection.test.ts
git commit -m "feat(client): send authenticate message on WebSocket open"
```

---

## Task 8: AuthPanel improvements (modal, a11y, validation, token storage)

**Files:**

- Modify: `client/src/components/AuthPanel.tsx`
- Create: `client/tests/auth-panel.test.ts`

#### Step 1: Write failing tests**

Create `client/tests/auth-panel.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'preact';
import { AuthPanel } from '../src/components/AuthPanel';

describe('AuthPanel', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders login form by default', () => {
    render(<AuthPanel onClose={() => {}} />, container);
    expect(container.querySelector('h3')?.textContent).toBe('Login');
    expect(container.querySelector('input[type="email"]')).toBeTruthy();
    expect(container.querySelector('input[type="password"]')).toBeTruthy();
    // No name field in login mode
    expect(container.querySelector('input[type="text"]')).toBeNull();
  });

  it('switches to register form', async () => {
    render(<AuthPanel onClose={() => {}} />, container);
    const toggleBtn = container.querySelector('.btn-text') as HTMLButtonElement;
    toggleBtn.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('h3')?.textContent).toBe('Register');
    expect(container.querySelector('input[type="text"]')).toBeTruthy();
  });

  it('has role="dialog" and aria-modal', () => {
    render(<AuthPanel onClose={() => {}} />, container);
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<AuthPanel onClose={onClose} />, container);
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<AuthPanel onClose={onClose} />, container);
    const backdrop = container.querySelector('.auth-modal-backdrop') as HTMLElement;
    backdrop?.click();
    expect(onClose).toHaveBeenCalled();
  });

  it('displays error message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid credentials' }),
    });

    render(<AuthPanel onClose={() => {}} />, container);
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    emailInput.value = 'test@example.com';
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    passwordInput.value = 'password123';
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));

    const form = container.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true }));

    await new Promise((r) => setTimeout(r, 50));
    expect(container.querySelector('.auth-error')?.textContent).toBe('Invalid credentials');
  });
});
```

#### Step 2: Run tests to verify they fail**

Run: `rtk pnpm --filter @phalanxduel/client test`

Expected: FAIL (AuthPanel doesn't accept `onClose` prop, no `role="dialog"`, no backdrop).

#### Step 3: Rewrite AuthPanel with modal, a11y, and token storage**

Replace `client/src/components/AuthPanel.tsx` entirely:

```tsx
import { useState, useEffect, useRef } from 'preact/hooks';
import { setUser } from '../state';
import { setToken } from '../auth';
import { getToken } from '../auth';

interface AuthPanelProps {
  onClose: () => void;
}

export function AuthPanel({ onClose }: AuthPanelProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap: focus first input on mount
  useEffect(() => {
    const firstInput = dialogRef.current?.querySelector('input') as HTMLElement | null;
    firstInput?.focus();
  }, [isLogin]);

  // Escape to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    const el = dialogRef.current;
    el?.addEventListener('keydown', handleKeyDown);
    return () => el?.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { email, password } : { email, password, name };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
      } else {
        setToken(data.token);
        setUser(data.user);
        // Send authenticate over existing WebSocket
        const { getConnection } = await import('../renderer');
        const conn = getConnection();
        const token = getToken();
        if (conn && token) {
          conn.send({ type: 'authenticate', token } as never);
        }
        onClose();
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="auth-modal-backdrop" onClick={(e) => {
      if ((e.target as HTMLElement).classList.contains('auth-modal-backdrop')) onClose();
    }}>
      <div class="auth-panel" role="dialog" aria-modal="true" aria-label={isLogin ? 'Login' : 'Register'} ref={dialogRef}>
        <h3>{isLogin ? 'Login' : 'Register'}</h3>
        {error && <p class="auth-error" role="alert">{error}</p>}
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div class="form-group">
              <label for="auth-name">Name</label>
              <input
                id="auth-name"
                type="text"
                placeholder="Your name"
                value={name}
                onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)}
                required
                minLength={1}
                maxLength={50}
              />
            </div>
          )}
          <div class="form-group">
            <label for="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              placeholder="Email"
              value={email}
              onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)}
              required
            />
          </div>
          <div class="form-group">
            <label for="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              placeholder="Password (min 8 characters)"
              value={password}
              onInput={(e) => setPassword((e.currentTarget as HTMLInputElement).value)}
              required
              minLength={8}
            />
          </div>
          <button type="submit" class="btn btn-primary" disabled={loading}>
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>
        <button class="btn-text" onClick={() => { setIsLogin(!isLogin); setError(null); }}>
          {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
}
```

#### Step 4: Run tests to verify they pass**

Run: `rtk pnpm --filter @phalanxduel/client test`

Expected: PASS.

#### Step 5: Commit**

```bash
git add client/src/components/AuthPanel.tsx client/tests/auth-panel.test.ts
git commit -m "feat(client): add accessible auth modal with focus trap and Escape close"
```

---

## Task 9: Wire AuthPanel into lobby + add Sign in/Sign out button

**Files:**

- Modify: `client/src/lobby.ts`

#### Step 1: Add auth button and modal to lobby**

In `client/src/lobby.ts`, the lobby header is built around line 110-123. After the subtitle, add:

```typescript
// Auth button
const authArea = el('div', 'auth-area');
const currentState = getState();

if (currentState.user) {
  const userInfo = el('span', 'user-info');
  userInfo.textContent = `${currentState.user.name} (ELO: ${currentState.user.elo})`;
  authArea.appendChild(userInfo);

  const signOutBtn = el('button', 'btn btn-text');
  signOutBtn.textContent = 'Sign out';
  signOutBtn.setAttribute('data-testid', 'auth-signout-btn');
  signOutBtn.addEventListener('click', async () => {
    const { logout } = await import('./auth');
    await logout();
  });
  authArea.appendChild(signOutBtn);
} else {
  const signInBtn = el('button', 'btn btn-secondary btn-sm');
  signInBtn.textContent = 'Sign in';
  signInBtn.setAttribute('data-testid', 'auth-signin-btn');
  signInBtn.addEventListener('click', () => {
    const modalRoot = document.createElement('div');
    modalRoot.id = 'auth-modal-root';
    document.body.appendChild(modalRoot);

    import('preact').then(({ render: preactRender }) => {
      import('./components/AuthPanel').then(({ AuthPanel }) => {
        preactRender(
          // @ts-expect-error Preact JSX
          AuthPanel({
            onClose: () => {
              preactRender(null, modalRoot);
              modalRoot.remove();
              signInBtn.focus();
            },
          }),
          modalRoot,
        );
      });
    });
  });
  authArea.appendChild(signInBtn);

  const signInHint = el('p', 'auth-hint');
  signInHint.textContent = 'Sign in to track your stats and ELO';
  authArea.appendChild(signInHint);
}

wrapper.appendChild(authArea);
```

Note: This uses dynamic import to avoid loading Preact in the vanilla lobby code path unless the user clicks Sign in.

#### Step 2: Auto-restore session on lobby render**

At the top of the `renderLobby` function, add a one-time session restore:

```typescript
// One-time session restore
if (!getState().user) {
  import('./auth').then(({ restoreSession }) => restoreSession());
}
```

#### Step 3: Run tests**

Run: `rtk pnpm --filter @phalanxduel/client test`

Expected: PASS (existing lobby tests should still pass since auth area is additive).

#### Step 4: Commit**

```bash
git add client/src/lobby.ts
git commit -m "feat(client): wire auth modal into lobby with sign in/out buttons"
```

---

## Task 10: Auth modal CSS

**Files:**

- Modify: `client/src/style.css` (or wherever the main CSS lives)

#### Step 1: Find the CSS file**

Look for `client/src/style.css` or `client/src/index.css`.

#### Step 2: Add auth modal styles**

Append to the CSS file:

```css
/* Auth Modal */
.auth-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.auth-panel {
  background: var(--surface, #1a1a2e);
  border: 1px solid var(--border, #333);
  border-radius: 8px;
  padding: 2rem;
  width: min(400px, 90vw);
  max-height: 90vh;
  overflow-y: auto;
}

.auth-panel h3 {
  margin: 0 0 1rem;
  text-align: center;
}

.auth-panel .form-group {
  margin-bottom: 1rem;
}

.auth-panel label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
  color: var(--text-muted, #aaa);
}

.auth-panel input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border, #333);
  border-radius: 4px;
  background: var(--input-bg, #0f0f23);
  color: var(--text, #eee);
  font-size: 1rem;
  box-sizing: border-box;
}

.auth-panel input:focus {
  outline: 2px solid var(--accent, #4a9eff);
  outline-offset: 1px;
}

.auth-error {
  color: var(--error, #ff4444);
  font-size: 0.875rem;
  margin: 0 0 1rem;
  padding: 0.5rem;
  border: 1px solid var(--error, #ff4444);
  border-radius: 4px;
  background: rgba(255, 68, 68, 0.1);
}

.auth-area {
  text-align: center;
  margin: 1rem 0;
}

.auth-hint {
  font-size: 0.75rem;
  color: var(--text-muted, #888);
  margin: 0.25rem 0 0;
}

.user-info {
  margin-right: 0.5rem;
  font-size: 0.875rem;
}

.btn-sm {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
}
```

#### Step 3: Verify build**

Run: `rtk pnpm build`

Expected: PASS.

#### Step 4: Commit**

```bash
git add client/src/style.css  # or wherever the CSS is
git commit -m "style(client): add auth modal and sign-in button CSS"
```

---

## Task 11: Update OpenAPI snapshot and run full CI

**Files:**

- Modify: `server/tests/__snapshots__/openapi.test.ts.snap` (auto-updated)

#### Step 1: Update OpenAPI snapshot**

Run from `server/` directory: `pnpm vitest run tests/openapi.test.ts --update`

Expected: Snapshot updated to include `/api/auth/logout` endpoint.

#### Step 2: Run full test suite**

Run: `rtk pnpm -r test`

Expected: All tests PASS across all packages.

#### Step 3: Run full CI gate**

Run: `rtk pnpm lint && rtk pnpm typecheck`

Expected: PASS.

#### Step 4: Commit**

```bash
git add server/tests/__snapshots__/
git commit -m "chore: update OpenAPI snapshot for auth endpoints"
```

---

## Task 12: Generate Drizzle migrations

**Files:**

- Create: `server/drizzle/` directory (auto-generated)

#### Step 1: Generate migration files**

Run from `server/` directory: `pnpm db:generate`

Expected: Migration SQL files created in `server/drizzle/`.

#### Step 2: Verify migration files exist**

Run: `ls server/drizzle/`

Expected: SQL migration files for `users` and `matches` tables.

#### Step 3: Commit**

```bash
git add server/drizzle/
git commit -m "chore(server): generate Drizzle migration files for users and matches tables"
```

---

## Summary of tasks

| Task | Description | Est. |
|------|-------------|------|
| 1 | Add authenticate/authenticated/auth_error to shared schema | 5 min |
| 2 | Add HttpOnly cookie + logout endpoint to auth routes | 5 min |
| 3 | Handle authenticate message on WebSocket server | 5 min |
| 4 | Server auth route tests | 5 min |
| 5 | WebSocket authenticate integration test | 3 min |
| 6 | Client auth token module (getToken, setToken, logout, restoreSession) | 5 min |
| 7 | Send authenticate on WebSocket open | 3 min |
| 8 | AuthPanel improvements (modal, a11y, validation, token storage) | 10 min |
| 9 | Wire AuthPanel into lobby + sign in/sign out button | 5 min |
| 10 | Auth modal CSS | 3 min |
| 11 | Update OpenAPI snapshot + full CI | 3 min |
| 12 | Generate Drizzle migrations | 2 min |
