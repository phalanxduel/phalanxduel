---
id: TASK-248.01
title: 'Phase 1A — Stats columns, expiry infra, and lobby counters'
status: Done
assignee: []
created_date: '2026-04-29 02:04'
updated_date: '2026-04-29 03:38'
labels:
  - phase-1
  - db
  - migration
  - server
milestone: m-3
dependencies: []
references:
  - server/src/db/schema.ts
  - server/src/db/match-repo.ts
  - server/src/match.ts
  - server/src/app.ts
parent_task_id: TASK-248
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Foundation task for the Public Match Discovery milestone. Adds the DB columns and server-side infrastructure that every subsequent Phase 1 task depends on.

## What to add

### DB schema additions (server/src/db/schema.ts + new migration)

`player_ratings` table:
- `abandons integer NOT NULL DEFAULT 0` — incremented when a player is forfeited for inactivity or explicitly abandons a game

`users` table:
- `matchesCreated integer NOT NULL DEFAULT 0` — incremented each time the user creates a public match
- `successfulStarts integer NOT NULL DEFAULT 0` — incremented when a public match transitions from `pending` to `active` (second player joins)

### Expiry background job (server/src/match-expiry.ts or inline in app.ts)

When a `public_open` match has `publicExpiresAt` in the past and `publicStatus = 'open'`, mark it `publicStatus = 'expired'`.
The job must run on server startup (to catch any matches that expired while the server was down) and then periodically (every 5 minutes is fine, or lazily on list-request if preferred).
Expiry does NOT count as an abandon for the initiating player.
A match can expire only from `status = 'pending'` (no second player yet). Once `active`, expiry does not apply.

### Match creation changes

When `createMatch` is called with `visibility: 'public_open'`:
- Set `publicExpiresAt = NOW() + 30 minutes`
- Set `publicStatus = 'open'`
- Increment `users.matchesCreated` for the creating user

When a public match transitions to `active` (second player joins via `joinMatch`):
- Increment `users.successfulStarts` for the creating user (player1)

## Key files

- `server/src/db/schema.ts` — add columns
- `server/src/db/` — add drizzle migration
- `server/src/db/match-repo.ts` — expiry update query, counter increments
- `server/src/match.ts` — wire counter increments into createMatch / joinMatch
- `server/src/app.ts` — schedule expiry job on startup
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 abandons column exists in player_ratings with default 0
- [ ] #2 matchesCreated and successfulStarts columns exist in users with default 0
- [ ] #3 Drizzle migration file present and applies cleanly
- [ ] #4 Creating a public_open match sets publicExpiresAt to now+30min and publicStatus to open
- [ ] #5 Joining a public match increments the creator's successfulStarts
- [ ] #6 Expired public matches (publicExpiresAt past, publicStatus=open) are marked expired within one expiry cycle
- [ ] #7 Expiry does not set any abandon flag on the initiating player
- [ ] #8 pnpm check passes
<!-- AC:END -->
