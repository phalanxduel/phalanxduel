---
id: TASK-345.08
title: Prove Production Resilience Before Multi-Machine Scale
status: To Do
assignee: []
created_date: '2026-07-14 00:17'
updated_date: '2026-07-14 00:17'
labels:
  - production
  - scaling
  - reliability
dependencies:
  - TASK-345.07
references:
  - 'https://fly.io/docs/apps/app-availability/'
documentation:
  - docs/architecture/principles.md
  - docs/ops/runbook.md
  - bin/qa/cluster-verify.ts
parent_task_id: TASK-345
priority: medium
ordinal: 207800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Establish the correctness gate for production redundancy. Prove PgEventBus propagation, MatchActor ownership, persistence, reconnect, replay integrity, and exactly-once side effects across multiple web Machines before increasing steady-state replica count.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Cluster verification passes against the production-equivalent topology
- [ ] #2 Cross-node actions propagate without stale state or duplicate effects
- [ ] #3 Machine replacement preserves persisted match state and supports rejoin within the original deadline
- [ ] #4 Replay and turn hashes remain valid across node transitions
- [ ] #5 Ladder, email, and transaction side effects remain exactly once
- [ ] #6 Production web replica count is increased only after all correctness gates pass
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
