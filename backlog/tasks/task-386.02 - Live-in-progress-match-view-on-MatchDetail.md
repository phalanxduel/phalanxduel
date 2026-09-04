---
id: TASK-386.02
title: Live in-progress match view on MatchDetail
status: To Do
assignee: []
created_date: '2026-09-04 14:25'
labels:
  - admin
  - ops
dependencies: []
documentation:
  - admin/src/server/routes/matches.ts
  - admin/src/client/pages/MatchDetail.tsx
  - server/src/event-bus.ts
parent_task_id: TASK-386
priority: medium
type: spike
ordinal: 262800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Confirm whether MatchDetail already reflects an in-progress match's current board state, or only ever renders a static transaction/event log snapshot. Start as a spike: read `admin/src/server/routes/matches.ts` GET `/admin-api/matches/:matchId` and `MatchDetail.tsx`'s data fetching, and drive one live match against it to observe behavior.

If it's already live (polls or subscribes to the running match), this task closes as a confirmation with evidence and the AC below is satisfied by what exists.

If it's snapshot-only, scope the fix: MatchDetail needs to reflect a running match live during a demo, most naturally by reusing the same live channel the game clients already use (`server/src/event-bus.ts`) rather than inventing new plumbing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A documented finding states whether MatchDetail is live or snapshot-only, with evidence (code reference or observed behavior)
- [ ] #2 If snapshot-only, an in-progress match's board state updates on MatchDetail without a manual page reload
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
