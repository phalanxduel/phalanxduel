---
id: TASK-294
title: 'TASK-294 - Feature: MCTS Bot Ladder Rankings'
status: Done
assignee:
  - '@antigravity'
created_date: '2026-05-09 08:39'
updated_date: '2026-05-09 08:44'
labels: []
dependencies: []
ordinal: 147000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enable tracking and ranking for players competing against the MCTS bot difficulty levels on the public ladder.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria:
--------------------------------------------------
- [x] #1 1. LadderCategory includes sp-mcts, 2. LadderService computes MCTS bot rankings, 3. MCTS matches are reflected in the leaderboard

Definition of Done:
--------------------------------------------------
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)

Implementation Plan:
--------------------------------------------------
1. Update LadderCategory in server/src/ladder.ts.
2. Add sp-mcts phantom rating.
3. Update categoryFilter in LadderService.
4. Update client/src/lobby.tsx and Leaderboard.tsx to show the new category.

Verification:
--------------------------------------------------
- [x] pnpm build passes.
- [x] pnpm lint passes.
- [x] pnpm typecheck passes.
- [x] Git push successful.
<!-- DOD:END -->
