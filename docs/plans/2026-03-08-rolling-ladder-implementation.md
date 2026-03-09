# Rolling 7-Day Elo Ladder Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a rolling 7-day Elo ranking system with leaderboards for PvP and single-player categories, historical snapshots, and player match history.

**Architecture:** The `matches` table is the single source of truth. A new `bot_strategy` column identifies game category. An `elo_snapshots` table stores computed rolling ratings with formula parameters. Elo is computed on match completion and refreshed on stale leaderboard queries. Three API endpoints serve leaderboard, player rank, and match history. Client adds leaderboard tabs in the lobby.

**Tech Stack:** Drizzle ORM (PostgreSQL), Fastify routes, Vitest, standard Elo formula

**Design doc:** `docs/plans/2026-03-08-rolling-ladder-design.md`

---

### Task 1: Add `bot_strategy` Column to Matches Schema

**Files:**
- Modify: `server/src/db/schema.ts:23-45`
- Modify: `server/src/db/match-repo.ts:12` (add bot_strategy to payload)
- Modify: `server/src/match.ts:76-90` (add botStrategy to MatchInstance)

#### Step 1: Add column to Drizzle schema

In `server/src/db/schema.ts`, add `botStrategy` to the `matches` table:

```typescript
botStrategy: text('bot_strategy', { enum: ['random', 'heuristic'] }),
```

Add it after the `player2Name` field (line 30).

#### Step 2: Add `botStrategy` to MatchInstance interface

In `server/src/match.ts`, add to the `MatchInstance` interface (after `botPlayerIndex`):

```typescript
botStrategy?: 'random' | 'heuristic';
```

#### Step 3: Set `botStrategy` on match creation

In `server/src/match.ts`, in the `createMatch` method where `botOptions` is handled (~line 215), add:

```typescript
match.botStrategy = botOptions.opponent === 'bot-heuristic' ? 'heuristic' : 'random';
```

#### Step 4: Persist `botStrategy` in match repo

In `server/src/db/match-repo.ts`, add to the `payload` object in `saveMatch`:

```typescript
botStrategy: match.botStrategy ?? null,
```

#### Step 5: Restore `botStrategy` in getMatch

In `server/src/db/match-repo.ts`, in `getMatch`, add to the returned object:

```typescript
botStrategy: row.botStrategy ?? undefined,
```

#### Step 6: Generate Drizzle migration

Run from `server/`:

```bash
pnpm drizzle-kit generate
```

Expected: New migration file created in `server/drizzle/` adding `bot_strategy` column.

#### Step 7: Run tests

```bash
rtk pnpm -r test
```

Expected: All 336 tests pass. No behavior change, just schema addition.

#### Step 8: Commit

```bash
rtk git add server/src/db/schema.ts server/src/db/match-repo.ts server/src/match.ts server/drizzle/
rtk git commit -m "feat(db): add bot_strategy column to matches table"
```

---

### Task 2: Create `elo_snapshots` Table

**Files:**
- Modify: `server/src/db/schema.ts`

#### Step 1: Add elo_snapshots table to schema

In `server/src/db/schema.ts`, add after the `matches` table definition:

```typescript
export const eloSnapshots = pgTable('elo_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  category: text('category', { enum: ['pvp', 'sp-random', 'sp-heuristic'] }).notNull(),
  elo: integer('elo').notNull(),
  kFactor: integer('k_factor').notNull(),
  windowDays: integer('window_days').notNull(),
  matchesInWindow: integer('matches_in_window').notNull(),
  winsInWindow: integer('wins_in_window').notNull(),
  computedAt: timestamp('computed_at').defaultNow().notNull(),
});
```

Add the `index` import to the existing import line:

```typescript
import { pgTable, uuid, text, timestamp, jsonb, integer, uniqueIndex, index } from 'drizzle-orm/pg-core';
```

Add an index for efficient lookups:

```typescript
export const eloSnapshots = pgTable('elo_snapshots', {
  // ... columns above
}, (table) => [
  index('elo_snapshots_user_category_idx').on(table.userId, table.category, table.computedAt),
]);
```

#### Step 2: Generate migration

```bash
cd server && pnpm drizzle-kit generate
```

Expected: New migration file adding `elo_snapshots` table with index.

#### Step 3: Run tests

```bash
rtk pnpm -r test
```

Expected: All tests pass.

#### Step 4: Commit

