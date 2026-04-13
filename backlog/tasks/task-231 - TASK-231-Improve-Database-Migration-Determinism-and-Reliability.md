---
id: TASK-231
title: TASK-231 - Improve Database Migration Determinism and Reliability
status: Planned
assignee: []
created_date: '2026-04-13 03:25'
labels: []
milestone: Production Readiness
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Address the unreliability of Drizzle migrations in production/staging environments. Currently, migrations can be silently skipped or fail without clear error propagation, leading to schema discrepancies (e.g., missing 'match_actions' table). Documentation and observations from recent deployment failures suggest that the current Drizzle + JSON-snapshot approach is less deterministic than Rails-style migrations.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Migration runner fails loudly if a migration script fails or is skipped inappropriately.
- [ ] #2 Migration folder presence is verified before the runner executes.
- [ ] #3 The number of applied migrations is logged and verifiable against the filesystem count.
- [ ] #4 A decision record or documentation is added comparing Drizzle, dbmate, and Prisma for future architectural changes.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Decision record on migration tool choice (Keep Drizzle vs. Migrate) is recorded.
- [ ] #2 Production deployment verified with the improved migration logic.
<!-- DOD:END -->
