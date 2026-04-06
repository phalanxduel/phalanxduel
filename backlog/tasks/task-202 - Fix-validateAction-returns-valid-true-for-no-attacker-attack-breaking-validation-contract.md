---
id: TASK-202
title: >-
  Fix: validateAction returns valid:true for no-attacker attack, breaking
  validation contract
status: To Do
assignee: []
created_date: '2026-04-06 15:29'
labels:
  - qa
  - engine
  - p1
  - correctness
dependencies: []
references:
  - 'engine/src/turns.ts:171-174'
  - 'engine/src/turns.ts:337-349'
  - docs/RULES.md §6
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

`engine/src/turns.ts:171-174` returns `{ valid: true }` when an attack action is submitted with no card at the attacking column. The action is then silently converted to a pass inside `applyAttack`. Clients that call `validateAction` to determine whether an action is legal receive incorrect information — they are told "valid" but the action will behave as a pass.

This breaks the validation contract and prevents clients from distinguishing a legal attack from an implicit pass.

## Evidence

- `turns.ts:171-174`: `if (!attacker) { return { valid: true } }` — no card present
- `turns.ts:337-349`: `applyAttack` converts to pass when no attacker found
- The spec (RULES.md §6) says "No attacker... counts as pass" — this should be reflected in the validation result

## Fix options

Option A: Return `{ valid: true, implicitPass: true }` (or similar metadata) so callers can distinguish.
Option B: Return `{ valid: false, error: 'No attacker in column — will be treated as pass' }` to be explicit about the outcome.

Either way, the behavior must be observable to callers of `validateAction`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 validateAction for an attack with no front-row attacker returns a result that is distinguishable from a standard valid attack
- [ ] #2 applyAttack continues to convert no-attacker attacks to passes (behavior unchanged)
- [ ] #3 Clients can determine whether an attack action will behave as an attack or a pass before submitting
- [ ] #4 Existing state-machine tests still pass
<!-- AC:END -->
