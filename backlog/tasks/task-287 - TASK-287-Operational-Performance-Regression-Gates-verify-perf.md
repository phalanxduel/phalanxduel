---
id: TASK-287
title: 'TASK-287 - Operational: Performance Regression Gates (verify:perf)'
status: To Do
assignee: []
created_date: '2026-05-08 02:07'
updated_date: '2026-05-08 02:08'
labels: []
dependencies:
  - TASK-286
ordinal: 140000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement automated benchmarking for MatchActor transitions and phase resolution with CI failure thresholds.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 pnpm verify:perf fails if p99 latency > 10ms
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
