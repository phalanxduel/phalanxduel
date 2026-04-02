---
id: TASK-160
title: Make match reconnect survive server restarts
status: In Progress
assignee:
  - '@codex'
created_date: '2026-04-01 20:27'
updated_date: '2026-04-02 09:02'
labels: []
dependencies:
  - TASK-164
priority: high
ordinal: 4000
---

## Description

Reconnect semantics currently depend on live in-memory match/session state.
Production readiness requires recovery to survive server restarts, rolling
deploys, and process crashes during an active reconnect window. Per
`DEC-2B-003`, this recovery must work as a transport-agnostic resume contract
that serves both WebSocket-first play and the degraded HTTP fallback path.

## Acceptance Criteria

- [ ] #1 Active player reconnect succeeds after a server restart within the
  reconnect grace window.
- [ ] #2 Recovery does not require the original in-memory socket/session map to
  still exist.
- [ ] #3 Browser and Go clients can resume an active match after restart using
  the supported reconnect identity.
- [ ] #4 Automated integration coverage proves restart-safe reconnect for at
  least one live match scenario.

## Implementation Plan

- Identify which reconnect state must be made durable or derivable after a
  process restart.
- Define a transport-agnostic resume contract that works for both browser and
  external clients across WebSocket rejoin and degraded HTTP fallback.
- Add restart-aware integration coverage before treating reconnect as
  production-ready.

## Implementation Notes

- Active match recovery no longer fabricates placeholder player IDs on reload.
  `MatchRepository.getMatch()` now reconstructs player identities from the
  persisted match config, which already carries the canonical per-player IDs
  used by `rejoinMatch`.
- Reloaded active matches now restore:
  - real player IDs
  - lifecycle events from the persisted event log
  - match options, RNG seed, and bot runtime hints needed for resumed play
- `MatchManager.getMatch()` now arms reconnect-forfeit timers for active matches
  loaded from persistence, so a restarted process still offers a bounded
  reconnect window instead of silently losing all timeout semantics.
- Match start paths now persist the event log immediately after initialization,
  so restart recovery has canonical lifecycle history even before the first
  post-start player action.
- Added a restart-simulation unit test that boots one manager, persists the
  match, then rehydrates it through a fresh manager instance and successfully
  `rejoinMatch`s with the original player identity.

## Verification

- `rtk pnpm --filter @phalanxduel/server exec vitest run tests/reconnect.test.ts`
- `rtk pnpm --filter @phalanxduel/server exec vitest run tests/ws.test.ts`
- `rtk pnpm --filter @phalanxduel/server... build`
