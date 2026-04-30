---
id: TASK-248.05
title: Phase 2 — Inactivity forfeit attribution
status: Done
assignee:
  - '@codex'
created_date: '2026-04-29 02:06'
updated_date: '2026-04-30 19:22'
labels:
  - phase-2
  - server
  - matchmaking
milestone: m-3
dependencies:
  - TASK-248.01
references:
  - server/src/match.ts
  - server/src/match-actor.ts
  - server/src/db/match-repo.ts
parent_task_id: TASK-248
priority: medium
ordinal: 122000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After 30 minutes of inactivity in an active match (no action from either player), automatically forfeit the match and attribute the loss + abandon penalty to the player who was expected to act (i.e. whose turn it is).

## Behaviour

- Timer starts from the `lastActivityAt` timestamp on the match.
- If 30 minutes elapse without any action, the match is auto-forfeited.
- The player whose turn it is (the inactive one) receives:
  - a `loss` counted against their rating
  - `abandons` incremented by 1 (the column added in TASK-248.01)
- The other player receives a win with no penalty.
- This is distinct from the existing disconnect-reconnect timer (which handles socket drops). This timer handles matches where both sockets are gone or neither player is acting.

## Implementation notes

The disconnect/reconnect timer pattern already exists in `server/src/match.ts` (`armRecoveredReconnectTimers`, reconnect timers). Add a parallel `armInactivityTimer(match)` that schedules a forfeit via `handleAction` with `{ type: 'forfeit', playerIndex: <inactive player index> }` if no action is recorded within 30 minutes.

The timer must be cancelled if any action is applied to the match before it fires.

A match that expires from the public lobby (pending, no second player) is NOT subject to this timer — it only applies to active matches with two players.

## Key files

- `server/src/match.ts` — add `armInactivityTimer`, cancel on action, fire forfeit
- `server/src/match-actor.ts` — confirm forfeit attribution writes abandons counter
- `server/src/db/match-repo.ts` — increment abandons on the inactive player
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Active match with no action for 30 minutes is automatically forfeited
- [x] #2 Inactive player (whose turn it was) receives a loss and abandons+1
- [x] #3 Acting player receives a win with no penalty
- [x] #4 Timer is cancelled if any action is applied before it fires
- [x] #5 Pending matches (no second player) are not subject to the inactivity timer
- [x] #6 pnpm check passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
2026-04-30 implementation plan: add a per-match inactivity timer alongside reconnect timers in `LocalMatchManager`, arm it only for active two-player matches, clear/re-arm it when actions are applied, and fire an authoritative `forfeit` action for `state.activePlayerIndex` after 30 minutes. Carry the inactive player index into `LadderService.onMatchComplete`/`PlayerRatingsService.recordMatchComplete` so only inactivity forfeits increment the loser’s `abandons` counter while normal rating win/loss accounting remains unchanged. Add fake-timer server tests for auto-forfeit attribution, cancellation on action, and pending-match exclusion; then run targeted tests/typecheck and `rtk pnpm check`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-30 implementation: added `INACTIVITY_FORFEIT_WINDOW_MS` and per-match `inactivityTimers` in `LocalMatchManager`. Active two-player matches arm an inactivity timer after game initialization, DB rehydrate, sync updates, and successful actions; pending one-player matches and bot turns are excluded. `handleAction` clears the old timer before applying an action and re-arms after success/error as appropriate. Timer callback verifies `lastActivityAt` and `activePlayerIndex` are unchanged before submitting an authoritative `forfeit` action for the inactive active player. Inactivity forfeits carry `abandonPlayerIndex` into `LadderService.onMatchComplete` and `PlayerRatingsService.recordMatchComplete`, which increments `player_ratings.abandons` only for the attributed inactive player while normal win/loss/draw accounting remains unchanged. Added fake-timer coverage in `server/tests/reconnect.test.ts` for auto-forfeit attribution, old-timer cancellation after a valid action, and pending-match exclusion.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
TASK-248.05 is ready for Human Review. Active two-player matches now auto-forfeit after 30 minutes without action by the expected actor. The inactive active player loses by forfeit and is passed to rating persistence as `abandonPlayerIndex`, causing only that player’s `player_ratings.abandons` to increment while the opponent receives the normal win. The timer is cleared/re-armed around applied actions, ignores pending one-player matches, and skips bot turns.

Verification: `rtk pnpm --filter @phalanxduel/server exec tsc --noEmit` passed; `rtk pnpm --filter @phalanxduel/server exec vitest run tests/reconnect.test.ts` passed 14/14; final `rtk pnpm check` passed full verification: lint, typecheck, all tests (shared 107, engine 210, admin 4, client 189, server 307), Go client checks, schema/docs/rules checks, replay verify, playthrough verify, markdown lint, and formatting.
<!-- SECTION:FINAL_SUMMARY:END -->
