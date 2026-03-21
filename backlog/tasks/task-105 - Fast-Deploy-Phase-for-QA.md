---
id: TASK-105
title: Fast Deploy Phase for QA
status: To Do
assignee: []
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
- [ ] #1 Engine supports a `quickStart` option in GameConfig that pre-deploys
      cards to the battlefield using the seeded RNG.
- [ ] #2 `quickStart` skips DeploymentPhase and begins at AttackPhase.
- [ ] #3 QA simulator uses `quickStart` by default to reduce test time.
- [ ] #4 `quickStart` is only available in dev/test — production matches always
      start at DeploymentPhase.
- [ ] #5 Animation timing hooks for Playwright: expose a
      `data-animation-complete` attribute or similar for synchronization.
<!-- AC:END -->

## Verification

```bash
# Quick-start bot match completes in under 30 seconds
time pnpm qa:playthrough:ui -- --quick-start

# Standard match still starts at DeploymentPhase
pnpm qa:playthrough:ui -- --no-quick-start

# Full suite
pnpm -r test
```
