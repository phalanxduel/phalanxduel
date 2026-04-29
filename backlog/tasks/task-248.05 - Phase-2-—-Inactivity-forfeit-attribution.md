---
id: TASK-248.05
title: Phase 2 — Inactivity forfeit attribution
status: Planned
assignee: []
created_date: '2026-04-29 02:06'
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
- [ ] #1 Active match with no action for 30 minutes is automatically forfeited
- [ ] #2 Inactive player (whose turn it was) receives a loss and abandons+1
- [ ] #3 Acting player receives a win with no penalty
- [ ] #4 Timer is cancelled if any action is applied before it fires
- [ ] #5 Pending matches (no second player) are not subject to the inactivity timer
- [ ] #6 pnpm check passes
<!-- AC:END -->
