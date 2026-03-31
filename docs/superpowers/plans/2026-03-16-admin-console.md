# Admin Console — Game Operations Panel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone `admin/` pnpm workspace package (Fastify API + Preact SPA) that gives operators a single UI for match creation, live/recent match inspection, user management, and pre-built SQL reports.

**Architecture:** Separate Fly.io app on the private network; reads Neon Postgres directly via Drizzle ORM; delegates match creation to game server's new `POST /internal/matches` endpoint (preserving single-authority match state); game JWT stored as httpOnly cookie with `is_admin` DB flag checked on every request.

**Tech Stack:** Fastify 5, Preact 10 + Vite 6, Drizzle ORM (postgres-js), `@phalanxduel/shared` (Zod schemas + `computeTurnHash`), bcryptjs, TypeScript 5.9, Vitest 4

---

## File Map

### Game server additions

| File | Change |
|---|---|
| `server/src/db/schema.ts` | Add `is_admin` column to `users`; add `adminAuditLog` table |
| `server/drizzle/0004_admin_schema.sql` | Generated migration (`db:generate` after schema change) |
| `server/src/middleware/internal-auth.ts` | New — validates `ADMIN_INTERNAL_TOKEN` Bearer header |
| `server/src/routes/internal.ts` | New — `POST /internal/matches` endpoint |
| `server/src/app.ts` | Register internal route |
| `server/tests/internal.test.ts` | New — tests for internal endpoint |

### New `admin/` package

```text
admin/
  package.json
  tsconfig.json
  vite.config.ts
  fly.toml
  src/
    server/
      index.ts               -- Fastify entry; serves SPA dist
      middleware/
        auth.ts              -- JWT cookie verify + is_admin DB check
      routes/
        login.ts             -- POST /admin-api/auth/login (proxy to game server)
        matches.ts           -- match list, match detail
        users.ts             -- user list, detail, password reset, admin toggle
        reports.ts           -- parameterised report queries
    client/
      index.html
      style.css
      main.tsx               -- SPA entry + simple hash router
      pages/
        Login.tsx
        Dashboard.tsx
        MatchDetail.tsx
        MatchCreator.tsx
        UserList.tsx
        UserDetail.tsx
        Reports.tsx
      components/
        DataTable.tsx
        SqlBlock.tsx
        StatBadge.tsx
        IntegrityBadge.tsx
      hooks/
        useApi.ts            -- typed fetch wrapper
  tests/
    middleware.test.ts
    routes/
      matches.test.ts
      users.test.ts
```

### pnpm workspace

| File | Change |
|---|---|
| `pnpm-workspace.yaml` | Add `admin` to packages list |

---

## Chunk 1: DB Migrations + Game Server Internal Endpoint

### Task 1: DB schema additions and migration

**Files:**
- Modify: `server/src/db/schema.ts`
- Create: `server/drizzle/0004_admin_schema.sql` (generated)

- [ ] **Step 1: Add `is_admin` to `users` in schema.ts**

Add `boolean` to the drizzle-orm import and add the column inside the `users` table object (after `updatedAt`):

```typescript
import {
  pgTable, uuid, text, timestamp, jsonb, integer, uniqueIndex, index,
  boolean,  // add this
} from 'drizzle-orm/pg-core';

// Inside users table, after updatedAt:
isAdmin: boolean('is_admin').default(false).notNull(),
```

- [ ] **Step 2: Add `adminAuditLog` table to schema.ts**

After the `eloSnapshots` table definition, add:

```typescript
export const adminAuditLog = pgTable('admin_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id).notNull(),
  action: text('action', {
    enum: ['create_match', 'reset_password', 'toggle_admin'],
  }).notNull(),
  targetId: uuid('target_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

- [ ] **Step 3: Generate migration**

```bash
rtk pnpm --filter @phalanxduel/server db:generate
```

Expected: creates `server/drizzle/0004_<name>.sql`

- [ ] **Step 4: Verify migration SQL**

Read the generated file. Confirm it contains the `ALTER TABLE "users" ADD COLUMN "is_admin"` statement and the `CREATE TABLE "admin_audit_log"` block. If drizzle-kit does not generate a CHECK constraint for the action enum, manually add to the SQL file:

```sql
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_action_check"
  CHECK (action IN ('create_match', 'reset_password', 'toggle_admin'));
