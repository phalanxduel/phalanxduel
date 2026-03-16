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
Deployed as a separate Fly.io app on the Fly.io private network
(`fly-local-6pn`), not exposed on a public hostname. Connects directly to
the same Neon Postgres DB using its own connection pool.

**One deliberate exception to standalone isolation:** match creation is
delegated to the game server via a new thin REST endpoint
(`POST /internal/matches`), rather than duplicating the match
initialisation logic (PRNG seeding, initial state construction, bot
scheduling, event log setup). This keeps the game server as the sole
authority over match state. The admin service calls this endpoint at submit
time; for all other operations it reads/writes the DB directly.

### Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| API | Fastify (same as `server/`) | Consistent patterns, Drizzle ORM reuse |
| Frontend | Preact + Vite | Shares Vite/pnpm toolchain; Preact is new to this package |
| DB | Drizzle ORM → Neon | Already modelled in `server/src/db/schema.ts` |
| Auth | Game JWT (shared secret) | No separate user store; admin flag on `users` row |
| Tooling | pnpm, Vitest, ESLint, Prettier | Identical to rest of monorepo |

### Package structure

```text
admin/
  src/
    server/
      routes/
        matches.ts     ← match list, match detail, integrity checks
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

### Login flow

1. The admin SPA presents a login form (gamertag + password).
2. The admin API proxies the credentials to the game server's existing
   `POST /auth/login` endpoint (game server is the auth authority).
3. On success, the game server returns a signed JWT. The admin API sets it
   as an `httpOnly; Secure; SameSite=Strict` cookie and returns a 200.
4. On every subsequent admin API request, middleware reads the cookie,
   verifies the JWT with the shared `JWT_SECRET`, then queries the DB to
   confirm `users.is_admin = true`.
5. Non-admin game accounts receive 403. Expired JWTs receive 401 and the
   SPA redirects to login.

The JWT is stored in an httpOnly cookie (not localStorage) to prevent XSS
exposure. Token lifetime matches the game server's existing setting.

## Views

### Dashboard

Landing page. Two sections separated by a divider:

**Live matches** — polls `/admin-api/matches?status=active` every 30
seconds. Columns: truncated match ID (links to Match Detail), players,
current turn number, current phase (colour-coded), started-ago.
Auto-refreshes without a full page reload.

**Recent matches** — last 20 completed/cancelled matches. Columns: match
ID, winner, victory type, turn count, ended-ago, integrity indicator (✓ or
✗ — see Integrity section below), link to Match Detail.

**Stat tiles** above both tables: active count, today's match count, total
user count, bot match percentage.

### Match Creator

A form that exposes every parameter available at match creation time.

**Sections:**

1. **Opponent** — 3-button toggle: Bot Random / Human. Bot Heuristic
   button is rendered but disabled with a tooltip "Not yet implemented"
   until Deployment C ships (see `docs/plans/2026-03-04-deployable-increments.md`).
2. **Player** — name field pre-filled from logged-in user's gamertag, with
   "Use my account" shortcut.
3. **Grid & Hand** — rows (1–12), columns (1–12), max hand size. Initial
   Draw is read-only and auto-computed as `rows × columns + columns` with
   the formula shown inline. Client-side validation enforces the full
   `MatchParametersSchema` constraint set from `shared/src/schema.ts`:
   - Total slots (`rows × columns`) ≤ 48
   - `maxHandSize` ≤ `columns`
   - `initialDraw` must equal `rows × columns + columns` (computed, not
     user-editable)
4. **Game Options** — damage mode (classic / cumulative), starting
   lifepoints (default 20).
5. **Advanced** — RNG seed (optional; blank = random). "Replay seed…"
   button to paste a seed from a previous match for deterministic replay.

A **preview panel** to the right shows the live JSON payload as fields
change. On submit the admin API calls `POST /internal/matches` on the game
server, then redirects to the new match's Detail page.

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

Paginated table. Columns: gamertag (with suffix), email, Elo, match count
(derived: `COUNT` of `matches` rows where `player_1_id` or `player_2_id`
equals user id), last match date (derived: `MAX(matches.created_at)` for
the same condition), link to User Detail.

These are query-time aggregations — not denormalized columns.

### User Detail

Header: gamertag, email, Elo, created date, admin flag toggle (operator
can grant/revoke admin on other users).

Sections:

- **Elo Snapshots** — table of snapshots by category (pvp, sp-random,
  sp-heuristic). Columns map directly to `eloSnapshots` schema:
  `computedAt`, `elo`, `kFactor`, `windowDays`, `matchesInWindow`,
  `winsInWindow`.
- **Match History** — last 50 matches the user participated in, each
  linking to Match Detail.
- **Actions** — password reset (generates a one-time token, records to
  audit log); admin flag toggle (also recorded to audit log).

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
- Missing event logs (matches with null `event_log` column)

Each report page has:

1. **Description** — one sentence
2. **Parameters** — filters that update the rendered SQL live
3. **Rendered SQL block** — syntax-highlighted, single Copy button,
   reflects current parameter values exactly
4. **Run button** — executes via admin API
5. **Result table** — with row count, query time, Export CSV button; match
   ID cells link to Match Detail

## Integrity verification

The Dashboard integrity indicator and the Transaction Log tab both
re-derive `turnHash` values client-side to verify stored entries.

**Algorithm:** `computeTurnHash(stateHashAfter, eventIds)` from
`@phalanxduel/shared/hash` (formula: `SHA-256(stateHashAfter + ":" + eventIds.join(":"))`
as documented in `RULES.md §20.2`). The admin client imports this function
directly from the shared package — no game server call required.

For the event log fingerprint: `SHA-256` of the sorted-key JSON of the
events array, as defined in `MatchEventLogSchema` (`shared/src/schema.ts`).

A ✓ means the re-derived value matches the stored value. A ✗ means
divergence — displayed with the expected vs. actual hash truncated to 12
chars for comparison.

## Data access model

- **Read:** All views read directly from Neon via Drizzle queries in the
  admin API routes.
- **Writes (targeted):** Three write operations exist:
  1. **Create match** — proxied to game server `POST /internal/matches`
  2. **Password reset** — updates `users.password_hash` directly
  3. **Admin flag toggle** — updates `users.is_admin` directly
  All writes are recorded to `admin_audit_log` (see Migrations).
- **No bulk deletes or schema mutations** through the admin UI.
- **Self-revocation guard:** An operator may not revoke their own `is_admin`
  flag. The toggle is hidden on the operator's own User Detail page.

## DB migrations required

Run via the existing Drizzle migration workflow (`pnpm --filter
@phalanxduel/server db:migrate`), which applies all pending SQL files in
`server/drizzle/`.

| Column / table | Change |
|---|---|
| `users.is_admin` | `boolean NOT NULL DEFAULT false` — additive column |
| `admin_audit_log` | New table (see schema below) |

```sql
CREATE TABLE admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID NOT NULL REFERENCES users(id),
  action      TEXT NOT NULL CHECK (action IN (
                'create_match', 'reset_password', 'toggle_admin'
              )),
  target_id   UUID,           -- user id or match id depending on action
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Both migrations are purely additive. Old rows unaffected.

