# Gamertag System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the free-text `name` field with an Xbox-inspired gamertag identity system featuring sequential collision suffixes, content filtering, a 7-day change cooldown, and optional profile fields (favorite suit, tagline, avatar icon).

**Architecture:** Server-authoritative gamertag with normalized collision detection. A shared `formatGamertag()` helper renders display names. Content filter uses a server-side blocklist against normalized forms. Registration and gamertag-change share the same validation/suffix-assignment logic via a transactional helper. Optional profile fields are editable via a profile update endpoint.

**Tech Stack:** Drizzle ORM (Postgres), Fastify, Zod, Vitest, Preact (client components)

---

### Task 1: Shared formatGamertag Helper

**Files:**
- Create: `shared/src/gamertag.ts`
- Modify: `shared/src/index.ts`
- Create: `shared/tests/gamertag.test.ts`

#### Step 1: Write the failing test

```typescript
// shared/tests/gamertag.test.ts
import { describe, it, expect } from 'vitest';
import { formatGamertag } from '../src/gamertag';

describe('formatGamertag', () => {
  it('returns gamertag without suffix when suffix is null', () => {
    expect(formatGamertag('Dragon', null)).toBe('Dragon');
  });

  it('returns gamertag with suffix when suffix is provided', () => {
    expect(formatGamertag('Dragon', 3)).toBe('Dragon#3');
  });

  it('returns gamertag with suffix 1', () => {
    expect(formatGamertag('Dragon Slayer', 1)).toBe('Dragon Slayer#1');
  });
});
```

#### Step 2: Run test to verify it fails

Run: `rtk pnpm -r --filter @phalanxduel/shared test`
Expected: FAIL with "formatGamertag is not a function" or module not found

#### Step 3: Write minimal implementation

```typescript
// shared/src/gamertag.ts
export function formatGamertag(gamertag: string, suffix: number | null): string {
  return suffix != null ? `${gamertag}#${suffix}` : gamertag;
}
```

#### Step 4: Export from shared index

Add to `shared/src/index.ts`:

```typescript
export * from './gamertag.js';
```

#### Step 5: Run test to verify it passes

Run: `rtk pnpm -r --filter @phalanxduel/shared test`
Expected: PASS

#### Step 6: Commit

```bash
rtk git add shared/src/gamertag.ts shared/src/index.ts shared/tests/gamertag.test.ts
rtk git commit -m "feat(shared): add formatGamertag helper"
```

---

### Task 2: Gamertag Validation & Normalization (Shared)

**Files:**
- Modify: `shared/src/gamertag.ts`
- Modify: `shared/tests/gamertag.test.ts`

#### Step 1: Write the failing tests

```typescript
// Add to shared/tests/gamertag.test.ts
import { normalizeGamertag, validateGamertag } from '../src/gamertag';

describe('normalizeGamertag', () => {
  it('lowercases and strips spaces, hyphens, underscores', () => {
    expect(normalizeGamertag('Dragon_Slayer')).toBe('dragonslayer');
    expect(normalizeGamertag('dragon slayer')).toBe('dragonslayer');
    expect(normalizeGamertag('Dragon-Slayer')).toBe('dragonslayer');
    expect(normalizeGamertag('DragonSlayer')).toBe('dragonslayer');
  });
});