```

- [ ] **Step 5: Commit**

```bash
git add server/src/db/schema.ts server/drizzle/
git commit -m "feat(db): add users.is_admin and admin_audit_log table (TASK-47)"
```

---

### Task 2: Internal auth middleware

**Files:**
- Create: `server/src/middleware/internal-auth.ts`

- [ ] **Step 1: Create middleware**

Create `server/src/middleware/internal-auth.ts`:

```typescript
import { timingSafeEqual } from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Validates the ADMIN_INTERNAL_TOKEN Bearer header.
 * Uses timing-safe comparison to resist timing attacks.
 * Returns true if valid; sends the error response and returns false otherwise.
 */
export function validateInternalToken(request: FastifyRequest, reply: FastifyReply): boolean {
  const expected = process.env['ADMIN_INTERNAL_TOKEN'];
  if (!expected) {
    void reply.status(503).send({ error: 'Internal endpoint not configured', code: 'NOT_CONFIGURED' });
    return false;
  }

  const header = request.headers['authorization'];
  const match = /^Bearer\s+(.+)$/.exec(header ?? '');
  if (!match) {
    void reply.status(401).send({ error: 'Missing Bearer token', code: 'UNAUTHORIZED' });
    return false;
  }

  const provided = match[1]!;
  const MAX = 512;
  const buf1 = Buffer.alloc(MAX);
  const buf2 = Buffer.alloc(MAX);
  buf1.write(provided.slice(0, MAX), 'utf8');
  buf2.write(expected.slice(0, MAX), 'utf8');

  if (!timingSafeEqual(buf1, buf2)) {
    void reply.status(401).send({ error: 'Invalid token', code: 'UNAUTHORIZED' });
    return false;
  }

  return true;
}
```

---

### Task 3: POST /internal/matches route

**Files:**
- Create: `server/src/routes/internal.ts`
- Create: `server/tests/internal.test.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Write failing tests**

Create `server/tests/internal.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';

describe('POST /internal/matches — auth', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/internal/matches',
      payload: { playerName: 'Admin', opponent: 'bot-random' },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('returns 401 when token is wrong', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/internal/matches',
      headers: { authorization: 'Bearer wrong-token' },
      payload: { playerName: 'Admin', opponent: 'bot-random' },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('returns 201 with matchId when ADMIN_INTERNAL_TOKEN is correct', async () => {
    process.env['ADMIN_INTERNAL_TOKEN'] = 'test-token-abc';
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/internal/matches',
      headers: { authorization: 'Bearer test-token-abc' },
      payload: { playerName: 'Admin', opponent: 'bot-random' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ matchId: expect.any(String) });
    delete process.env['ADMIN_INTERNAL_TOKEN'];
    await app.close();
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
rtk pnpm --filter @phalanxduel/server test -- --reporter=verbose internal
```

Expected: FAIL — route `/internal/matches` returns 404

- [ ] **Step 3: Create the route**

Create `server/src/routes/internal.ts`:

```typescript
import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import { z } from 'zod';
import { validateInternalToken } from '../middleware/internal-auth.js';
import type { MatchManager } from '../match.js';

const CreateMatchBodySchema = z.object({
  playerName: z.string().min(1).max(50),
  opponent: z.enum(['bot-random', 'human']),
  matchParams: z.object({
    rows: z.number().int().min(1).max(12).optional(),
    columns: z.number().int().min(1).max(12).optional(),
    maxHandSize: z.number().int().min(0).optional(),
  }).optional(),
  gameOptions: z.object({
    damageMode: z.enum(['classic', 'cumulative']).optional(),
    startingLifepoints: z.number().int().min(1).max(500).optional(),
  }).optional(),
  rngSeed: z.number().optional(),
  userId: z.string().uuid().optional(),
});

/**
 * Returns a WebSocket-shaped object that silently discards all messages.
 * Used for admin-initiated matches where no player socket is available.
 * readyState=3 (CLOSED) causes MatchManager to skip all sends.
 */
function makeNullSocket(): WebSocket {
  return {
    readyState: 3,
    send: () => {},
    on: () => {},
    close: () => {},
  } as unknown as WebSocket;
}

export function registerInternalRoutes(fastify: FastifyInstance, matchManager: MatchManager) {
  fastify.post<{ Body: unknown }>('/internal/matches', async (request, reply) => {
    if (!validateInternalToken(request, reply)) return;

    const parsed = CreateMatchBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid body', code: 'VALIDATION_ERROR' });
    }

    const { playerName, opponent, matchParams, gameOptions, rngSeed, userId } = parsed.data;

    if (opponent === 'human') {
      const { matchId } = matchManager.createPendingMatch();
      return reply.status(201).send({ matchId });
    }

    // Bot match: initialize headlessly using a null socket for P1.
    // Bot turns fire via scheduleBotTurn; results are persisted to DB.
    const { matchId } = matchManager.createMatch(playerName, makeNullSocket(), {
      gameOptions,
      rngSeed,
      matchParams,
      userId,
      botOptions: {
        opponent: 'bot-random',
        botConfig: { strategy: 'random', seed: rngSeed ?? Date.now() },
      },
    });

    return reply.status(201).send({ matchId });
  });
}
```

