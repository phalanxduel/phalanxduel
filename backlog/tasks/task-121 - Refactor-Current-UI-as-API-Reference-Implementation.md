---
id: TASK-121
title: Refactor Current UI as API Reference Implementation
status: In Progress
assignee:
  - '@claude'
created_date: '2026-03-29 22:24'
updated_date: '2026-04-06 04:38'
labels:
  - api
  - ui
  - refactor
milestone: m-1
dependencies:
  - TASK-120
references:
  - /Users/mike/github.com/just3ws/lawnstarter-engineer-assessment
priority: medium
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
To prove the API is complete and decoupled, we must refactor the existing React/Preact UI to act as a 'Reference Implementation'. It must rely entirely on the ViewModel and Discovery endpoints, with zero hardcoded game logic. This ensures that any change to server-side rules is automatically reflected in the UI without a code change.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Identify logic in the current React/Preact UI that calculates card stats or move legality.
- [ ] #2 Refactor the UI to use the ViewModel's 'validActions' array for interaction gating.
- [ ] #3 Refactor the UI to use /api/cards/manifest for entity metadata.
- [ ] #4 Verify that the UI remains fully playable while having zero 'hardcoded' game engine rules.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. client/src/state.ts — add `validActions: Action[]` to AppState; import Action type; in gameState dispatch set `validActions: message.viewModel?.validActions ?? []`; in resetToLobby set `validActions: []`.
2. client/src/game.ts — add `validActions: Action[]` to ActionButtonParams; rewrite getActionButtons to use validActions.some() for Pass/Skip/Forfeit visibility (phase only for label); update attachCellInteraction to use state.validActions for pz-active-pulse, valid-target, deployment; update renderHand to use state.validActions for card playability; update renderBattlefield reinforce section.
3. client/src/game-preact.tsx — update getInteractionClasses to use state.validActions for isValidAttacker/isTargetable/isDeployable/isReinforceable; update InfoBarActions to use state.validActions; update Hand playability check.
4. client/tests/game-helpers.test.ts — add validActions to makeState(); add validActions param to all getActionButtons calls; update 'only help when not my turn' test to reflect new forfeit-always-available behavior.
5. client/tests/game.test.ts — add validActions to makeGameState(); update pass button and lethal pass tests to supply validActions: [pass, forfeit].
<!-- SECTION:PLAN:END -->
