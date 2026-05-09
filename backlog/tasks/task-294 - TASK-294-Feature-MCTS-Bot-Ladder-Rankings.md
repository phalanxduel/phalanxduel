---
id: TASK-294
title: 'TASK-294 - Feature: MCTS Bot Ladder Rankings'
status: In Progress
assignee:
  - '@antigravity'
created_date: '2026-05-09 08:39'
updated_date: '2026-05-09 08:39'
labels: []
dependencies: []
ordinal: 147000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enable tracking and ranking for players competing against the MCTS bot difficulty levels on the public ladder.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 1. LadderCategory includes sp-mcts, 2. LadderService computes MCTS bot rankings, 3. MCTS matches are reflected in the leaderboard
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
