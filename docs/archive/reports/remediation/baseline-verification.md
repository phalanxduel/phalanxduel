---
title: "Phalanx Duel — Baseline Defect Verification"
date: "2026-04-06"
status: "All defects reproduced and failing tests created"
---

# Baseline Defect Verification

All P0/P1 engine defects reproduced with failing tests before any code changes.

## Defect Summary

| Defect | Task | Severity | Test File | Test Name | Status |
|--------|------|----------|-----------|-----------|--------|
| DEF-001 | TASK-193 | P0 | `engine/tests/rules-coverage.test.ts` | `DEF-001 / TASK-193: Classic Mode HP Reset > resets defender card HP between turns in Classic mode` | FAILS (expected) |
| DEF-002 | TASK-195 | P1 | `engine/tests/rules-coverage.test.ts` | `DEF-002 / TASK-195: Club Doubling > does NOT double overflow past an Ace that was not destroyed` | FAILS (expected) |
| DEF-003/009 | TASK-194 | P1 | `engine/tests/rules-coverage.test.ts` | `DEF-003+009 / TASK-194: Heart Shield > applies front heart shield when front heart destroyed and back non-heart also destroyed` | FAILS (expected) |
| DEF-004 | TASK-196 | P1 | `engine/tests/rules-coverage.test.ts` | `DEF-004 / TASK-196: Back-Rank Ace > does NOT destroy a back-rank Ace even when attacker is an Ace` | FAILS (expected) |
| DEF-005 | TASK-201 | P1 | `engine/tests/rules-coverage.test.ts` | `DEF-005 / TASK-201: Deck Exhaustion > does not throw when drawing more cards than available` | FAILS (expected) |
| DEF-006 | TASK-202 | P1 | `engine/tests/rules-coverage.test.ts` | `DEF-006 / TASK-202: validateAction Contract > returns implicitPass for attack with no front-row attacker` | FAILS (expected) |

## Reproduction Details

### DEF-001 — Classic Mode HP Never Resets
- **Setup:** Classic mode, diamonds 3 attacker vs spades 10 defender
- **Observed:** After attack, defender card `currentHp` = 7 (damage persists)
- **Expected:** After turn completes, defender card `currentHp` = 10 (HP reset per RULES.md section 12)
- **Root cause:** `resetColumnHp` in `combat.ts:347` is exported but never called in `turns.ts`

### DEF-002 — Club Doubling Without Destruction
- **Setup:** Clubs 5 attacker vs front-rank Ace (invulnerable) + back card (value 20)
- **Observed:** Back card takes 8 damage (overflow 4 doubled to 8)
- **Expected:** Back card takes 4 damage (no doubling since Ace was not destroyed)
- **Root cause:** `combat.ts:125` checks `backCard && attacker.card.suit === 'clubs'` without verifying front card destruction

### DEF-003/009 — Heart Shield Not Applied When Back Card Exists
- **Setup:** Spades 10 attacker vs front heart (3) + back clubs (2), both destroyed
- **Observed:** No heart shield applied (LP takes full damage)
- **Expected:** Front heart shield (value 3) reduces LP damage
- **Root cause:** `combat.ts:110` guards `frontHeartShield` with `!newBf[column + ctx.columns]` — back card exists at step A time, so shield is never set

### DEF-004 — Back-Rank Ace Destroyed by Ace Attacker
- **Setup:** Spades Ace attacker, defender has no front card, back-rank Ace
- **Observed:** Back-rank Ace is destroyed (ace-vs-ace path entered)
- **Expected:** Back-rank Ace survives (section 10: targetIndex == 0 required)
- **Root cause:** `combat.ts:263` enters ace-vs-ace without checking `isFrontRow`

### DEF-005 — Deck Exhaustion Throws
- **Setup:** Empty drawpile, attempt to draw 5 cards
- **Observed:** Throws `Error('Not enough cards in drawpile...')`
- **Expected:** Silent stop at deck boundary (section 15)
- **Root cause:** `state.ts:192` throws instead of clamping

### DEF-006 — validateAction Silent Conversion
- **Setup:** Attack action when player has no front-row cards
- **Observed:** Returns `{ valid: true }` with no indication of implicit pass
- **Expected:** Returns `{ valid: true, implicitPass: true }`
- **Root cause:** `turns.ts:171-174` returns bare `{ valid: true }` for no-attacker attacks

## Test Run Evidence

```text
Tests: 6 failed | 182 passed (188)
Test Files: 1 failed | 15 passed (16)
```

All 182 existing tests continue to pass. The 6 new tests document correct behavior per RULES.md and fail against the current implementation, confirming each defect is real and observable.
