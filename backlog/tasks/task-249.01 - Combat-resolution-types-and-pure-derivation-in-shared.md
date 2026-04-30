---
id: TASK-249.01
title: Combat resolution types and pure derivation in shared/
status: To Do
assignee: []
created_date: '2026-04-30 03:44'
labels:
  - shared
  - engine
  - tests
dependencies: []
parent_task_id: TASK-249
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

Foundation for the combat explanation surface: a single, pure source of truth for the typed resolution context that both engine and client import. No engine or client wiring yet — that lands in the next subtask.

## Scope

Add `shared/src/combat-resolution.ts` containing types and pure derivation functions:
- `CombatantRef`, `ResolutionModifier`, `ResolutionOutcome`, `ResolutionCue`, `CombatResolutionContext`, `ColumnPressureState`.
- `deriveCombatResolution(combat, { mode, reinforcementTriggered, victoryTriggered })` — derives the context entirely from `CombatLogEntry` plus the three boolean flags already present on `TransactionDetail.attack`.
- `deriveColumnPressure(state, playerIndex, column)` — derived from current battlefield state.
- `selectTurningPoint(state)` — replaces `client/src/ux-derivations.ts:deriveTurningPoint` by scanning `transactionLog` and calling `deriveCombatResolution` per attack entry.

Add Zod schemas in `shared/src/schema.ts` for the new types so they can be serialized over events without a separate validator.

Re-export everything new from `shared/src/index.ts`.

No callers consume these yet — that is the next subtask. This task only adds + tests pure functions.

## Reuse / do not duplicate

- All required inputs already exist on `CombatLogEntry` (per-step `bonuses[]`, `destroyed`, `target`, `damage`, etc.) and `TransactionDetail.attack` (`reinforcementTriggered`, `victoryTriggered`).
- Headline/cause selection mirrors the existing taxonomy from `client/src/ux-derivations.ts:deriveCombatFeedback` — port the logic verbatim, do not reinvent.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `shared/src/combat-resolution.ts` exists with the listed types and three exported pure functions
- [ ] #2 Zod schemas added to `shared/src/schema.ts` for `CombatResolutionContext`, `ResolutionModifier`, `ResolutionOutcome`, `ResolutionCue`, `ColumnPressureState`
- [ ] #3 `shared/tests/combat-resolution.test.ts` covers: each of the 8 `CombatBonusType` values mapped to the correct `ResolutionModifier`; headline + causeTags for outcome classes (no-op, shield-absorbed, front destroyed, column collapsed, breakthrough, victory); both classic and cumulative modes; determinism (same input → same output across two calls)
- [ ] #4 `shared/tests/combat-resolution.test.ts` covers `deriveColumnPressure` returning each of the 5 enum values for representative states
- [ ] #5 `shared/tests/combat-resolution.test.ts` covers `selectTurningPoint` matches behavior of the deprecated `deriveTurningPoint` for at least 4 representative match logs
- [ ] #6 `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` all pass
- [ ] #7 No changes outside `shared/`
<!-- AC:END -->
