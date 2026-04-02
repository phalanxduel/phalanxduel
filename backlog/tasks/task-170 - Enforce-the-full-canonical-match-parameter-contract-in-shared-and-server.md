---
id: TASK-170
title: Enforce the full canonical match-parameter contract in shared and server
status: To Do
assignee: []
created_date: '2026-04-02 15:48'
updated_date: '2026-04-02 15:56'
labels: []
dependencies:
  - TASK-168
priority: high
ordinal: 1700
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Context
The audit found that the shared schema and server match creation path accept or normalize match parameters using a subset of the documented rules. The current validation omits the card-scarcity invariant, only checks part of strict-mode parity, and duplicates config logic in `server/src/match.ts` instead of relying on one canonical contract.

## Evidence
- Rule IDs: R-3.1, R-3.2, R-3.3, R-19
- Audit sections: Phase 3, Phase 5, Phase 7, Phase 8
- Code: `shared/src/schema.ts`, `server/src/match.ts`
- Runtime proof: on 2026-04-02 `MatchParametersSchema.safeParse(...)` accepted a 12x4 / initialDraw=52 config, and `createInitialState(...)` drew 52 cards per player and left zero cards in drawpile despite the reserve-of-4 rule.

## Impact
- determinism
- integrity
- consistency
- exploit-risk

## Metadata
- Surface: shared, server, tests, docs
- Type: bug, determinism, consistency
- Priority: critical
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The shared validation path rejects every rule-invalid configuration defined by the resolved canonical contract, including card-scarcity violations and full strict-mode parity mismatches.
- [ ] #2 Server match creation uses the shared canonical validation or normalization path instead of maintaining a divergent handwritten subset.
- [ ] #3 Edge cases such as 12x4 geometry, initiative/pass-rule parity, and unsupported hybrid/manual inputs behave consistently across schema validation and server match creation.
- [ ] #4 Generated API/schema artifacts and tests reflect the exact same accepted parameter surface.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code updated
- [ ] #2 Tests updated
- [ ] #3 Rules updated if needed
- [ ] #4 Cross-surface alignment verified
<!-- DOD:END -->
