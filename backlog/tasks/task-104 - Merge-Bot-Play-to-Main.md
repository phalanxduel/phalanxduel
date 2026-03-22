---
id: TASK-104
title: Merge Bot Play to Main
status: Done
assignee:
  - '@claude'
created_date: '2026-03-21'
labels: []
milestone: v0.5.0 - Stability & Playability
dependencies:
  - TASK-102
  - TASK-103
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Merge `feat/configurable-grid-bot` (Deployment A — Play vs AI Bot) into main.

The branch was already merged at commit `23458056` during the configurable-grid-bot
work session. The merge added "Play vs Bot" to the lobby UI, allowing players to
start a single-player game against a random or heuristic bot. All TASK-103 QA
matrix tests confirm the feature works end-to-end.

Note: only Deployment A (bot play) was in scope. Deployments B (configurable
match parameters) and C (heuristic bot strategy improvements) are separate
future work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 `feat/configurable-grid-bot` merged into main (merge commit `23458056`).
      Branch ref cleaned up.
- [x] #2 "Play vs Bot" button visible in lobby UI — "Play vs Bot (Easy)" and
      "Play vs Bot (Medium)" in `client/src/lobby.ts`.
- [x] #3 Random bot plays a complete game to `gameOver` without errors.
- [x] #4 Heuristic bot plays a complete game to `gameOver` without errors.
- [x] #5 All existing tests pass after merge (602 tests, `pnpm -r test`).
- [x] #6 QA matrix (TASK-103) confirms all bot combinations work (8/8 auto runs pass).
<!-- AC:END -->

## Verification

```bash
# Confirm merge commit is in main lineage
git merge-base --is-ancestor 23458056 HEAD && echo "PASS"
# Expected: PASS

# Confirm "Play vs Bot" buttons exist
grep -c 'Play vs Bot' client/src/lobby.ts
# Expected: 2

# Confirm bot engine is exported
grep 'computeBotAction' engine/src/index.ts
# Expected: export line present

# Run full QA matrix (auto modes, no server needed)
pnpm qa:matrix:auto
# Expected: 8 PASS lines (4 combos × 2 runs each), exit 0

# Run full test suite
pnpm -r test
# Expected: 602 tests pass
```
