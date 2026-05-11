---
id: TASK-298
title: 'TASK-298 - DB: Write migration 0001_add_is_automated.sql and update Drizzle schema'
status: Done
assignee: []
created_date: '2026-05-10'
updated_date: '2026-05-10'
labels:
  - database
  - schema
dependencies: []
priority: high
milestone: m-13
---

## Description

The `matches` table needs an `is_automated boolean NOT NULL DEFAULT false` column to gate agent matches out of competitive leaderboards.

Work:
1. Create `server/migrations/0001_add_is_automated.sql` with `ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_automated boolean NOT NULL DEFAULT false;`
2. Update `server/src/db/schema.ts` matches table: add `isAutomated: boolean('is_automated').notNull().default(false)`
3. Run `pnpm --filter @phalanxduel/server typecheck`

## Acceptance Criteria

- [ ] AC-1: Running `db:migrate` twice exits 0 both times (idempotent)
- [ ] AC-2: `psql $LOCAL_DATABASE_URL -c "\d matches" | grep is_automated` returns `is_automated | boolean | not null | default false`
- [ ] AC-3: `SELECT count(*) FROM matches WHERE is_automated IS NULL` returns 0 after migration
- [ ] AC-4: `pnpm --filter @phalanxduel/server typecheck` exits 0
- [ ] AC-5: `SELECT name FROM schema_migrations` includes `0001_add_is_automated`

## Definition of Done

- [ ] `server/migrations/0001_add_is_automated.sql` with `IF NOT EXISTS` guard
- [ ] `server/src/db/schema.ts` updated with `isAutomated` column
- [ ] Migration applied to local dev DB: `db:migrate` exits 0
- [ ] Column verified via psql
- [ ] `pnpm check` exits 0
- [ ] Committed on main
