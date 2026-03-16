# Admin Console — Game Operations Panel

**Date:** 2026-03-16
**Status:** Approved
**Task:** TASK-47

## Problem

Operating a live game server requires context-switching across multiple
tools: WebSocket client for match creation, Neon console for DB queries,
curl for API calls, and no single view of what is running. As the number
of features grows (bot strategies, match parameters, Elo snapshots, replay
integrity hashes) the cognitive overhead of assembling a complete picture
becomes the bottleneck.

## Goal

A centralised game operations console that lets the operator:

- Trigger new matches with full parameter control in one form
- See live and recent matches in a single grid
- Drill into any match for state, transaction log, and integrity data
- Browse users and their gameplay history
- Run pre-built reports against the DB with the rendered SQL visible and
  copy-able for further analysis

## Architecture

### Deployment model

A new `admin/` pnpm workspace package, standalone from the game server.
Deployed as a separate Fly.io app. Connects directly to the same Neon
Postgres DB using its own connection pool. No runtime dependency on the
game server — the admin service reads and writes the DB directly.

### Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| API | Fastify (same as `server/`) | Consistent patterns, Drizzle ORM reuse |
| Frontend | Preact + Vite (same as `client/`) | Shared toolchain, Zod types from `@phalanxduel/shared` |
| DB | Drizzle ORM → Neon | Already modelled in `server/src/db/schema.ts` |
| Auth | Game JWT (shared secret) | No separate user store; admin flag on `users` row |
| Tooling | pnpm, Vitest, ESLint, Prettier | Identical to rest of monorepo |

### Package structure

```text
admin/
  src/
    server/
      routes/
        matches.ts     ← match list, match detail, create match
        users.ts       ← user list, user detail, password reset
        reports.ts     ← parameterised report queries + rendered SQL
      middleware/
        auth.ts        ← JWT verification + admin flag check
      index.ts         ← Fastify entry point, serves SPA static files
    client/
      pages/
        Dashboard.tsx      ← live + recent match grid, stat tiles
        MatchDetail.tsx    ← tabbed match inspection
        MatchCreator.tsx   ← full-parameter match creation form
        UserList.tsx
        UserDetail.tsx     ← gameplay history, Elo snapshots, password reset
        Reports.tsx        ← report selector, params, SQL block, result table
      components/
        DataTable.tsx      ← sortable/filterable table primitive
        SqlBlock.tsx       ← syntax-highlighted SQL with copy button
        StatBadge.tsx      ← coloured KV tile
        IntegrityBadge.tsx ← turnHash / fingerprint check indicator
      main.tsx
  vite.config.ts
  tsconfig.json
  package.json
```

## Authentication

1. Admin logs in with their existing game credentials (gamertag + password).
2. Admin API verifies the JWT using the shared `JWT_SECRET` env var.
3. On each request, middleware checks `users.is_admin = true` (new boolean
   column on the `users` table — additive migration).
4. Non-admin game accounts receive a 403.

> The `is_admin` column is the only schema change required in the game DB.

## Views

### Dashboard

Landing page. Two sections separated by a divider:

**Live matches** — polls `/admin-api/matches?status=active` every 30
seconds. Columns: truncated match ID (links to Match Detail), players,
current turn number, current phase (colour-coded), started-ago. Auto-refreshes without a full page reload.

**Recent matches** — last 20 completed/cancelled matches. Columns: match
ID, winner, victory type, turn count, ended-ago, integrity indicator (✓ or
✗ based on server-side turnHash re-verification), link to Match Detail.

**Stat tiles** above both tables: active count, today's match count, total
user count, bot match percentage.

### Match Creator

A form that exposes every parameter available at match creation time.

**Sections:**

1. **Opponent** — 3-button toggle: Bot Random / Bot Heuristic / Human
2. **Player** — name field pre-filled from logged-in user, with "Use my
   account" shortcut
3. **Grid & Hand** — rows (1–12), columns (1–12), max hand size. Initial
   Draw is read-only and auto-computed as `rows × columns + columns` with
   the formula shown inline. Validation mirrors `MatchParametersSchema`
   constraints (total slots ≤ 48, maxHandSize ≤ columns).
4. **Game Options** — damage mode (classic / cumulative), starting
   lifepoints (default 20)
