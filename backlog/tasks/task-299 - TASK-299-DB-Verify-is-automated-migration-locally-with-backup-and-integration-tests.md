---
id: TASK-299
title: 'TASK-299 - DB: Verify is_automated migration locally with backup and integration tests'
status: Done
assignee: []
created_date: '2026-05-10'
updated_date: '2026-05-10'
labels:
  - database
  - testing
  - safety
dependencies:
  - TASK-297
  - TASK-298
priority: high
milestone: m-13
---

## Description

Before staging or production are touched, the migration must be proven correct locally with a pre-migration backup.

Work:
1. Take local DB backup using TASK-297 script
2. Apply migration to local dev DB
3. Verify column with psql spot-checks
4. Run full server test suite
5. Write integration test: seed is_automated=true match, assert excluded from leaderboard

## Acceptance Criteria

- [ ] AC-1: `bash scripts/maint/db-backup.sh --env local` exits 0 and creates file > 10 KB BEFORE migration runs
- [ ] AC-2: `pnpm --filter @phalanxduel/server db:migrate` exits 0; schema_migrations row confirmed
- [ ] AC-3: `SELECT count(*) FROM matches WHERE is_automated IS NULL` returns 0
- [ ] AC-4: `pnpm check` exits 0
- [ ] AC-5: Integration test seeds 2 human + 1 automated match; leaderboard query returns only human matches; test passes

## Definition of Done

- [ ] Local backup taken and path recorded
- [ ] `db:migrate` exits 0 against local dev DB
- [ ] Column confirmed: `is_automated | boolean | not null | default false`
- [ ] Existing row count unchanged pre/post migration
- [ ] `WHERE is_automated IS NULL` = 0 confirmed
- [ ] Leaderboard exclusion integration test written and passing
- [ ] `pnpm check` exits 0
- [ ] Committed on main
