---
id: TASK-175
title: Display pass counts and forfeit risk warning
status: Done
assignee:
  - Gemini CLI
created_date: '2026-04-04 12:00'
updated_date: '2026-04-04 15:35'
labels:
  - ui
  - safety
  - clarity
dependencies: []
references:
  - client/src/game.ts
  - client/src/state.ts
  - shared/src/schema.ts
  - >-
    docs/adr/decision-028 - DEC-2G-001 - Client UI-UX audit and
    remediation plan.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`passState` (consecutivePasses, totalPasses) exists in `GameState` but is never
rendered in the client. Zero references to `passState`, `consecutivePasses`, or
`totalPasses` anywhere in `client/src/`. Pass limits are 3 consecutive = forfeit,
5 total = forfeit. The player can be one pass from automatic forfeit with no
indication.

If the UI hides pass counts, the system is technically correct and
experientially wrong (DEC-2G-001 finding F-02).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Pass counts (consecutive and total) are visible in the stats sidebar or info bar during `AttackPhase`
- [x] #2 A warning badge appears when the player is within 1 of any forfeit threshold (e.g., 2/3 consecutive or 4/5 total)
- [x] #3 The warning is visually distinct (color-coded red or equivalent)
- [x] #4 Pass counts are derived from `gs.passState` — no local tracking
- [x] #5 When passState is absent or zero, the counter is hidden or reads 0 unobtrusively
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented pass count display and forfeit risk warnings in the stats sidebar.
- Added 'Pass' row to the player stats block showing current consecutive and total passes (e.g., '1/3').
- Implemented a 'FORFEIT RISK' warning badge that appears when a player is within 1 of any forfeit threshold (2/3 consecutive or 4/5 total).
- Updated both Vanilla (game.ts) and Preact (game-preact.tsx) implementations.
- Added CSS for the warning badge with a blinking animation to ensure high visibility.
- Exported and added unit tests for getBaseStats and renderStatsBlock to verify correct rendering of counts and badges.
- Verified all tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Pass counts render from `gs.passState`
- [x] #2 Warning badge appears at threshold
- [x] #3 New tests: count rendering, warning at threshold, no warning below threshold
- [x] #4 `pnpm -r test` passes
- [x] #5 `pnpm qa:api:run` succeeds
- [x] #6 `pnpm qa:playthrough:run` succeeds
- [x] #7 No existing tests broken
<!-- DOD:END -->