```bash
rtk git add server/src/db/schema.ts server/drizzle/
rtk git commit -m "feat(db): add elo_snapshots table for rolling ladder history"
```

---

### Task 3: Implement Elo Calculation Engine

**Files:**
- Create: `server/src/elo.ts`
- Create: `server/tests/elo.test.ts`

#### Step 1: Write failing tests for Elo calculation

Create `server/tests/elo.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeExpected, computeNewRating, computeRollingElo } from '../src/elo.js';

describe('Elo calculations', () => {
  describe('computeExpected', () => {
    it('returns 0.5 for equal ratings', () => {
      expect(computeExpected(1000, 1000)).toBeCloseTo(0.5);
    });

    it('returns higher expectation for higher-rated player', () => {
      const expected = computeExpected(1200, 1000);
      expect(expected).toBeGreaterThan(0.5);
      expect(expected).toBeCloseTo(0.76, 1);
    });

    it('returns lower expectation for lower-rated player', () => {
      const expected = computeExpected(800, 1000);
      expect(expected).toBeLessThan(0.5);
    });
  });

  describe('computeNewRating', () => {
    it('increases rating on win against equal opponent', () => {
      const newRating = computeNewRating(1000, 1000, true);
      expect(newRating).toBe(1016);
    });

    it('decreases rating on loss against equal opponent', () => {
      const newRating = computeNewRating(1000, 1000, false);
      expect(newRating).toBe(984);
    });

    it('gains less for beating a weaker opponent', () => {
      const gainVsWeak = computeNewRating(1200, 800, true) - 1200;
      const gainVsEqual = computeNewRating(1200, 1200, true) - 1200;
      expect(gainVsWeak).toBeLessThan(gainVsEqual);
    });

    it('loses more for losing to a weaker opponent', () => {
      const lossToWeak = 1200 - computeNewRating(1200, 800, false);
      const lossToEqual = 1200 - computeNewRating(1200, 1200, false);
      expect(lossToWeak).toBeGreaterThan(lossToEqual);
    });
  });

  describe('computeRollingElo', () => {
    it('returns 1000 for empty match list', () => {
      expect(computeRollingElo([])).toBe(1000);
    });

    it('computes correctly for a single win', () => {
      const result = computeRollingElo([{ opponentElo: 1000, win: true }]);
      expect(result).toBe(1016);
    });

    it('computes sequentially across multiple matches', () => {
      const result = computeRollingElo([
        { opponentElo: 1000, win: true },
        { opponentElo: 1000, win: true },
        { opponentElo: 1000, win: false },
      ]);
      // Start 1000, win vs 1000 -> 1016, win vs 1000 -> ~1030, lose vs 1000 -> ~1015
      expect(result).toBeGreaterThan(1000);
      expect(result).toBeLessThan(1032);
    });

    it('applies phantom ratings for bot matches', () => {
      const result = computeRollingElo([{ opponentElo: 600, win: true }]);
      // Beating a 600-rated bot from 1000 gives small gain
      expect(result).toBeGreaterThan(1000);
      expect(result).toBeLessThan(1010);
    });
  });
});
```

#### Step 2: Run tests to verify they fail

```bash
rtk pnpm -C server test -- --run elo.test
```

Expected: FAIL — module `../src/elo.js` not found.

#### Step 3: Implement the Elo engine

Create `server/src/elo.ts`:

```typescript
const K_FACTOR = 32;
const BASELINE = 1000;

export interface MatchResult {
  opponentElo: number;
  win: boolean;
}

/** Expected score: probability of winning given rating gap. */
export function computeExpected(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

/** New rating after a single match. */
export function computeNewRating(
  playerElo: number,
  opponentElo: number,
  win: boolean,
  k: number = K_FACTOR,
): number {
  const expected = computeExpected(playerElo, opponentElo);
  const score = win ? 1 : 0;
  return Math.round(playerElo + k * (score - expected));
}

/** Compute rolling Elo from a chronological list of match results. */
export function computeRollingElo(
  matches: MatchResult[],
  baseline: number = BASELINE,
  k: number = K_FACTOR,
): number {
  let elo = baseline;
  for (const match of matches) {
    elo = computeNewRating(elo, match.opponentElo, match.win, k);
  }
  return elo;
}

export const ELO_CONSTANTS = { K_FACTOR, BASELINE } as const;
```

#### Step 4: Run tests to verify they pass

```bash
rtk pnpm -C server test -- --run elo.test
```

