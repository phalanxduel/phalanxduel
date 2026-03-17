---
id: TASK-47
title: Admin Console — Game Operations Panel
status: Human Review
assignee:
  - '@claude'
created_date: '2026-03-16 04:19'
updated_date: '2026-03-17 21:17'
labels: []
dependencies: []
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Operators previously had no dedicated tool for production visibility. Inspecting
a match required the Neon console for raw SQL, a WebSocket client for live state,
and curl for REST calls. There was no way to create a match without a player
browser session, reset a password without a DB migration, or audit turnHash
integrity across completed games without hand-crafting a query.

This task adds a standalone `admin/` pnpm workspace package — a Fastify API plus
a Preact SPA — that gives operators a single UI for all of these operations.

### Why a separate service (not a route on the game server)

The game server's job is match authority. Adding admin routes there would couple
two very different security surfaces: player-facing WebSocket state with
operator write access to user records. A separate Fly.io app on the private
network keeps the blast radius of a misconfigured admin endpoint away from
the game server, and lets the admin service be stopped independently without
affecting live matches.

### Why it reads Neon directly (not via game server API)

The game server only exposes the state that players need. Replaying the full
transaction log, reading raw JSONB event entries, querying ELO snapshots, and
running report queries would all require new game-server endpoints that serve no
player purpose and increase the attack surface. The admin service connects to
the same Neon DB with its own connection pool and reads what it needs directly
via Drizzle ORM.

### Why match creation proxies to the game server

Match state is authoritative on the game server's in-memory `MatchManager`. If
the admin service wrote directly to the DB, the game server would have no
knowledge of the match and WebSocket joining would fail. The `POST
/internal/matches` endpoint (added in this task) lets the admin service create
matches via the game server while keeping a single point of authority for match
state.

### Auth model

The admin SPA logs in with game credentials (email + password). The login route
proxies to the game server's `/api/auth/login`, takes the returned JWT, verifies
it locally (shared `JWT_SECRET`), and sets it as an `httpOnly` cookie named
`admin_token`. Every subsequent admin API request re-verifies the JWT and
additionally checks `users.is_admin = true` in the DB. The double-check means
a valid token alone is not enough — the flag can be revoked without waiting for
token expiry.

### Audit trail

All write operations (create match, reset password, toggle admin flag) write a
row to the new `admin_audit_log` table so every operator action is attributable
and time-stamped.

---

## What was built

### Game server additions

| File | Change |
|---|---|
| `server/src/db/schema.ts` | Added `is_admin boolean` to `users`; added `admin_audit_log` table |
| `server/drizzle/0004_cute_killraven.sql` | Generated migration; includes CHECK constraint on `action` enum |
| `server/src/middleware/internal-auth.ts` | Validates `ADMIN_INTERNAL_TOKEN` Bearer header; timing-safe comparison |
| `server/src/routes/internal.ts` | `POST /internal/matches` — headless match creation; null-socket for bot matches |
| `server/src/app.ts` | Registers `registerInternalRoutes(app, matchManager)` |
| `server/tests/internal.test.ts` | 3 auth tests (missing header → 401, wrong token → 401, correct → 201) |

### New `admin/` package

**Fastify API routes** (`/admin-api/` prefix, all require valid `admin_token`
cookie + `is_admin = true`):

| Method | Path | Description |
|---|---|---|
| `POST` | `/admin-api/auth/login` | Proxy to game server login; set `admin_token` httpOnly cookie |
| `POST` | `/admin-api/auth/logout` | Clear `admin_token` cookie |
| `GET` | `/admin-api/matches` | Match list; `?status=active\|completed\|all&limit=N` |
| `GET` | `/admin-api/matches/:matchId` | Full match detail incl. `transaction_log`, `event_log`, `config`, `state` |
| `POST` | `/admin-api/matches` | Create match (proxies to game server `POST /internal/matches`); writes audit log |
| `GET` | `/admin-api/users` | Paginated user list with JOIN-computed `match_count` and `last_match_at` |
| `GET` | `/admin-api/users/:userId` | User + last 50 matches + all ELO snapshots |
| `POST` | `/admin-api/users/:userId/reset-password` | Generates random temp password, bcrypt-hashes, updates DB, writes audit log |
| `PATCH` | `/admin-api/users/:userId/admin` | Toggle `is_admin`; self-revocation guard returns 400 |
| `GET` | `/admin-api/reports` | List of 10 pre-built reports (without `buildSql`) |
| `GET` | `/admin-api/reports/:reportId/sql` | Render report SQL with validated query params |
| `POST` | `/admin-api/reports/:reportId/run` | Execute report; return rows, rowCount, durationMs, rendered SQL |

