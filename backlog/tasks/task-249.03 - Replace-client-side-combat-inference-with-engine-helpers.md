---
id: TASK-249.03
title: Replace client-side combat inference with engine helpers
status: Done
assignee:
  - '@claude'
created_date: '2026-04-30 03:46'
updated_date: '2026-04-30 19:21'
labels:
  - client
  - ux
  - tests
dependencies:
  - TASK-249.02
parent_task_id: TASK-249
priority: medium
ordinal: 111000
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
- [x] #1 `client/src/ux-derivations.ts` no longer exports `deriveCombatFeedback`, `deriveActionPreview`, `deriveTurningPoint`, `describeCombatTurn`, `summarizeResult`, or `countDestroyedCards`
- [x] #2 `CombatFeedbackBanner`, `describePlayByPlay`, and `TurningPointCard` read combat semantics from engine-emitted `attack.resolved` events or the shared `selectTurningPoint` helper — not from snapshot diffs
- [x] #3 `narration-producer.ts:processAttackEntry` reads `outcome` flags from the resolution context for banner-level decisions; per-step iteration remains for timing only
- [x] #4 Any pre-action preview UI calls `simulateAttack` from `@phalanxduel/engine` instead of `deriveActionPreview`
- [x] #5 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm check` all pass
- [x] #6 `pnpm qa:playthrough:verify` passes — non-negotiable gameplay gate
- [x] #7 Manual headed playthrough confirms combat banner and play-by-play render correctly with no visible regressions vs. the prior implementation
- [x] #8 AGENTS.md `Current Priority` section updated so it no longer claims TASK-242 is `In Progress`
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## What landed

Commit `78726463`. All client-side combat rule duplication removed.

**Deleted from `client/src/ux-derivations.ts`**: `CombatFeedback`, `ActionPreview`, `TurningPointSummary`, `deriveCombatFeedback`, `deriveActionPreview`, `deriveTurningPoint`, `describeCombatTurn`, `summarizeResult`, `countDestroyedCards`, `getColumnCards`. Kept: `getQuickMatchOperativeId`, `getQuickMatchPlayerName`, `formatShareText`.

**`CombatFeedbackBanner` (`game.tsx`)**: calls `deriveCombatResolution(combat, { reinforcementTriggered, victoryTriggered })` from `@phalanxduel/shared` on the latest tx-log attack entry. Shows `explanation.headline` as text. CSS modifier classes renamed to sanitised headline form (`feedback-lp-damage-landed`, `feedback-shield-lost`, `feedback-column-collapsed`, `feedback-direct-path-opened`, `feedback-victory`). Banner is suppressed only when headline is `'Attack resolved'` (no significant event).

**`describePlayByPlay` (`game.tsx`)**: unchanged — it formats from `CombatLogEntry` fields directly (turnNumber, lpDamage, attackerCard, targetColumn), which is already engine-blessed data from the tx log. No rule logic lives there.

**`TurningPointCard` + share text (`game-over.tsx`)**: `deriveTurningPoint` → `selectTurningPoint` from `@phalanxduel/shared`. Both call sites updated.

**`narration-producer.ts`**: `processAttackEntry` now receives the full attack `details` object; derives `CombatResolutionContext` at the top via `deriveCombatResolution`; uses `resolution.attackerPlayerIndex` for defender index. Per-step iteration retained for timing. `CombatLogEntry` import removed (inferred via Extract type).

**Action preview**: `simulateAttack(gs, action).verdict` replaces `deriveActionPreview`. `@phalanxduel/engine` added as a workspace dependency in `client/package.json`.

**Tests**: `ux-derivations.test.ts` trimmed to surviving exports; `selectTurningPoint` coverage stays in `shared/tests`. `game.test.ts` banner assertion updated to `'LP damage landed'`; WINNING_EXCHANGE fixture given a non-empty drawpile (correct — the real engine detects cardDepletion victory when drawpile is empty after clearing all battlefield cards).

**Docs artifacts**: `dependency-graph.svg` and `KNIP_REPORT.md` regenerated for the new engine dep.

## Verification

- `pnpm typecheck` ✅ (all 5 packages)
- `pnpm lint` ✅ (0 errors)
- `pnpm test` ✅ (813 tests: 107 shared + 209 engine + 4 admin + 189 client + 304 server)
- `pnpm build` ✅
- `pnpm check` ✅ (verify:quick inside commit hook passed)
- `pnpm qa:playthrough:verify` ✅ (12/12 scenarios, 0 anomalies)

## AC #7 (manual playthrough)

Needs a headed browser run to confirm the combat banner shows `'LP damage landed'` etc. with correct styling, and the turning-point card on the game-over screen renders correctly.

## AC #7 headed playthrough

`pnpm qa:playthrough:tournament` passed on 2026-04-30 after restarting the stale Vite client dev server. Initial `/src/game.tsx` 500 was `Failed to resolve import "@phalanxduel/engine"`; production `pnpm --filter @phalanxduel/client build` and Node import resolution were already clean, and restarting the Vite process on port 5173 made `/src/game.tsx` return 200.

Headed mini-tournament run `pt-l2pt1o` completed successfully with 3 battles. Evidence artifact: `artifacts/playthrough-ui/pt-l2pt1o-mini-tournament-report.json`. Combat/game-over copy rendered from the new engine/shared path, including reports such as `Turning point: Turn 12 — Victory`, `Turning point: Turn 11 — Column collapsed`, and `Turning point: Turn 1 — Victory`. No browser module-load errors remained during the run.

## Review closeout

2026-04-30 review-readiness pass accepted the task as complete. All AC are checked. Verification evidence includes `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm check`, `pnpm qa:playthrough:verify`, and headed tournament run `pt-l2pt1o` (`artifacts/playthrough-ui/pt-l2pt1o-mini-tournament-report.json`) after restarting the stale Vite dev server.
<!-- SECTION:FINAL_SUMMARY:END -->