- [ ] **Step 4: Register route in app.ts**

In `server/src/app.ts`, add the import:

```typescript
import { registerInternalRoutes } from './routes/internal.js';
```

Inside `buildApp()`, after the other `register*Routes` calls:

```typescript
registerInternalRoutes(app, matchManager);
```

- [ ] **Step 5: Run tests**

```bash
rtk pnpm --filter @phalanxduel/server test -- --reporter=verbose internal
```

Expected: all 3 tests PASS

- [ ] **Step 6: Run full server test suite**

```bash
rtk pnpm --filter @phalanxduel/server test
```

Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add server/src/middleware/internal-auth.ts server/src/routes/internal.ts \
        server/src/app.ts server/tests/internal.test.ts
git commit -m "feat(server): POST /internal/matches with ADMIN_INTERNAL_TOKEN auth (TASK-47)"
```

---

## Chunk 2: Admin Package Scaffold + Auth

### Task 4: Package scaffold

**Files:**
- Modify: `pnpm-workspace.yaml`
- Create: `admin/package.json`, `admin/tsconfig.json`, `admin/vite.config.ts`

- [ ] **Step 1: Add admin to workspace**

In `pnpm-workspace.yaml`, add `- admin` to the packages list.

- [ ] **Step 2: Create admin/package.json**

```json
{
  "name": "@phalanxduel/admin",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "concurrently \"tsx watch src/server/index.ts\" \"vite\"",
    "build": "vite build && tsc --noEmit",
    "start": "node dist/server/index.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "@fastify/cookie": "^11.0.2",
    "@fastify/jwt": "^10.0.0",
    "@fastify/static": "^9.0.0",
    "@phalanxduel/shared": "workspace:*",
    "bcryptjs": "^3.0.3",
    "drizzle-orm": "^0.45.1",
    "fastify": "^5.8.2",
    "postgres": "^3.4.8",
    "preact": "^10.26.2",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@preact/preset-vite": "^2.10.1",
    "concurrently": "^9.1.2",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3",
    "vite": "^6.3.5",
    "vitest": "^4.1.0"
  }
}
```

- [ ] **Step 3: Create admin/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: Create admin/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  root: 'src/client',
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/admin-api': 'http://127.0.0.1:3002',
    },
  },
});
```

- [ ] **Step 5: Install dependencies**

```bash
rtk pnpm install
```

- [ ] **Step 6: Commit scaffold**

```bash
git add pnpm-workspace.yaml admin/package.json admin/tsconfig.json admin/vite.config.ts
git commit -m "chore(admin): scaffold admin package (TASK-47)"
```

---

### Task 5: Admin Fastify server entry

**Files:**
- Create: `admin/src/server/db.ts`
- Create: `admin/src/server/index.ts`

- [ ] **Step 1: Create DB connection**

Create `admin/src/server/db.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL is required');

export const client = postgres(connectionString);
export const db = drizzle(client);
```

- [ ] **Step 2: Create Fastify entry**

Create `admin/src/server/index.ts`. This is the main entry point — it:

1. Registers `@fastify/cookie` and `@fastify/jwt` with the shared `JWT_SECRET`
2. Registers all four route modules (login, matches, users, reports)
3. Serves the Vite-built SPA from `dist/client/` when present
4. Falls back to `index.html` for all unmatched GET routes (SPA routing)

