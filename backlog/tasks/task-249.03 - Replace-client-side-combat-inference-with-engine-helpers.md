---
id: TASK-249.03
title: Replace client-side combat inference with engine helpers
status: In Progress
assignee:
  - '@claude'
created_date: '2026-04-30 03:46'
updated_date: '2026-04-30 14:10'
labels:
  - client
  - ux
  - tests
dependencies:
  - TASK-249.02
parent_task_id: TASK-249
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why

Remove the rule-duplication in the client. Once the engine emits `attack.resolved` and exposes `simulateAttack`, the UI should consume engine-blessed data and stop deriving combat semantics from snapshots.

## Scope

1. **Delete from `client/src/ux-derivations.ts`**: `deriveCombatFeedback`, `deriveActionPreview`, `deriveTurningPoint`, `describeCombatTurn`, `summarizeResult`, `countDestroyedCards`, `getColumnCards`, plus the `CombatFeedback` and `ActionPreview` types if no longer used externally. Keep `getQuickMatchOperativeId`, `getQuickMatchPlayerName`, `formatShareText`.
2. **`client/src/game.tsx:CombatFeedbackBanner` (~lines 687-736)**: render directly from `CombatResolutionContext.explanation.headline` and `resolutionCues[]`. Read the latest `attack.resolved` event for the current turn out of the turn result / event log.
3. **`client/src/game.tsx:describePlayByPlay` (~lines 62-90)**: for attack entries, format text from the resolution context attached to the `attack.resolved` event rather than reformatting `CombatLogEntry` fields directly.
4. **`client/src/game-over.tsx:TurningPointCard` (~lines 39-67)**: replace the `deriveTurningPoint` call with `selectTurningPoint(state)` from `@phalanxduel/shared`.
5. **`client/src/narration-producer.ts:processAttackEntry` (~lines 180-273)**: keep iterating `combat.steps` for narration *timing*, but stop re-deciding what counts as narratable based on destroyed-counting heuristics. Read `outcome` flags from the `attack.resolved` event payload to drive banner-style narration.
6. **Action preview**: any UI that previously called `deriveActionPreview(state, action)` now calls `simulateAttack(state, action)` from `@phalanxduel/engine`.
7. **Tests**: update `client/tests/ux-derivations.test.ts` (delete tests for removed functions; equivalent assertions live in shared/tests). Update `client/tests/narration-producer.test.ts` fixtures to include `attack.resolved`.
8. **Verification**: `git grep -n 'destroyed' client/src/` should turn up only display/UI uses, no rule-decision logic.

## Reuse / do not duplicate

- `client/src/narration-producer.ts:cardLabel` and `classifyCard` stay; they're presentation helpers.
- All combat semantics come from `@phalanxduel/shared` and `@phalanxduel/engine`. The client must not implement any.

## Out of scope

Reinforce / deploy narration cleanup (file as a follow-up). This task is attack-only.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `client/src/ux-derivations.ts` no longer exports `deriveCombatFeedback`, `deriveActionPreview`, `deriveTurningPoint`, `describeCombatTurn`, `summarizeResult`, or `countDestroyedCards`
- [ ] #2 `CombatFeedbackBanner`, `describePlayByPlay`, and `TurningPointCard` read combat semantics from engine-emitted `attack.resolved` events or the shared `selectTurningPoint` helper — not from snapshot diffs
- [ ] #3 `narration-producer.ts:processAttackEntry` reads `outcome` flags from the resolution context for banner-level decisions; per-step iteration remains for timing only
- [ ] #4 Any pre-action preview UI calls `simulateAttack` from `@phalanxduel/engine` instead of `deriveActionPreview`
- [ ] #5 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm check` all pass
- [ ] #6 `pnpm qa:playthrough:verify` passes — non-negotiable gameplay gate
- [ ] #7 Manual headed playthrough confirms combat banner and play-by-play render correctly with no visible regressions vs. the prior implementation
- [ ] #8 AGENTS.md `Current Priority` section updated so it no longer claims TASK-242 is `In Progress`
<!-- AC:END -->