describe('validateGamertag', () => {
  it('accepts valid gamertags', () => {
    expect(validateGamertag('Dragon')).toEqual({ ok: true });
    expect(validateGamertag('Cool Name 123')).toEqual({ ok: true });
    expect(validateGamertag('a-b_c')).toEqual({ ok: true });
    expect(validateGamertag('abc')).toEqual({ ok: true }); // min length
  });

  it('rejects too short', () => {
    expect(validateGamertag('ab')).toEqual({ ok: false, reason: 'Gamertag must be 3-20 characters' });
  });

  it('rejects too long', () => {
    expect(validateGamertag('a'.repeat(21))).toEqual({ ok: false, reason: 'Gamertag must be 3-20 characters' });
  });

  it('rejects non-ASCII characters', () => {
    expect(validateGamertag('Dräg0n')).toEqual({ ok: false, reason: 'Only letters, numbers, spaces, hyphens, and underscores allowed' });
  });

  it('rejects no letters', () => {
    expect(validateGamertag('123')).toEqual({ ok: false, reason: 'Must contain at least one letter' });
  });

  it('rejects leading/trailing whitespace', () => {
    expect(validateGamertag(' Dragon')).toEqual({ ok: false, reason: 'No leading or trailing whitespace' });
    expect(validateGamertag('Dragon ')).toEqual({ ok: false, reason: 'No leading or trailing whitespace' });
  });

  it('rejects consecutive spaces', () => {
    expect(validateGamertag('Dragon  Slayer')).toEqual({ ok: false, reason: 'No consecutive spaces' });
  });
});
```

#### Step 2: Run tests to verify they fail

Run: `rtk pnpm -r --filter @phalanxduel/shared test`
Expected: FAIL

#### Step 3: Write minimal implementation

```typescript
// Add to shared/src/gamertag.ts

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
  if (/  /.test(gamertag)) {
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
```

#### Step 4: Run tests to verify they pass

Run: `rtk pnpm -r --filter @phalanxduel/shared test`
Expected: PASS

#### Step 5: Commit

```bash
rtk git add shared/src/gamertag.ts shared/tests/gamertag.test.ts
rtk git commit -m "feat(shared): add gamertag validation and normalization"
```

---

### Task 3: Content Filter (Server-Side)

**Files:**
- Create: `server/src/content-filter.ts`
- Create: `server/tests/content-filter.test.ts`

#### Step 1: Write the failing tests

```typescript
// server/tests/content-filter.test.ts
import { describe, it, expect } from 'vitest';
import { isBlockedGamertag } from '../src/content-filter';

describe('isBlockedGamertag', () => {
  it('blocks profanity', () => {
    expect(isBlockedGamertag('shithead')).toBe(true);
    expect(isBlockedGamertag('asshole')).toBe(true);
  });

  it('blocks hate speech terms', () => {
    expect(isBlockedGamertag('nazi')).toBe(true);
  });

  it('blocks political terms', () => {
    expect(isBlockedGamertag('trump')).toBe(true);
    expect(isBlockedGamertag('biden')).toBe(true);
    expect(isBlockedGamertag('maga')).toBe(true);
  });

  it('allows clean names', () => {
    expect(isBlockedGamertag('dragonslayer')).toBe(false);
    expect(isBlockedGamertag('coolwarrior99')).toBe(false);
  });

  it('catches substrings in normalized form', () => {
    expect(isBlockedGamertag('xtrumpx')).toBe(true);
  });

  it('operates on normalized input (lowercase, stripped)', () => {
    expect(isBlockedGamertag('dragonslayer')).toBe(false);
  });
});
```

#### Step 2: Run test to verify it fails

Run: `rtk pnpm -r --filter @phalanxduel/server test -- content-filter`
Expected: FAIL

#### Step 3: Write minimal implementation

```typescript
// server/src/content-filter.ts

// Blocklist categories applied against the normalized (lowercase, stripped) gamertag.
// Matching is substring-based to catch embedding tricks.
const BLOCKED_TERMS: string[] = [
  // Profanity
  'shit', 'fuck', 'ass', 'damn', 'bitch', 'bastard', 'dick', 'cock', 'pussy',
  'cunt', 'piss', 'crap', 'whore', 'slut', 'tits', 'boob', 'penis', 'vagina',
  'anus', 'dildo', 'porn', 'hentai', 'orgasm', 'blowjob', 'handjob',
  // Hate speech
  'nazi', 'hitler', 'kkk', 'nigger', 'nigga', 'faggot', 'fag', 'retard',
  'chink', 'spic', 'kike', 'gook', 'wetback', 'beaner', 'tranny',
  'jihad', 'isis',
  // US Political (especially US)
  'trump', 'biden', 'obama', 'maga', 'hillary', 'clinton', 'desantis',
  'pelosi', 'mcconnell', 'aoc',
  'democrat', 'republican', 'gop', 'maga', 'antifa', 'blm',
  'liberal', 'conservative', 'socialist', 'communist', 'fascist', 'marxist',
  'leftwing', 'rightwing', 'altright', 'woke',
  // Political parties/movements
  'qanon', 'proudboy', 'boogaloo',
];

/**
 * Check if a normalized gamertag contains any blocked terms.
 * Input MUST already be normalized (lowercase, spaces/hyphens/underscores stripped).
 */
export function isBlockedGamertag(normalized: string): boolean {
  return BLOCKED_TERMS.some((term) => normalized.includes(term));
}
```

#### Step 4: Run test to verify it passes

Run: `rtk pnpm -r --filter @phalanxduel/server test -- content-filter`
Expected: PASS

#### Step 5: Commit

```bash
rtk git add server/src/content-filter.ts server/tests/content-filter.test.ts
rtk git commit -m "feat(server): add gamertag content filter blocklist"
```

---

### Task 4: Database Schema Migration

**Files:**
- Modify: `server/src/db/schema.ts`

This task modifies the Drizzle schema. The migration will be applied via `drizzle-kit push` (not a migration file).

#### Step 1: Update the schema

Replace the `users` table definition in `server/src/db/schema.ts`:

```typescript
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  gamertag: text('gamertag').notNull(),
  gamertagNormalized: text('gamertag_normalized').notNull(),
  suffix: integer('suffix'),
  gamertagChangedAt: timestamp('gamertag_changed_at'),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  elo: integer('elo').default(1000).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

Note: The `name` column is replaced by `gamertag`. The unique constraint on `(gamertag_normalized, suffix)` will be added after the schema push, or can be done with a Drizzle `uniqueIndex`. Use Drizzle's `uniqueIndex`:

```typescript
import { pgTable, uuid, text, timestamp, integer, uniqueIndex } from 'drizzle-orm/pg-core';

// Inside users table definition, after the columns, add:
// ... (as second argument to pgTable)
```

Actually, Drizzle supports it as a third argument:

```typescript
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  gamertag: text('gamertag').notNull(),
  gamertagNormalized: text('gamertag_normalized').notNull(),
  suffix: integer('suffix'),
  gamertagChangedAt: timestamp('gamertag_changed_at'),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  elo: integer('elo').default(1000).notNull(),
  // Profile fields (all optional)
  favoriteSuit: text('favorite_suit', { enum: ['spades', 'hearts', 'diamonds', 'clubs'] }),
  tagline: text('tagline'),       // max 140 chars, validated in route
  avatarIcon: text('avatar_icon'), // predefined icon key, e.g. 'sword', 'shield', 'crown'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('gamertag_unique_idx').on(table.gamertagNormalized, table.suffix),
]);
```

#### Step 2: Run typecheck to verify schema compiles

Run: `rtk pnpm -r --filter @phalanxduel/server exec tsc --noEmit`
Expected: Type errors in auth.ts (references old `name` field) — that's expected, fixed in Task 5.

#### Step 3: Commit

```bash
rtk git add server/src/db/schema.ts
rtk git commit -m "feat(server): update users schema with gamertag columns"
```

---

### Task 5: Gamertag Assignment Helper (Server)

**Files:**
- Create: `server/src/gamertag.ts`
- Create: `server/tests/gamertag.test.ts`

This is the core transactional logic for assigning gamertags with suffix handling.

#### Step 1: Write the failing tests

```typescript
// server/tests/gamertag.test.ts
import { describe, it, expect } from 'vitest';
import { assignGamertagSuffix } from '../src/gamertag';

describe('assignGamertagSuffix', () => {
  it('returns null suffix when no existing users have this normalized tag', () => {
    const result = assignGamertagSuffix(null);
    expect(result).toEqual({ newSuffix: null, updateExisting: null });
  });

  it('assigns suffix 2 and updates existing user to 1 when one unsuffixed user exists', () => {
    const result = assignGamertagSuffix({ maxSuffix: null, count: 1 });
    expect(result).toEqual({ newSuffix: 2, updateExisting: 1 });
  });

  it('assigns next suffix when suffixed users exist', () => {
    const result = assignGamertagSuffix({ maxSuffix: 3, count: 3 });
    expect(result).toEqual({ newSuffix: 4, updateExisting: null });
  });
});
```

#### Step 2: Run test to verify it fails

Run: `rtk pnpm -r --filter @phalanxduel/server test -- gamertag`
Expected: FAIL

#### Step 3: Write minimal implementation

```typescript
// server/src/gamertag.ts
import { normalizeGamertag, validateGamertag } from '@phalanxduel/shared';
import { isBlockedGamertag } from './content-filter.js';

export { normalizeGamertag, validateGamertag };

interface ExistingTagInfo {
  maxSuffix: number | null;
  count: number;
}

interface SuffixAssignment {
  newSuffix: number | null;
  updateExisting: number | null; // suffix to assign to the existing unsuffixed user
}

/**
 * Determine the suffix for a new gamertag registration.
 * @param existing - null if no users have this normalized tag, otherwise { maxSuffix, count }
 */
export function assignGamertagSuffix(existing: ExistingTagInfo | null): SuffixAssignment {
  if (!existing) {
    return { newSuffix: null, updateExisting: null };
  }

  // First collision: existing user had suffix=NULL, so give them #1, new user gets #2
  if (existing.maxSuffix === null) {
    return { newSuffix: 2, updateExisting: 1 };
  }

  // Subsequent collision: new user gets max+1
  return { newSuffix: existing.maxSuffix + 1, updateExisting: null };
}

/**
 * Full validation pipeline: format + content filter.
 * Returns error message or null if valid.
 */
export function validateGamertagFull(gamertag: string): string | null {
  const validation = validateGamertag(gamertag);
  if (!validation.ok) return validation.reason;

  const normalized = normalizeGamertag(gamertag);
  if (isBlockedGamertag(normalized)) return 'That gamertag is not available';

  return null;
}
```

#### Step 4: Run test to verify it passes

Run: `rtk pnpm -r --filter @phalanxduel/server test -- gamertag`
Expected: PASS

#### Step 5: Commit

```bash
rtk git add server/src/gamertag.ts server/tests/gamertag.test.ts
rtk git commit -m "feat(server): add gamertag suffix assignment logic"
```

---

### Task 6: Update Auth Routes for Gamertag

**Files:**
- Modify: `server/src/routes/auth.ts`
- Modify: `server/tests/auth.test.ts`

#### Step 1: Write the failing tests

Add to `server/tests/auth.test.ts`:

```typescript
describe('gamertag validation on register', () => {
  it('rejects gamertag shorter than 3 chars', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { gamertag: 'ab', email: 'test@example.com', password: 'password123' },
    });
    expect([400, 503]).toContain(res.statusCode);
  });

  it('rejects gamertag with non-ASCII chars', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { gamertag: 'Dräg0n', email: 'test@example.com', password: 'password123' },
    });
    expect([400, 503]).toContain(res.statusCode);
  });
});
```

#### Step 2: Run test to verify it fails

Run: `rtk pnpm -r --filter @phalanxduel/server test -- auth`
Expected: FAIL (current register expects `name`, not `gamertag`)

#### Step 3: Update auth routes

Replace `RegisterSchema` and update the register handler in `server/src/routes/auth.ts`:

```typescript
const RegisterSchema = z.object({
  gamertag: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(8),
});
```

Update the register handler to:
1. Validate gamertag via `validateGamertagFull()`
2. Normalize via `normalizeGamertag()`
3. Query for existing users with same normalized tag
4. Call `assignGamertagSuffix()` to determine suffix
5. If `updateExisting` is non-null, update the existing user's suffix in a transaction
6. Insert the new user with gamertag fields
7. Return user with `gamertag` and `suffix` (not `name`)

Update the login handler and `/me` endpoint to return `gamertag`, `suffix` instead of `name`.

Update the JWT payload to include `gamertag` and `suffix` instead of `name`.

Key changes to the register handler:

```typescript
import { validateGamertagFull, assignGamertagSuffix } from '../gamertag.js';
import { normalizeGamertag } from '@phalanxduel/shared';
import { sql } from 'drizzle-orm';

// In register handler:
const { gamertag, email, password } = result.data;

const gamertagError = validateGamertagFull(gamertag);
if (gamertagError) {
  return reply.status(400).send({ error: gamertagError });
}

const normalized = normalizeGamertag(gamertag);
const passwordHash = await bcrypt.hash(password, 10);

// Transaction for suffix assignment
const [user] = await db.transaction(async (tx) => {
  const existing = await tx
    .select({
      maxSuffix: sql<number | null>`MAX(${users.suffix})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(users)
    .where(eq(users.gamertagNormalized, normalized));

  const row = existing[0];
  const existingInfo = row && Number(row.count) > 0
    ? { maxSuffix: row.maxSuffix, count: Number(row.count) }
    : null;

  const { newSuffix, updateExisting } = assignGamertagSuffix(existingInfo);

  if (updateExisting !== null) {
    await tx
      .update(users)
      .set({ suffix: updateExisting })
      .where(
        sql`${users.gamertagNormalized} = ${normalized} AND ${users.suffix} IS NULL`
      );
  }

  return tx
    .insert(users)
    .values({
      gamertag,
      gamertagNormalized: normalized,
      suffix: newSuffix,
      email,
      passwordHash,
    })
    .returning({
      id: users.id,
      gamertag: users.gamertag,
      suffix: users.suffix,
      email: users.email,
      elo: users.elo,
    });
});

