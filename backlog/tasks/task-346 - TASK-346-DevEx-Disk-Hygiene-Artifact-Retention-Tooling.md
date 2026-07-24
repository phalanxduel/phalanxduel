---
id: TASK-346
title: 'TASK-346 - DevEx: Disk Hygiene & Artifact Retention Tooling'
status: Done
assignee:
  - '@codex'
created_date: '2026-07-24 23:13'
updated_date: '2026-07-24 23:40'
labels: []
dependencies: []
ordinal: 211800
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 bin/maint/clean-disk.sh supports --dry-run, --days, and --full modes to prune ephemeral test artifacts, root log files, and caches; package.json exposes pnpm maint:clean-disk; report-diagnostics.sh warns when artifacts exceed storage threshold; verified with dry-run and live tests.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