```typescript
/**
 * Required env vars:
 *   DATABASE_URL             — Neon Postgres connection string
 *   JWT_SECRET               — Shared with game server
 *   GAME_SERVER_INTERNAL_URL — e.g. http://phalanxduel.internal:3001
 *   ADMIN_INTERNAL_TOKEN     — Secret for POST /internal/matches
 * Optional:
 *   PORT                     — Default: 3002
 *   NODE_ENV                 — 'production' | 'development' | 'test'
 */
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';
import { registerLoginRoute } from './routes/login.js';
import { registerMatchRoutes } from './routes/matches.js';
import { registerUserRoutes } from './routes/users.js';
import { registerReportRoutes } from './routes/reports.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function buildAdminApp() {
  const app = Fastify({ logger: process.env['NODE_ENV'] !== 'test' });

  await app.register(fastifyCookie);
  await app.register(fastifyJwt, {
    secret: process.env['JWT_SECRET'] ?? 'phalanx-dev-secret',
    cookie: { cookieName: 'admin_token', signed: false },
  });

  registerLoginRoute(app);
  registerMatchRoutes(app);
  registerUserRoutes(app);
  registerReportRoutes(app);

  const clientDist = resolve(__dirname, '../../dist/client');
  if (existsSync(clientDist)) {
    await app.register(fastifyStatic, { root: clientDist, prefix: '/' });
    app.setNotFoundHandler((_req, reply) => void reply.sendFile('index.html'));
  }

  return app;
}

async function main() {
  const app = await buildAdminApp();
  const port = parseInt(process.env['PORT'] ?? '3002', 10);
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Admin service listening on port ${port}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
```

---

### Task 6: Auth middleware + login route

**Files:**
- Create: `admin/src/server/middleware/auth.ts`
- Create: `admin/src/server/routes/login.ts`

- [ ] **Step 1: Create auth middleware**

Create `admin/src/server/middleware/auth.ts`:

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db.js';
import { sql } from 'drizzle-orm';

export interface AdminUser {
  id: string;
  gamertag: string;
  suffix: number | null;
}

/**
 * Verifies the admin_token cookie contains a valid JWT,
 * then confirms users.is_admin = true in the DB.
 * Returns the user payload, or sends 401/403 and returns null.
 */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AdminUser | null> {
  let payload: AdminUser;

  try {
    payload = request.server.jwt.verify(
      request.cookies['admin_token'] ?? '',
    ) as AdminUser;
  } catch {
    void reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    return null;
  }

  const rows = await db.run(
    sql`SELECT is_admin FROM users WHERE id = ${payload.id} LIMIT 1`,
  );

  if (!rows[0] || !(rows[0] as { is_admin: boolean }).is_admin) {
    void reply.status(403).send({ error: 'Forbidden — not an admin', code: 'FORBIDDEN' });
    return null;
  }

  return payload;
}
```

- [ ] **Step 2: Create login route**

Create `admin/src/server/routes/login.ts`:

```typescript
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string(),
});

