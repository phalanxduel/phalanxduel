---
id: TASK-191
title: Fix simulate-ui.ts selectors broken by UI phase-label rework
status: Done
assignee: []
created_date: '2026-04-05 14:21'
updated_date: '2026-04-05 14:24'
labels:
  - bug
  - chore
dependencies: []
references:
  - bin/qa/simulate-ui.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The UI commit `feat(ui): unify phase labels and polish game-over/waiting screens` broke `pnpm qa:playthrough:ui` automation in two ways:

1. **Turn-active selector stale** — `game-preact.tsx` now uses `.turn-status.status-my-turn`, but `game.ts` (vanilla renderer, always used by the joiner because their URL has `?match=`) still uses `.turn-indicator.my-turn`. The bot switched to `.status-my-turn` only, so `p2IsActive` was always false and the game loop stalled indefinitely.

2. **Phase label text changed** — Preact renderer now returns `"Deploy Units"` and `"Combat Phase"` instead of `"Deployment"` and `"AttackPhase"`, so phase-branch detection in `takeAction` silently fell through to `no-op`.

**Changes made to `bin/qa/simulate-ui.ts`:**
- Turn locator: `.status-my-turn` → `.status-my-turn, .turn-indicator.my-turn` (covers both renderers)
- Phase deploy check: adds `|| phaseLower.includes('deploy')`
- Phase attack check: adds `|| phaseLower.includes('combat')`
- Stall log: includes p1/p2 phase and turn indicator text for easier diagnosis
- `main()`: wrapped in try/catch so fatal errors surface cleanly instead of leaving phantom browsers
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 pnpm qa:playthrough:ui completes at least one full game without stalling
- [x] #2 Both players' turns are detected and acted upon
- [x] #3 Verified: game in flight confirmed working after the fix
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed `bin/qa/simulate-ui.ts` to handle both the Preact and vanilla renderers after the UI phase-label rework. Broadened the turn-active CSS selector to cover both `.status-my-turn` and `.turn-indicator.my-turn`, and updated phase-branch detection to match both old and new label text via substring checks (`deploy`, `combat`). Added try/catch around `main()` and enriched stall diagnostics. Verified: `pnpm qa:playthrough:ui` completes a full game without stalling.
<!-- SECTION:FINAL_SUMMARY:END -->
