---
id: TASK-231
title: TASK-231 - Improve Database Migration Determinism and Reliability
status: Done
assignee: []
created_date: '2026-04-13 03:25'
updated_date: '2026-05-01 10:00'
labels: []
milestone: Post-Promotion Hardening
dependencies: []
priority: high
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Address the unreliability of Drizzle migrations in production/staging environments. Currently, migrations can be silently skipped or fail without clear error propagation, leading to schema discrepancies (e.g., missing 'match_actions' table). Documentation and observations from recent deployment failures suggest that the current Drizzle + JSON-snapshot approach is less deterministic than Rails-style migrations.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Migration runner fails loudly if a migration script fails or is skipped inappropriately.
- [x] #2 Migration folder presence is verified before the runner executes.
- [x] #3 The number of applied migrations is logged and verifiable against the filesystem count.
- [x] #4 A decision record or documentation is added comparing Drizzle, dbmate, and Prisma for future architectural changes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit 'server/src/db/migrate.ts' to ensure it uses absolute paths and fails on any error.
2. Add a verification step to the migration script that queries the database for the expected table count or a known schema version.
3. Research 'dbmate' as a lightweight, reliable alternative that doesn't rely on TypeScript/JSON snapshots.
4. Document the comparison and decide on the long-term migration strategy.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Recent Observations:
1. Drizzle reported 'Migrations complete' even when the 'match_actions' table was missing in production.
2. The 'release_command' in Fly.io runs the JS bundle of the migrator, which may have silent failure modes if paths aren't resolved correctly or if snapshots are out of sync.
3. Lack of a simple, Rails-style 'schema_migrations' versioning that is independent of ORM state.

Recommendations:
- Harden existing Drizzle runner: Add explicit checks for file counts vs DB records.
- Evaluate dbmate: Use a language-agnostic binary for absolute determinism using plain SQL.
- Evaluate Prisma: Switch to a more integrated migration engine if Drizzle remains brittle.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
migrations.ts: added directory existence and emptiness guards (throw Error with clear message if MIGRATIONS_DIR missing or empty). migrate.ts: added pre-run inventory log (N files on disk, M recorded in DB) and post-run count assertion (throws if appliedCount != migrations.length after loop). docs/architecture/migration-strategy.md: decision record comparing Drizzle built-in, dbmate, and Prisma; documents why custom SQL runner was retained and when to revisit. DoD item 2 (production verification) deferred until next deploy.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Decision record on migration tool choice (Keep Drizzle vs. Migrate) is recorded.
- [ ] #2 Production deployment verified with the improved migration logic.
<!-- DOD:END -->
