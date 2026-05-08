---
id: TASK-250
title: 'Semantic Event Normalization: Enrich transactionLog with cause tags'
status: Done
assignee: []
created_date: '2026-04-30 22:00'
updated_date: '2026-05-02 12:50'
labels:
  - engine
  - ui
  - combat-fidelity
milestone: m-6
dependencies: []
priority: high
ordinal: 7300
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enrich the transactionLog to include explicit cause tags for combat events. This is the next phase of Combat Explanation Fidelity, allowing the UI to explain WHY damage was doubled or absorbed, rather than just WHAT happened.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 Add explicit cause tags (e.g., 'CLUB BONUS', 'HEART SHIELD', 'REINFORCE') to the transactionLog payload in the shared state model.
- [x] #2 #2 Update the rules engine to emit these tags during combat resolution.
- [x] #3 #3 Update the combat log and UI banner to consume and display these enriched explanations.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. shared/src/combat-resolution.ts: Export COMBAT_CAUSE_LABELS map (CombatBonusType → uppercase display label, e.g. heartDeathShield→'HEART SHIELD')
2. shared/src/schema.ts: Add causeLabels: z.array(z.string()).optional() to CombatLogEntrySchema
3. engine/src/combat.ts: Compute causeLabels from unique bonuses across all steps at combatEntry construction; caller in match.ts appends 'REINFORCE' if reinforcementTriggered
4. client/src/game.tsx: Render causeLabels as small tag chips below the headline in the combat feedback banner, adding 'REINFORCE' if details.reinforcementTriggered
5. Run shared + engine tests; typecheck; verify banner output is correct
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added `causeLabels: z.array(z.string()).optional()` to CombatLogEntrySchema (AC1). Engine populates it at combatEntry construction with unique bonus keys from all combat steps; turns.ts appends 'reinforce'/'victory' keys after outcome is known (AC2). UI banner in game.tsx maps raw keys through COMBAT_CAUSE_LABELS (imported from shared) and renders them as `phx-cause-tag` spans below the headline (AC3). Also added COMBAT_CAUSE_LABELS export to shared/src/combat-resolution.ts mapping all CombatBonusType values + outcome keys to uppercase display labels. OpenAPI snapshot updated. All 317 server + 210 engine + 109 shared tests pass.
<!-- SECTION:FINAL_SUMMARY:END -->
