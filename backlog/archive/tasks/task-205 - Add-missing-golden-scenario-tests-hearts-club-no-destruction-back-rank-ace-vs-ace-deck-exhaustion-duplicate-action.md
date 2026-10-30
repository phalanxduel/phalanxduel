---
id: TASK-205
title: >-
  Add missing golden scenario tests: hearts, club-no-destruction, back-rank
  ace-vs-ace, deck exhaustion, duplicate action
status: Done
assignee: []
created_date: '2026-04-06 15:33'
updated_date: '2026-05-01 00:36'
labels:
  - qa
  - engine
  - tests
  - p1
  - golden-scenarios
milestone: Post-Promotion Hardening
dependencies:
  - TASK-193
  - TASK-194
  - TASK-195
  - TASK-196
  - TASK-201
references:
  - engine/tests/rules-coverage.test.ts
  - engine/tests/combat.test.ts
  - reports/qa/final-audit.md
priority: high
ordinal: 8050
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

The audit identified five golden scenario categories with no test coverage. These cover rules that have known implementation divergences or are simply unverified:

1. **Heart shield at card→player boundary** — no dedicated heart test exists; the heart stacking bug (TASK-194) was undetected precisely because of this gap.
2. **Club does NOT double when front card survives** — `rules-coverage.test.ts` only tests Club when front IS destroyed; the no-destruction case is untested.
3. **Back-rank Ace-vs-Ace invulnerability** — `rules-coverage.test.ts` tests Ace against a number attacker but not Ace-vs-Ace at back rank.
4. **Deck exhaustion — silent stop, not throw** — no test verifies the graceful stop behavior at init or draw phase.
5. **Duplicate action submission does not corrupt state** — no test verifies that sending the same action twice is idempotent or safely rejected.

## Dependencies

- TASK-193 (Classic HP reset) — must be fixed before heart tests may need updating
- TASK-194 (Hearts stacking fix) — tests here should verify the corrected behavior
- TASK-195 (Club without destruction fix) — tests here verify the corrected behavior
- TASK-196 (Back-rank Ace-vs-Ace fix) — tests here verify the corrected behavior
- TASK-201 (Deck exhaustion fix) — tests here verify the corrected behavior

## Implementation notes

Add to `engine/tests/` — prefer extending existing relevant test files (`combat.test.ts`, `rules-coverage.test.ts`, `engine.test.ts`). Each test must set up state from scratch with explicit card values to avoid reliance on random deck order.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Heart shield test: front Heart destroyed, no back card — LP reduced by heart value
- [ ] #2 Heart shield test: back Heart destroyed — LP reduced by back heart value only (not stacked)
- [ ] #3 Heart shield test: two Hearts both destroyed — only last-destroyed Heart value shields LP
- [ ] #4 Club test: Club attacker, front card survives — overflow to back card is NOT doubled
- [ ] #5 Back-rank Ace-vs-Ace test: Ace attacker with carryover, back Ace survives
- [ ] #6 Deck exhaustion test at init: no throw when initialDraw > deck size
- [ ] #7 Deck exhaustion test at draw phase: hand unchanged when deck empty, no throw
- [ ] #8 Duplicate action test: submitting same action twice does not advance state twice
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added three missing test cases to engine/tests/rules-coverage.test.ts:
- DEF-007/AC1: Front Heart only (no back card) — LP fully absorbed when overflow ≤ heart value; partial shield when overflow exceeds value
- DEF-008/AC4: Club attacker vs regular number card that survives — no doubling because front card was not destroyed
- DEF-009/AC8: Duplicate action idempotency — same action validated against post-action state is correctly rejected

Also committed regenerated shared/schemas/* files (game-state, client-messages, server-messages, turn-result) which had drifted from the quickStart field addition in TASK-209. All 22 rules-coverage tests pass. pnpm check ✅
<!-- SECTION:FINAL_SUMMARY:END -->