Expected: All tests PASS.

#### Step 5: Commit

```bash
rtk git add server/src/elo.ts server/tests/elo.test.ts
rtk git commit -m "feat(elo): implement core Elo calculation engine with tests"
```

---

### Task 4: Implement Ladder Service

**Files:**
- Create: `server/src/ladder.ts`
- Create: `server/tests/ladder.test.ts`

#### Step 1: Write failing tests for the ladder service

Create `server/tests/ladder.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { LadderService, type LadderCategory } from '../src/ladder.js';

// In-memory test doubles — no real DB needed for unit tests
describe('LadderService', () => {
  describe('deriveCategory', () => {
    it('returns pvp when botStrategy is null', () => {
      expect(LadderService.deriveCategory(null)).toBe('pvp');
    });

    it('returns sp-random for random bot', () => {
      expect(LadderService.deriveCategory('random')).toBe('sp-random');
    });

    it('returns sp-heuristic for heuristic bot', () => {
      expect(LadderService.deriveCategory('heuristic')).toBe('sp-heuristic');
    });
  });

  describe('phantomRating', () => {
    it('returns 600 for sp-random', () => {
      expect(LadderService.phantomRating('sp-random')).toBe(600);
    });

    it('returns 1000 for sp-heuristic', () => {
      expect(LadderService.phantomRating('sp-heuristic')).toBe(1000);
    });

    it('returns null for pvp', () => {
      expect(LadderService.phantomRating('pvp')).toBeNull();
    });
  });
});
```

#### Step 2: Run tests to verify they fail

```bash
rtk pnpm -C server test -- --run ladder.test
```

Expected: FAIL — module not found.

#### Step 3: Implement the ladder service

Create `server/src/ladder.ts`:

