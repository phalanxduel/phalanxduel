---
id: TASK-301
title: 'TASK-301 - Ops: Apply is_automated migration to staging, deploy, smoke test'
status: In Progress
assignee: []
created_date: '2026-05-10'
updated_date: '2026-05-15 04:13'
labels:
  - ops
  - staging
  - database
milestone: m-13
dependencies:
  - TASK-299
  - TASK-300
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Migration and app code verified locally. This task proves the full sequence on staging before production is touched. Includes schema drift check.

Work:
1. Schema drift check: dev→staging (must be zero before proceeding)
2. Backup staging DB
3. Record pre-migration row count
4. Apply migration to staging
5. Verify column
6. Deploy app to staging via `deploy-fly.sh`
7. Smoke tests
8. Post-deploy drift check: dev→staging
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

- [ ] AC-1: `pnpm tsx scripts/maint/db-schema-diff.ts --from development --to staging` exits 0, no drift. STOP if drift found.
- [ ] AC-2: Staging backup exits 0, file > 10 KB, path recorded
- [ ] AC-3: Pre-migration row count recorded
- [ ] AC-4: `APP_ENV=staging pnpm --filter @phalanxduel/server db:migrate` exits 0; schema_migrations row confirmed
- [ ] AC-5: `psql $STAGING_DATABASE_URL -c "\d matches" | grep is_automated` returns expected column
- [ ] AC-6: `APP_ENV=staging bash scripts/release/deploy-fly.sh` exits 0
- [ ] AC-7: `pnpm tsx scripts/health-check.ts staging` exits 0
- [ ] AC-8: Row count unchanged post-migration
- [ ] AC-9: `WHERE is_automated IS NULL` returns 0 on staging
- [ ] AC-10: Staging leaderboard endpoint returns HTTP 200 with results
- [ ] AC-11: Post-deploy `pnpm tsx scripts/maint/db-schema-diff.ts --from development --to staging` exits 0

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Execution Plan

**Pre-condition gap found:** staging missing match_comments soft-delete columns + creator_ip.
**Resolution:** apply 0003 + 0004 (new catchup) before 0001 (is_automated).

Revised steps:
1. Drift check dev→staging — confirmed drift (expected + match_comments gap)
2. Write 0004_staging_catchup.sql — adds is_removed, removed_at, removal_reason to match_comments ✓
3. Backup staging DB
4. Record pre-migration row count
5. Apply migrations to staging: 0002 already applied; 0003, 0004, 0001 pending
6. Verify is_automated column + null check
7. Deploy: APP_ENV=staging deploy-fly.sh
8. Health check + leaderboard spot-check
9. Post-deploy drift check dev→staging — must be 0

Note: script uses --base/--target flags, not --from/--to as written in AC.
<!-- SECTION:PLAN:END -->

## Definition of Done

- [ ] Pre-migration drift check exits 0 (recorded)
- [ ] Staging backup file path recorded
- [ ] Pre-migration row count recorded
- [ ] `db:migrate` exits 0 on staging; schema_migrations row confirmed
- [ ] Column verified via psql on staging
- [ ] Row count unchanged; no nulls
- [ ] `deploy-fly.sh` exits 0 for staging
- [ ] Health check passes
- [ ] Leaderboard HTTP 200 with results
- [ ] Post-deploy drift check exits 0
- [ ] All outputs recorded in PR/deployment log
