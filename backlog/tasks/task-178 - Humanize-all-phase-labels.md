---
id: TASK-178
title: Humanize all phase labels in info bar and narration
status: Planned
assignee: []
created_date: '2026-04-04 12:00'
labels:
  - ui
  - ux
  - clarity
dependencies: []
references:
  - client/src/game.ts
  - client/src/narration-overlay.ts
  - backlog/decisions/decision-028 - DEC-2G-001 - Client UI-UX audit and remediation plan.md
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
- [ ] #1 A single canonical `PHASE_DISPLAY` map exists, used by both `getPhaseLabel()` and `PHASE_LABELS` in narration
- [ ] #2 All 8 turn phases + gameOver have human-readable labels (e.g., StartTurn → "Start", AttackPhase → "Attack", CleanupPhase → "Cleanup", DrawPhase → "Draw", EndTurn → "End")
- [ ] #3 No raw enum names are visible to the player in the info bar
- [ ] #4 Narration `PHASE_LABELS` is replaced by or derived from the shared map
- [ ] #5 Existing phase-specific logic (e.g., "Reinforce col N" override) is preserved
<!-- AC:END -->

## Verification

```bash
pnpm --filter @phalanxduel/client test
# Expected: getPhaseLabel tests updated for all 8 phases, all pass

pnpm -r test
# Expected: no regressions
```

## QA Impact

`simulate-headless.ts` parses `[data-testid="phase-indicator"]` text content
for phase detection. If the phase text format changes (e.g., "AttackPhase"
becomes "Attack"), the headless script's phase parsing may need updating.

The no-op phase smoothing principle applies: player-actionable phases
(Deployment, Attack, Reinforcement) get prominent labels and narration.
System-transit phases (StartTurn, AttackResolution, CleanupPhase, DrawPhase,
EndTurn) get readable labels in the info bar but do NOT get narration
announcements — they are internal mechanism that would be noise for the player.

## Changelog

```markdown
### Changed
- **Phase Display**: Game phases now show readable names like "Attack" and
  "Draw" instead of internal labels like "AttackPhase" and "DrawPhase".
  Phases that happen automatically behind the scenes are still tracked but
  no longer clutter the narration feed.
```

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] Canonical phase display map created and shared between info bar and narration
- [ ] `getPhaseLabel()` uses the map
- [ ] `PHASE_LABELS` in narration-overlay.ts uses or derives from the map
- [ ] All 8 phases have readable labels in the info bar
- [ ] Player-actionable phases narrate; system-transit phases do not
- [ ] Tests updated for all phase label expectations
- [ ] QA headless phase-detection logic updated if needed
- [ ] `pnpm -r test` passes
- [ ] `pnpm qa:playthrough:run` succeeds
- [ ] No existing tests broken
<!-- DOD:END -->
