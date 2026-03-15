---
id: TASK-45.4
title: Event Log Persistence
status: To Do
assignee: []
created_date: '2026-03-15 18:09'
updated_date: '2026-03-15 18:09'
labels:
  - event-log
  - database
  - persistence
dependencies:
  - TASK-45.3
references:
  - server/src/db/match-repo.ts
  - server/src/db/schema.ts
  - server/src/match.ts
parent_task_id: TASK-45
priority: high
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-45.3 assembles the full `MatchEventLog` in memory. This task persists it
to the database so it survives server restarts and can be queried by the HTTP
API (TASK-45.5).

The existing `match-repo.ts` already saves match state (game state + action
history) after each action. This task extends that save path to also persist
the `MatchEventLog` (or the event array that feeds it) as a JSON column on
the matches table, plus the `fingerprint` as a separate indexed column for
quick integrity checks.

### Design choice: store derived events or re-derive on read?

Two options:

**A. Store the full event array** — fastest reads, immutable after game-over,
fingerprint trivially verifiable. Downside: larger DB storage.

**B. Re-derive on every read** from stored `transactionLog` — no extra storage,
but re-derivation adds latency on the read path and requires the derivation
logic to be stable across deploys.

**Recommendation: A** — store the full event array. The event log is the
audit artifact; it must be immutable and point-in-time accurate. If the
derivation logic ever changes, older logs still reflect what was computed at
game time. Store `event_log` (JSONB) and `event_log_fingerprint` (text).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 After a match reaches `gameOver`, the `MatchEventLog` is stored in the
  database with the `fingerprint` and `generatedAt` timestamp.
- [ ] #2 `match-repo.ts` exposes `saveEventLog(matchId, log)` and
  `getEventLog(matchId): MatchEventLog | null`.
- [ ] #3 The stored fingerprint matches the value computed by
  `buildMatchEventLog` for the same match (tested).
- [ ] #4 A DB migration adds `event_log` (JSONB/TEXT) and
  `event_log_fingerprint` (TEXT) columns to the matches table.
- [ ] #5 `getEventLog` for an in-progress match returns the partial log built
  so far (lifecycle events + completed turns), not null.
- [ ] #6 `pnpm --filter @phalanxduel/server test` passes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Write and run a DB migration adding to the matches table:
   ```sql
   ALTER TABLE matches
     ADD COLUMN event_log JSONB,
     ADD COLUMN event_log_fingerprint TEXT;
   ```

2. In `server/src/db/schema.ts`, add the two new columns to the matches schema.

3. In `server/src/db/match-repo.ts`:
   - Add `saveEventLog(matchId: string, log: MatchEventLog): Promise<void>`
   - Add `getEventLog(matchId: string): Promise<MatchEventLog | null>`

4. In `server/src/match.ts`, call `this.matchRepo.saveEventLog` after
   `buildMatchEventLog` — trigger this on `gameOver` (existing hook at line ~499)
   and also after each action to keep the partial log current.

5. Write a server integration test: play a complete match to `gameOver`, call
   `getEventLog`, verify the fingerprint matches, verify event count > 0.
<!-- SECTION:PLAN:END -->

## Risks and Unknowns

- If saving the event log per action (step 4) is too chatty for the DB, consider
  saving only on `gameOver` and computing the partial log in memory for in-progress
  queries. Profile before optimising.
- Existing `saveMatch` already saves `transactionLog` — check for double-storage
  overlap and consider whether `transactionLog` can be removed from the primary
  save path once the event log is the canonical record. Defer this clean-up to
  avoid scope creep.
- JSONB vs TEXT: if the DB is SQLite (as used in the Neon baseline), use TEXT
  with JSON serialization. If Postgres/Neon, prefer JSONB for queryability.

## Verification

```bash
pnpm --filter @phalanxduel/server test
pnpm typecheck
pnpm lint
pnpm check:ci
```
