---
id: TASK-75
title: 'Fix Fog of War: Redact faceDown cards and hand history in GameState'
status: Human Review
assignee:
  - '@gemini'
created_date: '2026-03-20 02:21'
updated_date: '2026-03-20 02:40'
labels:
  - bug
  - security
  - gameplay
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Opponent hand and hidden cards are visible during DeploymentPhase and via transactionLog, violating the "Fog of War" requirement.

Currently:
- engine/src/state.ts hardcodes faceDown: false for all battlefield cards.
- server/src/match.ts redactHiddenCards only filters hand/drawpile, not battlefield or transactionLog.
- client/src/game-preact.tsx ignores the faceDown property and renders all card details.

Goal:
Implement true Fog of War by ensuring cards remain face-down until the AttackPhase begins or they are involved in combat, and ensure historical data in the transaction log does not leak hidden information.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Engine sets faceDown: true for cards deployed during DeploymentPhase.
- [x] #2 Engine flips cards faceDown: false when they are attacked or at the start of AttackPhase.
- [x] #3 Server's redactHiddenCards filters card details (suit, face, value, type) for any BattlefieldCard where faceDown: true for opponents.
- [x] #4 Server's redactHiddenCards redacts/filters historical card data from transactionLog entries to prevent leaking opponent hand history.
- [x] #5 Client renders a generic card back/hidden state for any BattlefieldCard where faceDown: true.
- [x] #6 Automated tests verify that the opponent's client state does not contain sensitive card data for face-down cards.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Updated `engine/src/state.ts`: `deployCard` now defaults to `faceDown: true`.
- Updated `engine/src/turns.ts`: Added logic to flip all cards face-up (`faceDown: false`) when transitioning from `DeploymentPhase` to `AttackPhase`.
- Updated `engine/src/combat.ts`: `resolveAttack` now reveals the attacker and targeted column cards (`faceDown: false`).
- Updated `server/src/match.ts`:
  - `redactHiddenCards` now redacts `BattlefieldCard` details (suit, face, value) if `faceDown: true`.
  - Implemented `redactTransactionLog` to redact `cardId` from deploy/reinforce actions and strip `CombatLogEntry` details from historical attack entries.
- Updated `client/src/game-preact.tsx`:
  - `CellContent` now renders a generic card back if `bCard.faceDown` is true.
  - `getBaseCellClasses` adds a `face-down` class for battlefield styling.
- Added `engine/tests/fog-of-war.test.ts` to verify engine-level state transitions and server-side redaction logic.
<!-- SECTION:NOTES:END -->