## Error handling

- API errors return `{ error, code }` matching the game server's
  `ErrorResponseSchema` from `@phalanxduel/shared`.
- The SPA displays inline error states (not full-page crashes) so the
  operator can retry without losing context.
- DB connection failures surface a prominent banner rather than broken UI.
- If the game server `POST /internal/matches` is unreachable, the Match
  Creator shows an inline error and does not redirect.

## Testing

- **Unit:** Admin API route handlers tested with Vitest + a test DB
  connection (same pattern as `server/tests/`).
- **Integration:** Key flows tested end-to-end: login, match creation via
  game server proxy, report execution.
- **No E2E browser automation** in the first iteration — manual verification
  is sufficient for a single-operator internal tool.

## Deployment

- New `fly.toml` at `admin/fly.toml` — separate Fly.io app in the same
  org, bound to the private network only (no public hostname).
- Shares `DATABASE_URL`, `JWT_SECRET`, `GAME_SERVER_INTERNAL_URL` with the
  game server via Fly.io secrets.
- Dev: `pnpm --filter @phalanxduel/admin dev` starts Fastify + Vite dev
  server with proxy.
- The game server gains one new env var: `ADMIN_INTERNAL_TOKEN` — a shared
  secret used to authenticate calls from the admin service to
  `POST /internal/matches`. The admin service sends it as
  `Authorization: Bearer <token>`; the game server's internal route
  middleware validates it before processing the request.

## Out of scope

- Real-time WebSocket push to the dashboard (polling every 30s is
  sufficient for v1)
- Custom report builder (pre-built reports with visible SQL cover the
  stated need)
- Role hierarchy beyond a single `is_admin` flag
- Mobile-optimised layout
- Public hostname for the admin service (private network only in v1)
