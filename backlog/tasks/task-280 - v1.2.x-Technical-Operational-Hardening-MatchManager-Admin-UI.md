---
id: TASK-280
title: v1.2.x Technical & Operational Hardening (MatchManager & Admin UI)
status: Completed
assignee:
  - '@antigravity'
created_date: '2026-05-06 21:37'
labels: []
dependencies: []
ordinal: 134000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 AC #2 of TASK-94 (distributed MatchManager mapping) is complete
- [x] #2 Admin UI includes a 'Force Terminate' button for active matches
- [x] #3 Admin UI includes an audit log entry for manual match terminations
- [x] #4 Admin UI allows rolling back a match to a specific sequence number
- [x] #5 MatchManager handles rollback by truncating the ledger and state history
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
