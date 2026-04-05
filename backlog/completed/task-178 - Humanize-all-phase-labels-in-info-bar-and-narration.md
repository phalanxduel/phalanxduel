---
id: TASK-178
title: Humanize all phase labels in info bar and narration
status: Done
assignee: []
created_date: '2026-04-04 12:00'
updated_date: '2026-04-05 01:37'
labels:
  - ui
  - ux
  - clarity
dependencies: []
references:
  - client/src/game.ts
  - client/src/narration-overlay.ts
  - >-
    backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and
    remediation plan.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`getPhaseLabel()` in `game.ts:15-22` returns raw enum strings for 5 of 8
phases: "StartTurn", "AttackPhase", "CleanupPhase", "DrawPhase", "EndTurn".
`PHASE_LABELS` in `narration-overlay.ts` only covers 4 of 9 phases.

Per DEC-2G-001 implementation principle: all player-visible phase labels,
narration labels, and action affordances must derive from a single canonical
phase map (finding F-03).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A single canonical `PHASE_DISPLAY` map exists, used by both `getPhaseLabel()` and `PHASE_LABELS` in narration
- [x] #2 All 8 turn phases + gameOver have human-readable labels (e.g., StartTurn → "Start", AttackPhase → "Attack", CleanupPhase → "Cleanup", DrawPhase → "Draw", EndTurn → "End")
- [x] #3 No raw enum names are visible to the player in the info bar
- [x] #4 Narration `PHASE_LABELS` is replaced by or derived from the shared map
- [x] #5 Existing phase-specific logic (e.g., "Reinforce col N" override) is preserved
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Humanized and unified all game phase labels.
- Created canonical PHASE_DISPLAY and HUD_PHASE_LABELS in a new constants.ts file.
- Updated game-preact.tsx, game.ts, and narration-overlay.ts to use the shared constants.
- Replaced all raw enum names with human-readable labels (e.g., 'Combat Phase', 'Turn Start').
- Ensured narration phase announcements are consistent with the HUD.
- Verified with unit tests and workspace-wide typechecking.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Canonical phase display map created and shared between info bar and narration
- [x] #2 `getPhaseLabel()` uses the map
- [x] #3 `PHASE_LABELS` in narration-overlay.ts uses or derives from the map
- [x] #4 All 8 phases have readable labels in the info bar
- [x] #5 Player-actionable phases narrate; system-transit phases do not
- [x] #6 Tests updated for all phase label expectations
- [x] #7 QA headless phase-detection logic updated if needed
- [x] #8 `pnpm -r test` passes
- [x] #9 `pnpm qa:playthrough:run` succeeds
- [x] #10 No existing tests broken
- [ ] #11 Canonical phase display map created and shared.
- [ ] #12 All 8 phases have readable labels.
- [ ] #13 Narration uses shared map.
- [ ] #14 All tests pass.
<!-- DOD:END -->
