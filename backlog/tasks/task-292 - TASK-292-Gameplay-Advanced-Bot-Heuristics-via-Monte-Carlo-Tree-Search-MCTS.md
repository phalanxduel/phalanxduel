---
id: TASK-292
title: >-
  TASK-292 - Gameplay: Advanced Bot Heuristics via Monte Carlo Tree Search
  (MCTS)
status: In Progress
assignee:
  - '@antigravity'
created_date: '2026-05-08 02:07'
updated_date: '2026-05-08 19:46'
labels: []
dependencies: []
ordinal: 145000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Upgrade the botStrategy to use MCTS for more challenging and human-like tactical play in Solo Operations.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 MCTS-based bot defeats heuristic-based bot in 60%+ of matches
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create engine/src/mcts.ts containing the core Monte Carlo Tree Search logic.
2. Implement a node-based tree structure that tracks visits and wins.
3. Use the existing getValidActions and applyAction from turns.ts for the tree expansion and simulation.
4. Integrate into engine/src/bot.ts as a new strategy 'mcts'.
5. Verify performance and win-rate against the heuristic bot.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