export function registerLoginRoute(fastify: FastifyInstance) {
  fastify.post<{ Body: unknown }>('/admin-api/auth/login', async (request, reply) => {
    const parsed = LoginBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid credentials format', code: 'VALIDATION_ERROR' });
    }

    const gameServerUrl = process.env['GAME_SERVER_INTERNAL_URL'] ?? 'http://127.0.0.1:3001';

    let upstream: Response;
    try {
      upstream = await fetch(`${gameServerUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
    } catch {
      return reply.status(502).send({ error: 'Game server unreachable', code: 'UPSTREAM_ERROR' });
    }

    if (!upstream.ok) {
      return reply.status(upstream.status).send(await upstream.json().catch(() => ({})));
    }

    const { token } = (await upstream.json()) as { token: string };

    let payload: { id: string; gamertag: string; suffix: number | null };
    try {
      payload = fastify.jwt.verify(token) as typeof payload;
    } catch {
      return reply.status(401).send({ error: 'Invalid token from game server', code: 'UNAUTHORIZED' });
    }

    void reply.setCookie('admin_token', token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return reply.status(200).send({ ok: true, gamertag: payload.gamertag, suffix: payload.suffix });
  });

  fastify.post('/admin-api/auth/logout', async (_request, reply) => {
    void reply.clearCookie('admin_token', { path: '/' });
    return reply.status(200).send({ ok: true });
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add admin/src/server/
git commit -m "feat(admin): Fastify server, DB connection, auth middleware, login proxy (TASK-47)"
```

---

## Chunk 3: Admin API Routes

### Task 7: Matches routes

**Files:**
- Create: `admin/src/server/routes/matches.ts`
- Create: `admin/tests/routes/matches.test.ts`

- [ ] **Step 1: Write failing test**

Create `admin/tests/routes/matches.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { buildAdminApp } from '../../src/server/index.js';

vi.mock('../../src/server/middleware/auth.js', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id', gamertag: 'admin', suffix: 1 }),
}));
vi.mock('../../src/server/db.js', () => ({
  db: { run: vi.fn().mockResolvedValue([]) },
}));

describe('GET /admin-api/matches', () => {
  it('returns 401 when not authenticated', async () => {
    const { requireAdmin } = await import('../../src/server/middleware/auth.js');
    vi.mocked(requireAdmin).mockResolvedValueOnce(null);
    const app = await buildAdminApp();
    const res = await app.inject({ method: 'GET', url: '/admin-api/matches' });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('returns 200 with array when authenticated', async () => {
    const app = await buildAdminApp();
    const res = await app.inject({ method: 'GET', url: '/admin-api/matches' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toBeInstanceOf(Array);
    await app.close();
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
rtk pnpm --filter @phalanxduel/admin test -- --reporter=verbose matches
```

- [ ] **Step 3: Create matches routes**

Create `admin/src/server/routes/matches.ts` with three routes:

**GET /admin-api/matches** — Accepts `?status=active|completed|all&limit=50`. Queries the `matches` table with a status filter and returns id, player names, bot_strategy, status, outcome, timestamps, and verified_turns / total_turns counts (JSON path queries on `transaction_log` JSONB to count entries with/without turnHash).

**GET /admin-api/matches/:matchId** — Returns the full match row including `transaction_log`, `event_log`, `event_log_fingerprint`, `config`, and `state`.

**POST /admin-api/matches** — Proxies to `GAME_SERVER_INTERNAL_URL/internal/matches` with `Authorization: Bearer ADMIN_INTERNAL_TOKEN`. On success, records to `admin_audit_log`. Returns the game server's response (201 + `{ matchId }`).

Use Drizzle's `sql` tagged template with `db.run()` for all queries (same pattern as `server/src/db/index.ts`). All routes call `requireAdmin(request, reply)` first and return early if null.

- [ ] **Step 4: Run tests — verify PASS**

```bash
rtk pnpm --filter @phalanxduel/admin test -- --reporter=verbose matches
```

- [ ] **Step 5: Commit**

```bash
git add admin/src/server/routes/matches.ts admin/tests/routes/matches.test.ts
git commit -m "feat(admin): match list, detail, and create routes (TASK-47)"
```

---

### Task 8: Users routes

**Files:**
- Create: `admin/src/server/routes/users.ts`
- Create: `admin/tests/routes/users.test.ts`

- [ ] **Step 1: Write failing tests**

Create `admin/tests/routes/users.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { buildAdminApp } from '../../src/server/index.js';

vi.mock('../../src/server/middleware/auth.js', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-id', gamertag: 'admin', suffix: 1 }),
}));
vi.mock('../../src/server/db.js', () => ({
  db: { run: vi.fn().mockResolvedValue([]) },
}));

describe('PATCH /admin-api/users/:userId/admin', () => {
  it('returns 400 when actor tries to modify their own admin flag', async () => {
    const app = await buildAdminApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin-api/users/admin-id/admin',
      payload: { isAdmin: false },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { code: string };
    expect(body.code).toBe('SELF_REVOCATION_FORBIDDEN');
    await app.close();
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
rtk pnpm --filter @phalanxduel/admin test -- --reporter=verbose users
```

- [ ] **Step 3: Create users routes**

Create `admin/src/server/routes/users.ts` with four routes:

**GET /admin-api/users** — Paginated (`?limit=50&offset=0`). JOINs `matches` to compute `match_count` and `last_match_at` aggregations at query time (no denormalized columns). Returns id, gamertag, suffix, email, elo, is_admin, created_at, match_count, last_match_at.

**GET /admin-api/users/:userId** — Returns `{ user, matches, snapshots }`. `matches` = last 50 from `matches` table where player_1_id or player_2_id = userId. `snapshots` = all rows from `elo_snapshots` for the user.

**POST /admin-api/users/:userId/reset-password** — Uses `bcryptjs.hash()` to hash a random 16-char hex token, updates `users.password_hash`, writes to `admin_audit_log`. Returns `{ tempPassword }` (shown once).

**PATCH /admin-api/users/:userId/admin** — Self-revocation guard: if `userId === admin.id`, return 400 with `SELF_REVOCATION_FORBIDDEN`. Updates `users.is_admin`, writes to `admin_audit_log`.

- [ ] **Step 4: Run tests — verify PASS**

```bash
rtk pnpm --filter @phalanxduel/admin test -- --reporter=verbose users
```

- [ ] **Step 5: Commit**

```bash
git add admin/src/server/routes/users.ts admin/tests/routes/users.test.ts
git commit -m "feat(admin): user list, detail, password reset, admin toggle (TASK-47)"
```

---

### Task 9: Reports routes

**Files:**
- Create: `admin/src/server/routes/reports.ts`

Reports use a whitelist pattern — all SQL is built server-side from a `REPORTS` array. User-supplied params are validated before interpolation:
- `select` params: only values in `options[]` are accepted; anything else falls back to `default`
- `number` params: only integer values accepted (via `parseInt`); anything else falls back to `default`

This prevents injection even though the final SQL is rendered as a string.

- [ ] **Step 1: Create reports route**

Create `admin/src/server/routes/reports.ts`. Define a `REPORTS` array (constant, server-side only) with the 10 pre-built reports from the spec:

**Matches category:**
1. Match history (params: status select, opponent select, limit number)
2. Victory type breakdown
3. Turn length distribution
4. Cancelled / abandoned (param: limit)

**Players category:**
5. Win / loss by player (param: limit)
6. Elo progression (param: limit)
7. Human vs bot record

**Integrity category:**
8. turnHash sweep (finds matches with transaction log entries missing turnHash)
9. Fingerprint audit (matches with event_log but no event_log_fingerprint)
10. Missing event logs (completed matches with null event_log)

Each entry has: `id`, `name`, `description`, `category`, `params[]`, `buildSql(params)`.

Register three routes:

**GET /admin-api/reports** — returns the list without `buildSql` (not serializable).

**GET /admin-api/reports/:reportId/sql** — validates params from query string, calls `buildSql`, returns `{ sql: string }`.

**POST /admin-api/reports/:reportId/run** — validates params from body, calls `buildSql`, runs the SQL with a timing wrapper. Returns `{ rows, rowCount, durationMs, sql }`. Use `db.run(sql.raw(renderedSql))` — safe here because all user params are validated against whitelists before interpolation.

- [ ] **Step 2: Commit**

```bash
git add admin/src/server/routes/reports.ts
git commit -m "feat(admin): 10 pre-built reports with SQL rendering (TASK-47)"
```

---

## Chunk 4: Admin SPA

### Task 10: SPA shell + shared components

**Files:**
- Create: `admin/src/client/index.html`
- Create: `admin/src/client/style.css`
- Create: `admin/src/client/hooks/useApi.ts`
- Create: `admin/src/client/main.tsx`
- Create: `admin/src/client/components/DataTable.tsx`
- Create: `admin/src/client/components/SqlBlock.tsx`
- Create: `admin/src/client/components/StatBadge.tsx`
- Create: `admin/src/client/components/IntegrityBadge.tsx`

- [ ] **Step 1: Create index.html** (standard Vite HTML entry, links to `./style.css` and `./main.tsx`)

- [ ] **Step 2: Create style.css**

Dark theme with CSS custom properties:
```css
:root {
  --bg: #111; --surface: #1a1a1a; --surface2: #222; --border: #2a2a2a;
  --text: #e0e0e0; --text-muted: #555; --text-dim: #888;
  --accent: #e8c547; --green: #4caf50; --red: #e74c3c; --blue: #4a9eff;
}
```
Classes needed: `.nav`, `.page`, `.page-title`, `.page-subtitle`, `.card`, `.card-title`, `.badge-ok`, `.badge-fail`, `.badge-pending`, `.mono`. Style `table`, `th`, `td`, `button`, `input`, `select`, `a`.

- [ ] **Step 3: Create hooks/useApi.ts**

Two exports:
- `useApi<T>(url, deps?)` — Preact hook that fetches on mount/deps change, redirects to `#/login` on 401, returns `{ data, loading, error }`
- `apiPost<T>(url, body)` — one-shot POST returning `{ data?, error? }`
- `apiPatch<T>(url, body)` — one-shot PATCH returning `{ data?, error? }`

- [ ] **Step 4: Create main.tsx**

Hash router using `window.location.hash` + `hashchange` event listener. Routes:
- `#/` → `<Dashboard />`
- `#/login` → `<Login />` (no nav)
- `#/matches/new` → `<MatchCreator />`
- `#/matches/:id` → `<MatchDetail matchId={id} />`
- `#/users` → `<UserList />`
- `#/users/:id` → `<UserDetail userId={id} />`
- `#/reports` → `<Reports />`

Nav bar shows: brand mark, Dashboard, New Match, Users, Reports links with `.active` class on current route.

- [ ] **Step 5: Create components**

**DataTable.tsx** — generic `<DataTable columns rows keyFn />` component. Each column has `key`, `label`, optional `render` function. Renders a `<table>` with the shared table styles.

**SqlBlock.tsx** — shows syntax-highlighted SQL in a `<pre>` block with a Copy button. Highlight SQL keywords (`SELECT`, `FROM`, `WHERE`, etc.) in `#569cd6`, string literals in `#ce9178`, numbers in `#b5cea8` using regex replace + `dangerouslySetInnerHTML`.

**StatBadge.tsx** — `<StatBadge label value color? />` renders a card with large value and small muted label.

**IntegrityBadge.tsx** — `<IntegrityBadge ok expected? actual? />` renders ✓ in green or ✗ in red with a tooltip showing truncated expected/actual hashes when `ok=false`.

- [ ] **Step 6: Commit**

```bash
git add admin/src/client/
git commit -m "feat(admin): SPA shell, hash router, shared components (TASK-47)"
```

---

### Task 11: SPA pages

**Files:**
- Create: `admin/src/client/pages/Login.tsx`
- Create: `admin/src/client/pages/Dashboard.tsx`
- Create: `admin/src/client/pages/MatchCreator.tsx`
- Create: `admin/src/client/pages/MatchDetail.tsx`
- Create: `admin/src/client/pages/UserList.tsx`
- Create: `admin/src/client/pages/UserDetail.tsx`
- Create: `admin/src/client/pages/Reports.tsx`

- [ ] **Step 1: Login.tsx**

Form with email + password fields. On submit, calls `apiPost('/admin-api/auth/login', { email, password })`. On success, sets `window.location.hash = '#/'`. On failure, shows inline error.

- [ ] **Step 2: Dashboard.tsx**

Fetches active matches (`/admin-api/matches?status=active`) and recent matches (`/admin-api/matches?status=completed&limit=20`) in parallel. Also fetches `/admin-api/users` to get total user count. Shows **four** `<StatBadge>` tiles: active count, today's match count (completed matches where `created_at >= today`), total user count, bot match percentage. Two `<DataTable>` sections: Live Matches (match ID link, players, bot, started-ago) and Recent Matches (match ID link, winner, victory type, turns, `<IntegrityBadge ok={verifiedTurns === totalTurns} />`, ended-ago). Polls every 30 seconds using `setInterval` in a `useEffect`.

- [ ] **Step 3: MatchCreator.tsx**

Form layout matching the wireframe from the spec. State fields: `playerName`, `opponent` (bot-random | human), `rows`, `columns`, `maxHandSize`, `damageMode`, `startingLifepoints`, `rngSeed`.

Key behaviors:
- `initialDraw` is computed (`rows × columns + columns`), read-only
- `totalSlots = rows × columns`; warn in red if > 48
- Opponent toggle buttons: Bot Random (selectable), Bot Heuristic (disabled, tooltip "Not yet implemented"), Human (selectable)
- Preview panel (right column, sticky) shows live JSON payload
- On submit: validates totalSlots ≤ 48, maxHandSize ≤ columns; calls `apiPost('/admin-api/matches', payload)`; on success, redirects to `#/matches/:matchId`

- [ ] **Step 4: MatchDetail.tsx**

Fetches `/admin-api/matches/:matchId`. Renders a header card (match ID, status, players, winner/victory/turns). Tabbed interface using local state:

- **Overview tab:** Two-column grid — Integrity card (turnHash count from `transaction_log`, event log fingerprint check) and Outcome card (KV list from `outcome` JSON).
- **Transaction Log tab:** Full `transaction_log` array as a table. Columns: `#`, Action (DSL notation using helper function `actionDsl(entry.action)`), Phase after (last element of `phaseTrace`), stateHash (truncated), turnHash (truncated), integrity check. Import `computeTurnHash` from `@phalanxduel/shared/hash`. For each entry that has a `turnHash` stored, use `<IntegrityBadge ok={!!entry.turnHash} />` as a presence check. The full re-derivation check (re-computing `computeTurnHash(entry.stateHashAfter, eventIds)`) requires event IDs that are not available per-entry without the event log — direct implementers to use the "turnHash sweep" report for full re-derivation, and note this limitation inline in the tab.
- **Event Log tab:** Full `event_log.events` array as a table. Columns: id (truncated), type, name, timestamp, status.
- **Config tab:** `JSON.stringify(match.config, null, 2)` in a `<pre>`.

DSL notation helper:
```typescript
function actionDsl(action): string {
  if (action.type === 'deploy') return `A:${action.column}:${String(action.cardId).slice(0,6)}`;
  if (action.type === 'discard') return `D:${action.column}:${String(action.cardId).slice(0,6)}`;
  if (action.type === 'reinforcement') return `R:${String(action.cardId).slice(0,6)}`;
  if (action.type === 'pass') return 'P';
  if (action.type === 'forfeit') return 'F';
  return action.type;
}
```

- [ ] **Step 5: UserList.tsx**

Fetches `/admin-api/users`. Renders a `<DataTable>` with columns: Gamertag (link to UserDetail), Email, Elo, Match count, Last match date, Admin flag (✓ or —).

- [ ] **Step 6: UserDetail.tsx**

Fetches `/admin-api/users/:userId`. Renders:
- Header with gamertag, email, Elo, join date
- Action buttons: "Reset password" (calls `apiPost`, shows temp password in a once-visible block), "Grant/Revoke admin" (calls `apiPatch`, hides itself when viewing own account)
- Elo Snapshots table (category, elo, kFactor, windowDays, matchesInWindow, winsInWindow, computedAt)
- Match History table (last 50 matches, each linking to MatchDetail)

- [ ] **Step 7: Reports.tsx**

Fetches `/admin-api/reports` for the sidebar list. Left sidebar lists reports grouped by category (matches, players, integrity). Clicking a report:
1. Sets selected report in state, initializes param state from `report.params[].default`
2. Fetches rendered SQL from `/admin-api/reports/:id/sql?...params` (live, updates as params change)
3. Shows `<SqlBlock>` with the rendered SQL
4. "Run" button calls `apiPost('/admin-api/reports/:id/run', params)`
5. Shows result table with row count, query time, Export CSV button
6. Match ID cells in results link to `#/matches/:id`

- [ ] **Step 8: Commit**

```bash
git add admin/src/client/pages/
git commit -m "feat(admin): all 7 SPA pages (TASK-47)"
```

---

## Chunk 5: Deployment + Final Verification

### Task 12: Deployment config

**Files:**
- Create: `admin/fly.toml`

- [ ] **Step 1: Create fly.toml**

```toml
app = "phalanxduel"
primary_region = "ord"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3002
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  size = "shared-cpu-1x"
  memory = "256mb"
```

> The admin app has no public hostname. Access via `fly proxy 3002 --app phalanxduel`. Fly.io secrets required: `DATABASE_URL`, `JWT_SECRET`, `GAME_SERVER_INTERNAL_URL`, `ADMIN_INTERNAL_TOKEN`.

- [ ] **Step 2: Apply migration to your dev DB**

```bash
rtk pnpm --filter @phalanxduel/server db:migrate
```

Expected: `users.is_admin` column added, `admin_audit_log` table created

- [ ] **Step 3: Final typecheck**

```bash
rtk pnpm --filter @phalanxduel/server typecheck
rtk pnpm --filter @phalanxduel/admin typecheck
```

Expected: no errors

- [ ] **Step 4: Run all tests**

```bash
rtk pnpm -r test
```

Expected: all packages pass

- [ ] **Step 5: Dev smoke test**

```bash
# Terminal 1: game server (must be running)
rtk pnpm --filter @phalanxduel/server dev

# Terminal 2: admin service
rtk pnpm --filter @phalanxduel/admin dev
```

Navigate to `http://127.0.0.1:5173` (Vite dev server, proxies `/admin-api` to port 3002). Log in with an admin account. Verify: Dashboard loads, New Match form submits, Match Detail shows tabs, Reports render SQL.

- [ ] **Step 6: Final commit**

```bash
git add admin/fly.toml
git commit -m "feat(admin): deployment config and final integration (TASK-47)"
```

---

## Implementation Checklist

Before marking TASK-47 complete:

- [ ] `server/drizzle/0004_admin_schema.sql` generated, committed, and applied to dev DB
- [ ] `POST /internal/matches` returns 401 for missing/wrong token, 201 for correct token
- [ ] Login proxy sets `admin_token` httpOnly cookie; non-admin users get 403
- [ ] Self-revocation guard returns 400 with `SELF_REVOCATION_FORBIDDEN`
- [ ] All 10 reports render SQL and execute without errors
- [ ] Match IDs in report results link to Match Detail
- [ ] Bot Heuristic button in MatchCreator is disabled with "Not yet implemented" tooltip
- [ ] `pnpm -r test` passes (all packages)
- [ ] `pnpm --filter @phalanxduel/admin typecheck` passes
- [ ] `pnpm --filter @phalanxduel/server typecheck` passes
- [ ] Dev smoke test: login → Dashboard → New Match → Match Detail → Reports all functional