```typescript
import { db } from './db/index.js';
import { matches } from './db/schema.js';
import { eloSnapshots } from './db/schema.js';
import { computeRollingElo, ELO_CONSTANTS, type MatchResult } from './elo.js';
import { and, eq, gte, desc, sql } from 'drizzle-orm';

export type LadderCategory = 'pvp' | 'sp-random' | 'sp-heuristic';

const PHANTOM_RATINGS: Record<string, number> = {
  'sp-random': 600,
  'sp-heuristic': 1000,
};

const WINDOW_DAYS = 7;
const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

export class LadderService {
  static deriveCategory(botStrategy: string | null | undefined): LadderCategory {
    if (!botStrategy) return 'pvp';
    return `sp-${botStrategy}` as LadderCategory;
  }

  static phantomRating(category: LadderCategory): number | null {
    return PHANTOM_RATINGS[category] ?? null;
  }

  /** Compute rolling Elo for a player in a category from the matches table. */
  async computePlayerElo(
    userId: string,
    category: LadderCategory,
  ): Promise<{ elo: number; matchCount: number; winCount: number }> {
    if (!db) return { elo: ELO_CONSTANTS.BASELINE, matchCount: 0, winCount: 0 };

    const windowStart = new Date();
    windowStart.setUTCDate(windowStart.getUTCDate() - WINDOW_DAYS);

    const categoryFilter = category === 'pvp'
      ? sql`${matches.botStrategy} IS NULL`
      : eq(matches.botStrategy, category.replace('sp-', ''));

    const rows = await db
      .select({
        player1Id: matches.player1Id,
        player2Id: matches.player2Id,
        outcome: matches.outcome,
        botStrategy: matches.botStrategy,
        updatedAt: matches.updatedAt,
      })
      .from(matches)
      .where(
        and(
          eq(matches.status, 'completed'),
          gte(matches.updatedAt, windowStart),
          categoryFilter,
          sql`(${matches.player1Id} = ${userId} OR ${matches.player2Id} = ${userId})`,
        ),
      )
      .orderBy(matches.updatedAt);

    const matchResults: MatchResult[] = [];
    let winCount = 0;

    for (const row of rows) {
      const outcome = row.outcome as { winnerIndex: number } | null;
      if (!outcome) continue;

      const isPlayer1 = row.player1Id === userId;
      const playerIndex = isPlayer1 ? 0 : 1;
      const win = outcome.winnerIndex === playerIndex;
      if (win) winCount++;

      const phantom = LadderService.phantomRating(category);
      // For PvP, use opponent's last snapshot or baseline
      // For SP, use phantom rating
      const opponentElo = phantom ?? ELO_CONSTANTS.BASELINE;

      matchResults.push({ opponentElo, win });
    }

    return {
      elo: computeRollingElo(matchResults),
      matchCount: matchResults.length,
      winCount,
    };
  }

  /** Write an Elo snapshot to the history table. */
  async writeSnapshot(
    userId: string,
    category: LadderCategory,
    elo: number,
    matchCount: number,
    winCount: number,
  ): Promise<void> {
    if (!db) return;

    await db.insert(eloSnapshots).values({
      userId,
      category,
      elo,
      kFactor: ELO_CONSTANTS.K_FACTOR,
      windowDays: WINDOW_DAYS,
      matchesInWindow: matchCount,
      winsInWindow: winCount,
    });
  }

  /** Called when a match completes. Computes and stores snapshots for authenticated players. */
  async onMatchComplete(match: {
    player1Id: string | null;
    player2Id: string | null;
    botStrategy: string | null | undefined;
  }): Promise<void> {
    const category = LadderService.deriveCategory(match.botStrategy);
    const userIds = [match.player1Id, match.player2Id].filter(
      (id): id is string => id !== null,
    );

    for (const userId of userIds) {
      const { elo, matchCount, winCount } = await this.computePlayerElo(userId, category);
      await this.writeSnapshot(userId, category, elo, matchCount, winCount);
    }
  }

  /** Get leaderboard for a category, refreshing stale snapshots. */
  async getLeaderboard(
    category: LadderCategory,
    limit: number = 50,
  ): Promise<Array<{ userId: string; elo: number; matches: number; wins: number; computedAt: Date }>> {
    if (!db) return [];

    // Get latest snapshot per user for this category
    const rows = await db
      .select()
      .from(eloSnapshots)
      .where(eq(eloSnapshots.category, category))
      .orderBy(desc(eloSnapshots.computedAt));

    // Deduplicate to latest per user
    const latest = new Map<string, typeof rows[number]>();
    for (const row of rows) {
      if (!latest.has(row.userId)) {
        latest.set(row.userId, row);
      }
    }

    // Check staleness and refresh if needed
    const now = Date.now();
    for (const [userId, snapshot] of latest) {
      if (now - snapshot.computedAt.getTime() > STALE_THRESHOLD_MS) {
        const { elo, matchCount, winCount } = await this.computePlayerElo(userId, category);
        await this.writeSnapshot(userId, category, elo, matchCount, winCount);
        latest.set(userId, {
          ...snapshot,
          elo,
          matchesInWindow: matchCount,
          winsInWindow: winCount,
          computedAt: new Date(),
        });
      }
    }

    return Array.from(latest.values())
      .sort((a, b) => b.elo - a.elo)
      .slice(0, limit)
      .map((row) => ({
        userId: row.userId,
        elo: row.elo,
        matches: row.matchesInWindow,
        wins: row.winsInWindow,
        computedAt: row.computedAt,
      }));
  }
}
```

#### Step 4: Run tests to verify they pass

```bash
rtk pnpm -C server test -- --run ladder.test
```

Expected: All tests PASS (static method tests, no DB needed).

#### Step 5: Commit

```bash
rtk git add server/src/ladder.ts server/tests/ladder.test.ts
rtk git commit -m "feat(ladder): implement LadderService with rolling Elo computation"
```

---

### Task 5: Wire Elo Snapshot on Match Completion

**Files:**
- Modify: `server/src/match.ts:442-506` (handleAction method)
- Modify: `server/src/match.ts` (constructor/imports)

#### Step 1: Import and instantiate LadderService in MatchManager

In `server/src/match.ts`, add import:

```typescript
import { LadderService } from './ladder.js';
```

Add a `ladderService` field to the class and instantiate in constructor:

```typescript
private ladderService = new LadderService();
```

#### Step 2: Call onMatchComplete after game over

In `handleAction` (~line 505), after `void this.matchRepo.saveMatch(match)`, add:

```typescript
if (match.state?.phase === 'gameOver') {
  void this.ladderService.onMatchComplete({
    player1Id: match.players[0]?.userId ?? null,
    player2Id: match.players[1]?.userId ?? null,
    botStrategy: match.botStrategy ?? null,
  });
}
```

#### Step 3: Run tests

```bash
rtk pnpm -r test
```

Expected: All tests pass. The `onMatchComplete` call is fire-and-forget (`void`), so existing tests won't break even without a DB.