**Preact SPA — screens and hash routes:**

| Hash route | Screen | Key content |
|---|---|---|
| `#/login` | Login | Email + password form; proxies to `/admin-api/auth/login` |
| `#/` | Dashboard | 4 stat badges (active matches, today's count, user count, bot %); live matches table; recent matches table with `IntegrityBadge`; polls every 30 s |
| `#/matches/new` | Match Creator | Full-parameter form: player name, opponent (bot-random / human; bot-heuristic disabled with tooltip), grid size (rows × columns), max hand size, damage mode, starting lifepoints, RNG seed; live JSON payload preview; warns if total slots > 48 |
| `#/matches/:id` | Match Detail | Header (status, players, winner); tabbed: Overview (turnHash coverage, event log fingerprint), Transaction Log (DSL notation, stateHash, turnHash, integrity badge per entry), Event Log (id, type, name, status, timestamp), Config (raw JSON) |
| `#/users` | User List | DataTable: gamertag (link), email, ELO, match count, last match date, admin flag |
| `#/users/:id` | User Detail | Header; Reset Password button (shows temp password once); Grant/Revoke Admin button; ELO snapshots table; match history table (links to Match Detail) |
| `#/reports` | Reports | Sidebar grouped by category; param controls update SQL preview live; Run button executes; Export CSV; match ID cells link to Match Detail |

**Pre-built reports (10 total):**

| Category | Report |
|---|---|
| Matches | Match history (status + opponent filters) |
| Matches | Victory type breakdown |
| Matches | Turn length distribution |
| Matches | Cancelled / abandoned matches |
| Players | Win / loss by player |
| Players | ELO progression |
| Players | Human vs bot record |
| Integrity | turnHash sweep (entries missing `turnHash`) |
| Integrity | Fingerprint audit (event log without fingerprint) |
| Integrity | Missing event logs (completed matches, null `event_log`) |

**Shared components:** `DataTable`, `SqlBlock` (syntax-highlighted, copy button),
`StatBadge`, `IntegrityBadge` (✓/✗ with hash tooltip on failure).

**Deployment:** `admin/fly.toml` — app `phalanxduel-admin`, `ord` region,
`shared-cpu-1x` / 256 MB. No public hostname; access via
`fly proxy 3002 --app phalanxduel-admin`.

Required Fly.io secrets: `DATABASE_URL`, `JWT_SECRET`,
`GAME_SERVER_INTERNAL_URL`, `ADMIN_INTERNAL_TOKEN`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

- ~~Given the admin package exists, when built, then it produces a standalone
  Fastify server and Vite SPA with no runtime dependency on the game server.~~ ✓
  Done — `admin/` is an independent pnpm workspace; `pnpm --filter
  @phalanxduel/admin build` succeeds.
- ~~Given a user with `is_admin = true` on their DB row, when they log in with
  their game credentials, then they gain access to the admin console.~~ ✓ Done
  — login proxies to game server; JWT verified; `is_admin` checked on every
  subsequent request.
- ~~Given the Dashboard is loaded, when matches are active, then they appear in
  a live grid alongside the last N completed games.~~ ✓ Done — polls every 30 s
  via `setInterval` in a `useEffect`.
- ~~Given the Match Creator form is submitted with valid parameters, then a new
  match is created via the game server's `POST /internal/matches` endpoint and
  the browser redirects to its Match Detail page.~~ ✓ Done.
- ~~Given a Match detail page is opened, then the transaction log entries display
  `turnHash` with an integrity status indicator.~~ ✓ Done — Transaction Log tab
  shows DSL notation, stateHash, and `IntegrityBadge` per entry.
- ~~Given a Report page is opened, then the rendered SQL is visible and copyable
  alongside the result set.~~ ✓ Done — `SqlBlock` component with copy button;
  SQL updates live as params change.
- ~~Given a User detail page is opened, then a password reset action is available
  and leaves an audit trail.~~ ✓ Done — writes to `admin_audit_log`; temp
  password shown once.

## Verification

Steps a reviewer must complete before marking Done.

### 1. Automated tests pass

```bash
pnpm -r test
```

Expected counts: shared 45, engine 129, client 207, server 200, admin 4 = **585
total**. Key tests that directly cover new code:

- `server/tests/internal.test.ts` — 3 tests: missing token → 401, wrong token →
  401, correct token → 201 with `{ matchId }`.
- `admin/tests/routes/matches.test.ts` — unauthenticated → 401, authenticated →
  200 array.
- `admin/tests/routes/users.test.ts` — self-revocation guard returns 400 with
  code `SELF_REVOCATION_FORBIDDEN`.

### 2. Typecheck clean across all packages

```bash
pnpm -r typecheck
```

Expected: no errors in any package (shared, engine, client, server, admin).

### 3. DB migration applied

```bash
DATABASE_URL="..." pnpm --filter @phalanxduel/server db:migrate
```

Confirm by querying:

```sql
-- Column exists:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'is_admin';

-- Table exists:
SELECT table_name FROM information_schema.tables
WHERE table_name = 'admin_audit_log';
```

### 4. Internal endpoint auth (curl smoke test — requires game server running)

```bash
# Should return 401
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/internal/matches \
  -H "Content-Type: application/json" \
  -d '{"playerName":"Test","opponent":"bot-random"}'

# Should return 201 when ADMIN_INTERNAL_TOKEN is set correctly
curl -s -X POST http://localhost:3001/internal/matches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_INTERNAL_TOKEN>" \
  -d '{"playerName":"Test","opponent":"bot-random"}'
```

Expected: first returns `401`, second returns `{"matchId":"<uuid>"}`.

### 5. SPA screen walkthrough (requires both servers running)

Start game server (`pnpm --filter @phalanxduel/server dev`) and admin service
(`pnpm --filter @phalanxduel/admin dev`). Open `http://localhost:5173`.

| Step | Action | Expected |
|---|---|---|
| Login | Submit with non-admin credentials | Redirect fails or 403 |
| Login | Submit with `is_admin = true` account | Redirect to `#/` Dashboard |
| Dashboard | Wait for load | Stat badges visible; active/recent match tables present |
| New Match | Fill form, set opponent = Bot Random, submit | Redirect to `#/matches/<id>` |
| Match Detail | Click Transaction Log tab | Entries show DSL notation + `turnHash` column |
| Users | Navigate to `#/users` | Table with gamertag links visible |
| User Detail | Click a user, click Reset Password | Temp password shown; second click shows new value |
| Self-revocation | On own User Detail, toggle Admin | Server returns error; button feedback shown |
| Reports | Navigate to `#/reports`, select "turnHash sweep", click Run | SQL visible; rows returned (may be empty) |

### 6. Schema field in `TransactionLogEntrySchema`

```bash
grep -n "turnHash" shared/src/schema.ts admin/src/server/routes/matches.ts
```

Expected: hits in both files confirming the field flows from schema → API
response → SPA.

## References

- `admin/src/server/index.ts` — Fastify app factory (`buildAdminApp`)
- `admin/src/server/middleware/auth.ts` — `requireAdmin` (JWT + DB flag check)
- `admin/src/server/routes/` — `login.ts`, `matches.ts`, `users.ts`, `reports.ts`
- `admin/src/client/main.tsx` — hash router + `App` component
- `admin/src/client/pages/` — all 7 SPA pages
- `server/src/middleware/internal-auth.ts` — timing-safe Bearer token validation
- `server/src/routes/internal.ts` — `POST /internal/matches`
- `server/drizzle/0004_cute_killraven.sql` — `is_admin` column + `admin_audit_log` table
- `admin/fly.toml` — Fly.io deployment config
- `docs/superpowers/plans/2026-03-16-admin-console.md` — implementation plan
- `docs/superpowers/specs/` — design spec and review
