---
id: TASK-121
title: Refactor Current UI as API Reference Implementation
status: Human Review
assignee:
  - '@claude'
created_date: '2026-03-29 22:24'
updated_date: '2026-04-06 13:29'
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
- [x] #1 Identify logic in the current React/Preact UI that calculates card stats or move legality.
- [x] #2 Refactor the UI to use the ViewModel's 'validActions' array for interaction gating.
- [x] #3 Verify that the UI remains fully playable while having zero 'hardcoded' game engine rules.
- [ ] #4 Descoped: /api/cards/manifest integration extracted to a dedicated follow-up task (card display metadata is a separate concern from move legality).
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. client/src/state.ts — add `validActions: Action[]` to AppState; import Action type; in gameState dispatch set `validActions: message.viewModel?.validActions ?? []`; in resetToLobby set `validActions: []`.
2. client/src/game.ts — add `validActions: Action[]` to ActionButtonParams; rewrite getActionButtons to use validActions.some() for Pass/Skip/Forfeit visibility (phase only for label); update attachCellInteraction to use state.validActions for pz-active-pulse, valid-target, deployment; update renderHand to use state.validActions for card playability; update renderBattlefield reinforce section.
3. client/src/game-preact.tsx — update getInteractionClasses to use state.validActions for isValidAttacker/isTargetable/isDeployable/isReinforceable; update InfoBarActions to use state.validActions; update Hand playability check.
4. client/tests/game-helpers.test.ts — add validActions to makeState(); add validActions param to all getActionButtons calls; update 'only help when not my turn' test to reflect new forfeit-always-available behavior.
5. client/tests/game.test.ts — add validActions to makeGameState(); update pass button and lethal pass tests to supply validActions: [pass, forfeit].
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## What was done

All hardcoded game logic removed from both renderers and replaced with `validActions`-based gating (commit e41a5a64):

**state.ts** — Added `validActions: Action[]` to `AppState`; populated from `message.viewModel?.validActions ?? []` in the `gameState` dispatch case; cleared to `[]` in `resetToLobby`.

**game.ts** — `ActionButtonParams` extended with `validActions`; `getActionButtons` rewrote Pass/Forfeit/Cancel visibility using `validActions.some()`; `attachCellInteraction` replaced `gs.phase === 'AttackPhase'`, `pos.row === 0`, and `isWeapon(suit)` checks with per-action validActions lookups; `renderHand` replaced `gs.phase === 'DeploymentPhase' && isMyTurn` with per-card `validActions.some(a => a.type === 'deploy' && a.cardId === card.id)`; reinforce cell gating uses `validActions.some(a => a.type === 'reinforce' && a.cardId === ...)`.

**game-preact.tsx** — `getInteractionClasses`/`getTargetingStates`/`getCellClasses` all removed `isMyTurn` param and replaced with `state.validActions` lookups; `BattlefieldCell.onClick` uses validActions for attacker selection; `Hand` uses per-card validActions; `InfoBarActions` removed `!isMyTurn` guard and phase checks — buttons driven by `hasPass`/`hasForfeit` from validActions (forfeit now always visible per API contract).

**Tests** — `makeState()` and `makeGameState()` both include `validActions`; all 9 `getActionButtons` call sites updated; "not my turn" test updated to expect `['Forfeit', '? Help']`; `attachCellInteraction` tests supply appropriate attack/deploy actions.

## Outstanding

**AC#3** — `/api/cards/manifest` integration. Card display metadata (`suitColor`, `suitSymbol`, `isFace`, `isWeapon`, `cardLabel`) is still hardcoded in `client/src/cards.ts`. This was deferred pending a decision on whether it belongs in this task or a dedicated follow-up.
<!-- SECTION:FINAL_SUMMARY:END -->