const token = fastify.jwt.sign({ id: user!.id, gamertag: user!.gamertag, suffix: user!.suffix });
return { token, user };
```

Update the login response similarly to return `gamertag` + `suffix` instead of `name`.

Update `/api/auth/me` to return `gamertag` + `suffix`.

#### Step 4: Update existing tests

Update existing auth tests to use `gamertag` instead of `name` in request payloads.

#### Step 5: Run tests to verify they pass

Run: `rtk pnpm -r --filter @phalanxduel/server test -- auth`
Expected: PASS

#### Step 6: Commit

```bash
rtk git add server/src/routes/auth.ts server/tests/auth.test.ts
rtk git commit -m "feat(server): update auth routes for gamertag system"
```

---

### Task 7: Gamertag Change Endpoint

**Files:**
- Modify: `server/src/routes/auth.ts`
- Modify: `server/tests/auth.test.ts`

#### Step 1: Write the failing tests

```typescript
describe('POST /api/auth/gamertag', () => {
  it('returns 503 when DB unavailable', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/gamertag',
      payload: { gamertag: 'NewTag' },
    });
    // 401 (no token) or 503 (no DB) both acceptable
    expect([401, 503]).toContain(res.statusCode);
  });

  it('returns 401 without auth token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/gamertag',
      payload: { gamertag: 'NewTag' },
    });
    expect(res.statusCode).toBe(401);
  });
});
```

#### Step 2: Run test to verify it fails

Run: `rtk pnpm -r --filter @phalanxduel/server test -- auth`
Expected: FAIL (404, route not found)

#### Step 3: Implement the endpoint

Add to `server/src/routes/auth.ts`:

```typescript
const ChangeGamertagSchema = z.object({
  gamertag: z.string().min(3).max(20),
});

