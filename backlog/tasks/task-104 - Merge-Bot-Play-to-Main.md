---
id: TASK-104
title: Merge Bot Play to Main
status: To Do
assignee: []
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
Rebase `feat/configurable-grid-bot` onto main and merge. This branch contains
Deployment A (Play vs AI Bot) which is complete and reviewed but was never
merged due to main diverging significantly during TASK-47 and TASK-94 work.

The branch adds "Play vs Bot" to the lobby UI, allowing players to start a
single-player game against a random or heuristic bot. This is critical for
playability — without it, players who find no opponent online have nothing to do.

Note: only Deployment A (bot play) is in scope. Deployments B (configurable
match parameters) and C (heuristic bot strategy improvements) are separate
future work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [ ] #1 `feat/configurable-grid-bot` rebased cleanly onto main (or conflicts
      resolved).
- [ ] #2 "Play vs Bot" button visible in lobby UI.
- [ ] #3 Random bot plays a complete game to `gameOver` without errors.
- [ ] #4 Heuristic bot plays a complete game to `gameOver` without errors.
- [ ] #5 All existing tests pass after merge (`pnpm -r test`).
- [ ] #6 QA matrix (TASK-103) confirms all bot combinations work.
<!-- AC:END -->

## Verification

```bash
# Rebase
git checkout feat/configurable-grid-bot
git rebase main
# Resolve any conflicts

# Merge
git checkout main
git merge feat/configurable-grid-bot

# Verify
pnpm -r build && pnpm -r test
pnpm verify:all

# Manual: open browser, click "Play vs Bot", select difficulty, play to completion
```