#### Step 4: Commit

```bash
rtk git add server/src/match.ts
rtk git commit -m "feat(ladder): compute Elo snapshots on match completion"
```

---

### Task 6: Add Ladder API Routes

**Files:**
- Create: `server/src/routes/ladder.ts`
- Create: `server/tests/ladder-routes.test.ts`
- Modify: `server/src/app.ts:222` (register routes)

#### Step 1: Write failing tests for ladder routes

Create `server/tests/ladder-routes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isValidCategory } from '../src/routes/ladder.js';

describe('ladder routes', () => {
  describe('isValidCategory', () => {
    it('accepts pvp', () => {
      expect(isValidCategory('pvp')).toBe(true);
    });

    it('accepts sp-random', () => {
      expect(isValidCategory('sp-random')).toBe(true);
    });

    it('accepts sp-heuristic', () => {
      expect(isValidCategory('sp-heuristic')).toBe(true);
    });

    it('rejects invalid category', () => {
      expect(isValidCategory('invalid')).toBe(false);
    });
  });
});
```

#### Step 2: Run tests to verify they fail

```bash
rtk pnpm -C server test -- --run ladder-routes.test
```

Expected: FAIL — module not found.

#### Step 3: Implement ladder routes

Create `server/src/routes/ladder.ts`:

```typescript
import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { LadderService, type LadderCategory } from '../ladder.js';

const VALID_CATEGORIES = new Set<string>(['pvp', 'sp-random', 'sp-heuristic']);

export function isValidCategory(value: string): value is LadderCategory {
  return VALID_CATEGORIES.has(value);
}

export function registerLadderRoutes(fastify: FastifyInstance) {
  const ladder = new LadderService();

  fastify.get<{ Params: { category: string } }>(
    '/api/ladder/:category',
    async (request, reply) => {
      const { category } = request.params;
      if (!isValidCategory(category)) {
        void reply.status(400);
        return { error: 'Invalid category. Use: pvp, sp-random, sp-heuristic' };
      }

      if (!db) {
        void reply.status(503);
        return { error: 'Database not available' };
      }

      const rankings = await ladder.getLeaderboard(category);

      // Resolve gamertags
      const enriched = await Promise.all(
        rankings.map(async (entry, index) => {
          const user = await db!
            .select({ gamertag: users.gamertag, suffix: users.suffix })
            .from(users)
            .where(eq(users.id, entry.userId))
            .limit(1);

          const u = user[0];
          const gamertag = u
            ? u.suffix ? `${u.gamertag}#${u.suffix}` : u.gamertag
            : 'Unknown';

          return {
            rank: index + 1,
            userId: entry.userId,
            gamertag,
            elo: entry.elo,
            matches: entry.matches,
            wins: entry.wins,
          };
        }),
      );

      return {
        category,
        windowDays: 7,
        computedAt: new Date().toISOString(),
        rankings: enriched,
      };
    },
  );

  fastify.get<{ Params: { category: string; userId: string } }>(
    '/api/ladder/:category/:userId',
    async (request, reply) => {
      const { category, userId } = request.params;
      if (!isValidCategory(category)) {
        void reply.status(400);
        return { error: 'Invalid category' };
      }

      if (!db) {
        void reply.status(503);
        return { error: 'Database not available' };
      }

      const { elo, matchCount, winCount } = await ladder.computePlayerElo(userId, category);

      const user = await db
        .select({ gamertag: users.gamertag, suffix: users.suffix })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const u = user[0];
      if (!u) {
        void reply.status(404);
        return { error: 'User not found' };
      }

      return {
        userId,
        gamertag: u.suffix ? `${u.gamertag}#${u.suffix}` : u.gamertag,
        category,
        elo,
        matches: matchCount,
        wins: winCount,
      };
    },
  );

  fastify.get<{ Params: { userId: string } }>(
    '/api/stats/:userId/history',
    async (request, reply) => {
      const { userId } = request.params;

      if (!db) {
        void reply.status(503);
        return { error: 'Database not available' };
      }

      const user = await db
        .select({ gamertag: users.gamertag, suffix: users.suffix })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const u = user[0];
      if (!u) {
        void reply.status(404);
        return { error: 'User not found' };
      }

      const gamertag = u.suffix ? `${u.gamertag}#${u.suffix}` : u.gamertag;

      // Compute current rolling Elo per category
      const categories: LadderCategory[] = ['pvp', 'sp-random', 'sp-heuristic'];
      const categoryStats: Record<string, { currentElo: number; matches: number; wins: number }> = {};

      for (const cat of categories) {
        const { elo, matchCount, winCount } = await ladder.computePlayerElo(userId, cat);
        categoryStats[cat] = { currentElo: elo, matches: matchCount, wins: winCount };
      }

      return {
        userId,
        gamertag,
        categories: categoryStats,
      };
    },
  );
}
```

#### Step 4: Register routes in app.ts

In `server/src/app.ts`, add import:

```typescript
import { registerLadderRoutes } from './routes/ladder.js';
```

Add route registration after `registerAuthRoutes(app)` (~line 223):

```typescript
registerLadderRoutes(app);
```

#### Step 5: Run tests

```bash
rtk pnpm -r test
```

Expected: All tests pass.

#### Step 6: Commit

```bash
rtk git add server/src/routes/ladder.ts server/tests/ladder-routes.test.ts server/src/app.ts
rtk git commit -m "feat(ladder): add ladder API routes for leaderboard and player stats"
```

---

### Task 7: Add Leaderboard UI to Client Lobby

**Files:**
- Modify: `client/src/lobby.ts` (add leaderboard panel)
- Modify: `client/src/style.css` (add leaderboard styles)

#### Step 1: Add leaderboard rendering to lobby

In `client/src/lobby.ts`, add a function to render the leaderboard panel. This should:

- Add a "Leaderboard" section below the match list
- Include tabs for PvP, SP: Random, SP: Heuristic
- Fetch from `/api/ladder/:category` on tab click
- Display rank, gamertag, Elo, matches, wins in a table
- Default to PvP tab

Implementation details will depend on the existing lobby rendering pattern. Follow the same `el()` helper pattern used elsewhere in the file.

#### Step 2: Add leaderboard styles

In `client/src/style.css`, add styles for:

- `.leaderboard` container
- `.leaderboard-tabs` with active state
- `.leaderboard-table` with rows
- `.leaderboard-rank`, `.leaderboard-elo` columns

Keep styling consistent with existing game UI (dark theme, card-game aesthetic).

#### Step 3: Run tests

```bash
rtk pnpm -r test
```

Expected: All tests pass.

#### Step 4: Commit

```bash
rtk git add client/src/lobby.ts client/src/style.css
rtk git commit -m "feat(client): add leaderboard UI with category tabs in lobby"
```

---

### Task 8: Add Player Stats to Profile View

**Files:**
- Modify: `client/src/lobby.ts` (add stats display for authenticated users)

#### Step 1: Add player stats section

For authenticated users, display below their gamertag in the lobby header:

- Rolling Elo per category (fetched from `/api/stats/:userId/history`)
- Win/loss record per category
- Fetch on login and cache in client state

#### Step 2: Run tests

```bash
rtk pnpm -r test
```

Expected: All tests pass.

#### Step 3: Commit

```bash
rtk git add client/src/lobby.ts
rtk git commit -m "feat(client): display player Elo stats in lobby for authenticated users"
```

---

### Task 9: Integration Test and Final Verification

**Files:**
- Modify: `server/tests/ladder.test.ts` (add integration-style tests)

#### Step 1: Add end-to-end ladder flow test

Add a test that exercises the full flow with mocked DB:

- Create match → complete match → verify snapshot written → verify leaderboard returns player

#### Step 2: Run full test suite

```bash
rtk pnpm -r test
```

Expected: All tests pass.

#### Step 3: Run typecheck and lint

```bash
rtk pnpm typecheck && rtk pnpm lint
```

Expected: Clean.

#### Step 4: Commit

```bash
rtk git add server/tests/ladder.test.ts
rtk git commit -m "test(ladder): add integration test for full Elo ladder flow"
```

---

## Task Dependency Graph

```text
Task 1 (bot_strategy column) ─┐
Task 2 (elo_snapshots table) ──┼── Task 4 (LadderService) ── Task 5 (wire to match) ── Task 6 (API routes) ─┬── Task 7 (Leaderboard UI)
Task 3 (Elo engine) ───────────┘                                                                             ├── Task 8 (Player stats UI)
                                                                                                              └── Task 9 (Integration test)
```

Tasks 1, 2, and 3 can be done in parallel. Task 4 depends on all three. Tasks 7, 8, 9 can be done in parallel after Task 6.
