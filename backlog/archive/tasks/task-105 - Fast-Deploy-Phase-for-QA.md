---
id: TASK-105
title: Fast Deploy Phase for QA
status: Done
assignee:
  - '@claude'
created_date: '2026-03-21'
labels: []
milestone: v0.5.0 - Stability & Playability
dependencies:
  - TASK-104
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The DeploymentPhase requires filling all battlefield slots (16 for a 2x4 grid)
before combat begins. Bot playthroughs take 2+ minutes to reach the AttackPhase.
Short-lived animations (600–2600ms) disappear before Playwright can screenshot
them.

Add a fast-start configuration for test/dev matches that pre-fills the
battlefield, allowing QA to reach combat in seconds instead of minutes.

Subsumes TASK-37 and addresses TASK-38 (animation timing for QA).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->
- [x] #1 Engine supports a `quickStart` option in GameOptions that pre-deploys
      cards to the battlefield using the seeded RNG. Added `quickStart?: boolean`
      to `GameOptionsSchema` and `modeQuickStart: boolean` to
      `MatchParametersSchema`. `quickDeployPlayer()` in `engine/src/state.ts`
      fills all battlefield slots from hand, columns left-to-right, face-up.
- [x] #2 `quickStart` skips DeploymentPhase and begins at AttackPhase.
      `system:init` in `engine/src/turns.ts` routes to AttackPhase when
      `modeQuickStart` is true. 12 new engine tests verify correctness.
- [x] #3 QA simulator uses `quickStart` by default for auto (bot-vs-bot) modes.
      `--quick-start` and `--no-quick-start` flags on `simulate-headless.ts`.
      Auto modes default to quickStart=true.
- [x] #4 `quickStart` is only available in dev/test — production matches strip
      `quickStart` from gameOptions in `server/src/app.ts`.
- [x] #5 Animation timing hooks for Playwright: `PizzazzEngine` in
      `client/src/pizzazz.ts` tracks active animations and exposes
      `document.body.dataset.pzIdle` (`"true"`/`"false"`) for synchronization.
<!-- AC:END -->

## Verification

```bash
# QuickStart bot-vs-bot (auto mode defaults to quickStart)
pnpm tsx bin/qa/simulate-headless.ts --p1 bot-random --p2 bot-random --batch 2 --max-turns 200
# Expected: modeQuickStart=true in engine log, games complete in ~1-3ms

# Explicit no-quick-start (goes through DeploymentPhase)
pnpm tsx bin/qa/simulate-headless.ts --p1 bot-random --p2 bot-random --batch 1 --max-turns 200 --no-quick-start
# Expected: modeQuickStart=false in engine log, more actions per game

# Full auto QA matrix (all 4 combos with quickStart)
pnpm qa:matrix:auto
# Expected: 8 PASS lines, exit 0

# Engine tests (12 new quickStart tests)
pnpm --filter @phalanxduel/engine test
# Expected: 140 tests pass

# Full test suite
pnpm -r test
# Expected: 614 tests pass (45+140+207+218+4)

# Animation idle attribute check
grep 'pzIdle' client/src/pizzazz.ts
# Expected: dataset.pzIdle assignments present
```
