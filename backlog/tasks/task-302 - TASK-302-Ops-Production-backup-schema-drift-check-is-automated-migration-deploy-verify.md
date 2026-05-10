---
id: TASK-302
title: 'TASK-302 - Ops: Production backup, schema drift check, is_automated migration, deploy, verify'
status: To Do
assignee: []
created_date: '2026-05-10'
updated_date: '2026-05-10'
labels:
  - ops
  - production
  - database
  - safety
dependencies:
  - TASK-297
  - TASK-301
priority: high
milestone: m-13
---

## Description

Final production deployment of is_automated. Staging is green (TASK-301). Schema drift across all three environments must be zero before migration runs. Backup must be verified before any migration command executes.

STOP AND VERIFY before each destructive step.

Work:
1. Schema drift checks: dev→staging, staging→production (both must be zero)
2. Production backup (verify: size, table count, valid SQL header)
3. Record pre-migration row count
4. Apply migration to production
5. Verify column
6. Deploy app to production
7. Health check + leaderboard spot-check
8. Post-deploy drift check: dev→production

## Acceptance Criteria

- [ ] AC-1: `pnpm tsx scripts/maint/db-schema-diff.ts --from development --to staging` exits 0
- [ ] AC-2: `pnpm tsx scripts/maint/db-schema-diff.ts --from staging --to production` exits 0. STOP if either drift check fails.
- [ ] AC-3: Production backup exits 0, file > 10 KB, table count matches live \dt count, path recorded
- [ ] AC-4: Pre-migration production row count recorded
- [ ] AC-5: `APP_ENV=production pnpm --filter @phalanxduel/server db:migrate` exits 0; schema_migrations row confirmed
- [ ] AC-6: `psql $PROD_DATABASE_URL -c "\d matches" | grep is_automated` returns expected column
- [ ] AC-7: `APP_ENV=production bash scripts/release/deploy-fly.sh` exits 0
- [ ] AC-8: `pnpm tsx scripts/health-check.ts production` exits 0
- [ ] AC-9: Row count unchanged; `WHERE is_automated IS NULL` returns 0
- [ ] AC-10: Known human player appears in production leaderboard (no regression)
- [ ] AC-11: `pnpm tsx scripts/maint/db-schema-diff.ts --from development --to production` exits 0 post-deploy

## Definition of Done

- [ ] Drift check dev→staging exits 0 (recorded)
- [ ] Drift check staging→production exits 0 (recorded)
- [ ] Production backup file path and table count recorded
- [ ] Pre-migration row count recorded
- [ ] `db:migrate` exits 0 on production; schema_migrations row confirmed
- [ ] Column verified via psql on production
- [ ] Post-migration row count equals pre-migration count
- [ ] `WHERE is_automated IS NULL` returns 0
- [ ] `deploy-fly.sh` exits 0 for production
- [ ] Production health check passes
- [ ] Leaderboard spot-checked with known human player
- [ ] Post-deploy drift check dev→production exits 0
- [ ] All command outputs in deployment log
- [ ] Rollback procedure documented: `psql $PROD_DATABASE_URL -f <backup-file>`