5. **Advanced** — RNG seed (optional; blank = random). "Replay seed…"
   button to paste a seed from a previous match for deterministic replay.

A **preview panel** to the right shows the live JSON payload as fields
change, so the operator can see exactly what will be sent.

On submit the admin API inserts the match directly into the DB (mirroring
the game server's `createMatch` path) and redirects to the new match's
Detail page.

### Match Detail

Tabbed view. Header shows match ID, status, players, winner, victory type,
turn count, grid config.

| Tab | Content |
|---|---|
| Overview | Integrity card (turnHash count + fingerprint check), outcome KV table, transaction log preview (last 3 entries), match-scoped quick report buttons |
| Transaction Log | Full log table: sequence #, DSL action, phase-after, stateHash-after (truncated), turnHash (truncated), integrity check (✓/✗ per row) |
| Event Log | Flat event list: id, type, name, timestamp, status, payload toggle |
| Actions | Full action history in DSL notation with timestamps |
| Config | Full `MatchParameters` JSON, collapsible |

**DSL notation** (A:col:col, D:col:cardId, R:cardId, P, F) is used in
Transaction Log and Actions tabs — matches what is stored and is
independently verifiable.

### User List

Paginated table. Columns: gamertag (with suffix), email, Elo, match count,
last active, link to User Detail.

### User Detail

Header: gamertag, email, Elo, created date, admin flag toggle (operator
can grant/revoke admin on other users).

Sections:

- **Elo Snapshots** — table of snapshots by category (pvp, sp-random,
  sp-heuristic) with k-factor and window stats
- **Match History** — last 50 matches the user participated in, each
  linking to Match Detail
- **Actions** — password reset (generates a reset token logged to the
  audit trail); admin flag toggle

### Reports

Left sidebar lists pre-built reports grouped into three categories:

#### Matches

- Match history (parameterised by status, opponent type, limit)
- Victory type breakdown
- Turn length distribution
- Cancelled / abandoned

#### Players

- Win / loss by player
- Elo progression
- Human vs bot record

#### Integrity

- turnHash sweep (re-derive and compare every stored turnHash)
- Fingerprint audit (recompute event log fingerprints)
- Missing event logs (matches with null event_log column)

Each report page has:

1. **Description** — one sentence
2. **Parameters** — filters that update the rendered SQL live
3. **Rendered SQL block** — syntax-highlighted, single Copy button,
   reflects current parameter values exactly
4. **Run button** — executes via admin API
5. **Result table** — with row count, query time, Export CSV button; match
   ID cells link to Match Detail

## Data access model

- **Read:** All views read directly from Neon via Drizzle queries in the
  admin API routes.
- **Writes (targeted):** Create match, password reset, admin flag toggle.
  All writes are logged to a new `admin_audit_log` table
  (actor, action, target_id, timestamp, metadata JSONB) — additive
  migration.
- **No bulk deletes or schema mutations** through the admin UI.

## DB migrations required

| Column / table | Change |
|---|---|
| `users.is_admin` | `boolean NOT NULL DEFAULT false` — new column |
| `admin_audit_log` | New table: id, actor_id (FK users), action text, target_id uuid, metadata jsonb, created_at |

Both are purely additive. Old rows unaffected.

## Error handling

- API errors return `{ error, code }` matching the game server's
  `ErrorResponseSchema`.
- The SPA displays inline error states (not full-page crashes) so the
  operator can retry without losing context.
- DB connection failures surface a prominent banner rather than broken UI.

## Testing

- **Unit:** Admin API route handlers tested with Vitest + a test DB
  connection (same pattern as `server/tests/`).
- **Integration:** Key flows tested end-to-end: login, match creation,
  report execution.
- **No E2E browser automation** in the first iteration — manual verification
  is sufficient for a single-operator internal tool.

## Deployment

- New `fly.toml` at `admin/fly.toml` — separate Fly.io app in the same org.
- Shares `DATABASE_URL`, `JWT_SECRET` with the game server via Fly.io
  secrets.
- Dev: `pnpm --filter @phalanxduel/admin dev` starts Fastify + Vite dev
  server with proxy.

## Out of scope

- Real-time WebSocket push to the dashboard (polling every 30s is
  sufficient for v1)
- Custom report builder (pre-built reports with visible SQL cover the
  stated need)
- Role hierarchy beyond a single `is_admin` flag
- Mobile-optimised layout
