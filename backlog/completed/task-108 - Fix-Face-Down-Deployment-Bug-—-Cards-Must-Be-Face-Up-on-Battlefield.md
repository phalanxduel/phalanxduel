---
id: TASK-108
title: Fix Face-Down Deployment Bug — Cards Must Be Face-Up on Battlefield
status: Done
assignee:
  - '@claude'
created_date: '2026-03-22 18:57'
labels:
  - bugfix
dependencies: []
references:
  - docs/gameplay/rules.md
  - engine/src/state.ts
  - engine/src/turns.ts
  - engine/tests/visibility.test.ts
  - engine/tests/fog-of-war.test.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Cards were being deployed face-down on the battlefield, which is incorrect per RULES.md section 21.2. The deployCard() function in engine/src/state.ts was setting faceDown: true, causing cards to enter the battlefield hidden. A redundant reveal loop in engine/src/turns.ts then flipped them face-up at AttackPhase transition, masking the root cause. This fix corrects the source (deployCard) and removes the workaround.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Cards deployed via deployCard() have faceDown: false
- [ ] #2 No reveal loop needed at phase transitions
- [ ] #3 filterStateForPlayer shows battlefield cards to all players
- [ ] #4 filterStateForSpectator shows battlefield cards to spectators
- [ ] #5 Opponent cannot see owner's hand or drawpile contents
- [ ] #6 Spectator cannot see either player's hand or drawpile contents
- [ ] #7 Discard pile shows only top card to non-owners
- [ ] #8 All 629 tests pass across all packages
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Change deployCard() in engine/src/state.ts from faceDown: true to faceDown: false
2. Remove redundant card reveal loop from engine/src/turns.ts (AttackPhase transition)
3. Update engine/tests/fog-of-war.test.ts to expect face-up cards
4. Add comprehensive engine/tests/visibility.test.ts covering all 3 actor perspectives
5. Update docs/gameplay/rules.md section 21.2 to clarify face-up deployment
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
All changes implemented and verified:
1. engine/src/state.ts: deployCard() now sets faceDown: false
2. engine/src/turns.ts: Removed redundant reveal loop at AttackPhase transition
3. engine/tests/fog-of-war.test.ts: Updated expectations for face-up deployed cards
4. engine/tests/visibility.test.ts: Added 14 tests across 5 describe blocks:
   - DeploymentPhase visibility (5 tests)
   - AttackPhase visibility (3 tests)
   - Discard Pile visibility (3 tests)
   - Reinforcement visibility (1 test)
   - Full game lifecycle visibility (1 test)
   - Spectator symmetry (1 test)
5. docs/gameplay/rules.md section 21.2: Clarified face-up deployment rule
<!-- SECTION:NOTES:END -->

## Verification

```bash
# Engine tests including visibility and fog-of-war suites
pnpm --filter @phalanxduel/engine test
# Expected: 155 passed (includes 14 visibility tests + 5 fog-of-war tests)

# Full test suite across all packages
pnpm -r test
# Expected: 629 passed across all packages
```