fastify.post('/api/auth/gamertag', async (request, reply) => {
  if (!db) return reply.status(503).send({ error: 'Database not available' });

  // Authenticate
  let token = request.headers['authorization']?.replace('Bearer ', '');
  if (!token) token = request.cookies['phalanx_refresh'];
  if (!token) return reply.status(401).send({ error: 'Unauthorized' });

  let payload: { id: string };
  try {
    payload = fastify.jwt.verify(token) as { id: string };
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const result = ChangeGamertagSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({ error: 'Invalid input' });
  }

  const { gamertag } = result.data;
  const gamertagError = validateGamertagFull(gamertag);
  if (gamertagError) {
    return reply.status(400).send({ error: gamertagError });
  }

  const normalized = normalizeGamertag(gamertag);

  // Check cooldown
  const [currentUser] = await db.select().from(users).where(eq(users.id, payload.id)).limit(1);
  if (!currentUser) return reply.status(404).send({ error: 'User not found' });

  if (currentUser.gamertagChangedAt) {
    const cooldownMs = 7 * 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - currentUser.gamertagChangedAt.getTime();
    if (elapsed < cooldownMs) {
      const daysLeft = Math.ceil((cooldownMs - elapsed) / (24 * 60 * 60 * 1000));
      return reply.status(429).send({
        error: `Gamertag can be changed in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
      });
    }
  }

  // Transaction for suffix assignment + update
  const [updated] = await db.transaction(async (tx) => {
    const existing = await tx
      .select({
        maxSuffix: sql<number | null>`MAX(${users.suffix})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(users)
      .where(eq(users.gamertagNormalized, normalized));

    const row = existing[0];
    const existingInfo = row && Number(row.count) > 0
      ? { maxSuffix: row.maxSuffix, count: Number(row.count) }
      : null;

    const { newSuffix, updateExisting } = assignGamertagSuffix(existingInfo);

    if (updateExisting !== null) {
      await tx
        .update(users)
        .set({ suffix: updateExisting })
        .where(
          sql`${users.gamertagNormalized} = ${normalized} AND ${users.suffix} IS NULL`
        );
    }

    return tx
      .update(users)
      .set({
        gamertag,
        gamertagNormalized: normalized,
        suffix: newSuffix,
        gamertagChangedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, payload.id))
      .returning({
        id: users.id,
        gamertag: users.gamertag,
        suffix: users.suffix,
        email: users.email,
        elo: users.elo,
      });
  });

  if (!updated) return reply.status(404).send({ error: 'User not found' });

  const freshToken = fastify.jwt.sign({
    id: updated.id,
    gamertag: updated.gamertag,
    suffix: updated.suffix,
  });

  return { token: freshToken, user: updated };
});
```

#### Step 4: Run tests to verify they pass

Run: `rtk pnpm -r --filter @phalanxduel/server test -- auth`
Expected: PASS

#### Step 5: Commit

```bash
rtk git add server/src/routes/auth.ts server/tests/auth.test.ts
rtk git commit -m "feat(server): add POST /api/auth/gamertag change endpoint"
```

---

### Task 8: Update WebSocket Auth & Match Identity

**Files:**
- Modify: `server/src/app.ts` (lines ~739-753, ~664, ~694)
- Modify: `server/src/match.ts` (PlayerConnection interface, `updatePlayerIdentity`)

The WebSocket `authenticate` message currently uses `authPayload.name`. Update to use `formatGamertag(gamertag, suffix)`.

#### Step 1: Update match.ts PlayerConnection

No test needed — this is a type change.

In `server/src/match.ts`, the `PlayerConnection.playerName` field keeps its name (it's a display name). The WebSocket `authenticate` handler and `createMatch`/`joinMatch` callers must pass the formatted gamertag.

#### Step 2: Update app.ts authenticate handler

In `server/src/app.ts` around line 739-749:

```typescript
case 'authenticate': {
  try {
    const authPayload = fastify.jwt.verify(msg.token) as {
      id: string;
      gamertag: string;
      suffix: number | null;
    };
    const displayName = formatGamertag(authPayload.gamertag, authPayload.suffix);
    authUser = { ...authPayload, name: displayName };
    matchManager.updatePlayerIdentity(socket, authPayload.id, displayName);
    sendMessage({
      type: 'authenticated',
      user: { id: authPayload.id, name: displayName, elo: 0 },
    });
  } catch {
    sendMessage({ type: 'auth_error', error: 'Invalid token' });
  }
  break;
}
```

Import `formatGamertag` from `@phalanxduel/shared` at the top of app.ts.

#### Step 3: Update createMatch and joinMatch callers

At lines ~664 and ~694 in app.ts, `authUser?.name` is already used. Since we set `authUser.name = displayName` in the authenticate handler, this continues to work. No changes needed here.

#### Step 4: Run the full test suite

Run: `rtk pnpm -r test`
Expected: PASS (no DB-dependent tests should break since they already handle 503)

#### Step 5: Commit

```bash
rtk git add server/src/app.ts
rtk git commit -m "feat(server): use formatted gamertag in WebSocket auth and match identity"
```

---

### Task 9: Update Client AuthPanel for Gamertag

**Files:**
- Modify: `client/src/components/AuthPanel.tsx`
- Modify: `client/src/state.ts` (AuthUser interface)
- Modify: `client/tests/auth-panel.test.ts`

#### Step 1: Update AuthUser interface

In `client/src/state.ts`, update the `AuthUser` interface:

```typescript
export interface AuthUser {
  id: string;
  gamertag: string;
  suffix: number | null;
  email: string;
  elo: number;
}
```

#### Step 2: Update AuthPanel

In `client/src/components/AuthPanel.tsx`:

1. Rename the `name` state variable to `gamertag`:
   ```typescript
   const [gamertag, setGamertag] = useState('');
   ```

2. Update the form field label from "Name" to "Gamertag":
   ```tsx
   <label for="auth-gamertag">Gamertag</label>
   <input
     id="auth-gamertag"
     type="text"
     placeholder="3-20 characters"
     value={gamertag}
     onInput={(e) => setGamertag((e.currentTarget as HTMLInputElement).value)}
     required
     minLength={3}
     maxLength={20}
     pattern="[a-zA-Z0-9 _-]+"
   />
   ```

3. Update the request body:
   ```typescript
   const body = isLogin ? { email, password } : { email, password, gamertag };
   ```

4. Update the success handler to use `formatGamertag`:
   ```typescript
   import { formatGamertag } from '@phalanxduel/shared';
   // ...
   setUser(data.user);
   setPlayerName(formatGamertag(data.user.gamertag, data.user.suffix));
   ```

#### Step 3: Update AuthPanel tests

In `client/tests/auth-panel.test.ts`, update any references from `name` field to `gamertag`.

#### Step 4: Run client tests

Run: `rtk pnpm -r --filter @phalanxduel/client test`
Expected: PASS

#### Step 5: Commit

```bash
rtk git add client/src/components/AuthPanel.tsx client/src/state.ts client/tests/auth-panel.test.ts
rtk git commit -m "feat(client): update AuthPanel for gamertag registration"
```

---

### Task 10: Update Lobby Display for Gamertag

**Files:**
- Modify: `client/src/lobby.ts` (auth area display, warrior name field)
- Modify: `client/src/lobby-preact.tsx` (if the Preact lobby shows auth info)

The lobby auth area currently shows `user.name`. Update to show the formatted gamertag with ELO.
Authenticated users don't need the "Your warrior name" input — their gamertag IS their identity.

#### Step 1: Update lobby.ts auth display

Find where `user.name` is displayed in the lobby auth area and replace with:

```typescript
import { formatGamertag } from '@phalanxduel/shared';
// ...
const displayName = formatGamertag(user.gamertag, user.suffix);
```

Display format: `Dragon#1 (ELO: 1000)` per the design doc.

#### Step 2: Hide warrior name input for authenticated users

When a user is logged in, the warrior name field should be hidden entirely — the server
uses their gamertag from the DB. The field remains visible only for guest players.

```typescript
if (!state.user) {
  // Show warrior name input for guests only
  const nameInput = el('input', 'name-input') as HTMLInputElement;
  nameInput.placeholder = 'Your warrior name';
  // ... existing guest name input logic
  container.appendChild(nameInput);
}
```

The `createMatch` and `joinMatch` WebSocket messages still send `playerName` (the server
ignores it for authenticated users per the design doc's security rules).

#### Step 3: Run client tests

Run: `rtk pnpm -r --filter @phalanxduel/client test`
Expected: PASS

#### Step 4: Commit

```bash
rtk git add client/src/lobby.ts
rtk git commit -m "feat(client): display gamertag in lobby, hide name input for auth users"
```

---

### Task 11: Update Authenticated Server Message Schema

**Files:**
- Modify: `shared/src/schema.ts` (ServerMessageSchema, authenticated message)

The `authenticated` WebSocket message currently sends `{ id, name, elo }`. Update to include gamertag fields for future client consumption:

```typescript
z.object({
  type: z.literal('authenticated'),
  user: z.object({
    id: z.string(),
    name: z.string(), // formatted display name (backwards compat)
    gamertag: z.string().optional(),
    suffix: z.number().nullable().optional(),
    elo: z.number(),
  }),
}),
```

Keep `name` for backward compatibility — it will contain the formatted gamertag string.

#### Step 1: Update the schema

#### Step 2: Run typecheck and tests

Run: `rtk pnpm -r test`
Expected: PASS

#### Step 3: Commit

```bash
rtk git add shared/src/schema.ts
rtk git commit -m "feat(shared): add gamertag fields to authenticated message schema"
```

---

### Task 12: Profile Update Endpoint

**Files:**
- Modify: `server/src/routes/auth.ts`
- Modify: `server/tests/auth.test.ts`

#### Step 1: Write the failing tests

```typescript
describe('POST /api/auth/profile', () => {
  it('returns 401 without auth token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/profile',
      payload: { favoriteSuit: 'spades' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 for invalid suit', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/profile',
      payload: { favoriteSuit: 'wands' },
    });
    // 400 or 401 (no token) both acceptable in no-DB test env
    expect([400, 401]).toContain(res.statusCode);
  });

  it('returns 400 for tagline over 140 chars', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/profile',
      payload: { tagline: 'x'.repeat(141) },
    });
    expect([400, 401]).toContain(res.statusCode);
  });
});
```

#### Step 2: Run test to verify it fails

Run: `rtk pnpm -r --filter @phalanxduel/server test -- auth`
Expected: FAIL (404, route not found)

#### Step 3: Implement the endpoint

Add `POST /api/auth/profile` to `server/src/routes/auth.ts`:

```typescript
const AVATAR_ICONS = [
  'sword', 'shield', 'crown', 'dragon', 'skull',
  'flame', 'star', 'bolt', 'gem', 'heart',
] as const;

const ProfileUpdateSchema = z.object({
  favoriteSuit: z.enum(['spades', 'hearts', 'diamonds', 'clubs']).optional(),
  tagline: z.string().max(140).optional(),
  avatarIcon: z.enum(AVATAR_ICONS).optional(),
});

fastify.post('/api/auth/profile', async (request, reply) => {
  if (!db) return reply.status(503).send({ error: 'Database not available' });

  let token = request.headers['authorization']?.replace('Bearer ', '');
  if (!token) token = request.cookies['phalanx_refresh'];
  if (!token) return reply.status(401).send({ error: 'Unauthorized' });

  let payload: { id: string };
  try {
    payload = fastify.jwt.verify(token) as { id: string };
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const result = ProfileUpdateSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({ error: 'Invalid input', details: result.error.format() });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (result.data.favoriteSuit !== undefined) updates.favoriteSuit = result.data.favoriteSuit;
  if (result.data.tagline !== undefined) updates.tagline = result.data.tagline;
  if (result.data.avatarIcon !== undefined) updates.avatarIcon = result.data.avatarIcon;

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, payload.id))
    .returning({
      id: users.id, gamertag: users.gamertag, suffix: users.suffix,
      email: users.email, elo: users.elo,
      favoriteSuit: users.favoriteSuit, tagline: users.tagline, avatarIcon: users.avatarIcon,
    });

  if (!updated) return reply.status(404).send({ error: 'User not found' });
  return { user: updated };
});
```

#### Step 4: Run tests to verify they pass

Run: `rtk pnpm -r --filter @phalanxduel/server test -- auth`
Expected: PASS

#### Step 5: Commit

```bash
rtk git add server/src/routes/auth.ts server/tests/auth.test.ts
rtk git commit -m "feat(server): add POST /api/auth/profile for profile fields"
```

---

### Task 13: Profile Display in Lobby

**Files:**
- Modify: `client/src/lobby.ts`
- Modify: `client/src/state.ts` (add profile fields to AuthUser)

#### Step 1: Add profile fields to AuthUser

In `client/src/state.ts`:

```typescript
export interface AuthUser {
  id: string;
  gamertag: string;
  suffix: number | null;
  email: string;
  elo: number;
  favoriteSuit?: 'spades' | 'hearts' | 'diamonds' | 'clubs' | null;
  tagline?: string | null;
  avatarIcon?: string | null;
}
```

#### Step 2: Update lobby auth area display

In the lobby auth area, show the favorite suit icon and tagline alongside the gamertag:

```typescript
import { suitSymbol, suitColor } from './cards';

// After gamertag display
if (user.favoriteSuit) {
  const suitEl = el('span', 'profile-suit');
  suitEl.textContent = suitSymbol(user.favoriteSuit);
  suitEl.style.color = suitColor(user.favoriteSuit);
  authArea.appendChild(suitEl);
}

if (user.tagline) {
  const tagEl = el('div', 'profile-tagline');
  tagEl.textContent = user.tagline;
  authArea.appendChild(tagEl);
}
```

#### Step 3: Run client tests

Run: `rtk pnpm -r --filter @phalanxduel/client test`
Expected: PASS

#### Step 4: Commit

```bash
rtk git add client/src/lobby.ts client/src/state.ts
rtk git commit -m "feat(client): show profile fields in lobby auth area"
```

---

### Task 14: Push Schema to Neon & Integration Test

**Files:** No new files — this is a deployment/verification step.

#### Step 1: Run full CI locally

Run: `rtk pnpm -r test && rtk pnpm typecheck && rtk pnpm lint`
Expected: All green

#### Step 2: Push schema to Neon

```bash
cd server && npx drizzle-kit push
```

This will show the migration plan (rename `name` → `gamertag`, add new columns). Review and confirm.

#### Step 3: Verify with a manual registration

Test by registering a new account on the deployed app or via curl:

```bash
curl -X POST https://phalanxduel.fly.dev/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"gamertag":"TestWarrior","email":"test@test.com","password":"password123"}'
```

#### Step 4: Commit any final adjustments

```bash
rtk git add -A
rtk git commit -m "chore: finalize gamertag system integration"
```

#### Step 5: Push and deploy

```bash
rtk git push https://github.com/phalanxduel/phalanxduel.git main
fly deploy
```

---

## Migration Notes

Since there's only one user in production (Mike), the migration is straightforward:

1. `drizzle-kit push` will rename `name` → `gamertag` and add the new columns.
2. The existing user's `name` value becomes their `gamertag`.
3. `gamertag_normalized` needs to be populated — run a quick SQL:
   ```sql
   UPDATE users SET gamertag_normalized = LOWER(REPLACE(REPLACE(REPLACE(gamertag, ' ', ''), '-', ''), '_', ''));
   ```
4. `suffix` stays `NULL` (no collisions with one user).
5. `gamertag_changed_at` stays `NULL` (user can change immediately).

## Task Dependency Graph

```text
Task 1 (formatGamertag) ──┐
Task 2 (validate/normalize) ──┤
                              ├── Task 5 (suffix logic) ──┐
Task 3 (content filter) ──────┘                           │
Task 4 (schema + profile cols) ───────────────────────────┤
                                                          ├── Task 6 (auth routes)
                                                          ├── Task 7 (change endpoint)
                                                          ├── Task 8 (websocket auth)
                                                          ├── Task 9 (client AuthPanel)
                                                          ├── Task 10 (lobby display)
                                                          ├── Task 11 (message schema)
                                                          ├── Task 12 (profile endpoint)
                                                          └── Task 13 (profile display)
                                                                      │
                                                         Task 14 (deploy) ←──┘
```

Tasks 1-3 can be done in parallel. Task 4 is independent. Tasks 5-13 depend on 1-4. Task 14 is last.
