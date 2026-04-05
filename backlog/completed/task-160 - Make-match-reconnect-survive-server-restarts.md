---
id: TASK-160
title: Make match reconnect survive server restarts
status: Done
assignee:
  - '@codex'
created_date: '2026-04-01 20:27'
updated_date: '2026-04-02 20:21'
labels: []
dependencies:
  - TASK-164
priority: high
ordinal: 79000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reconnect semantics currently depend on live in-memory match/session state.
Production readiness requires recovery to survive server restarts, rolling
deploys, and process crashes during an active reconnect window. Per
`DEC-2B-003`, this recovery must work as a transport-agnostic resume contract
that serves both WebSocket-first play and the degraded HTTP fallback path.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 #1 Active player reconnect succeeds after a server restart within the
  reconnect grace window.
- [x] #2 #2 Recovery does not require the original in-memory socket/session map to
  still exist.
- [x] #3 #3 Browser and Go clients can resume an active match after restart using
  the supported reconnect identity.
- [x] #4 #4 Automated integration coverage proves restart-safe reconnect for at
  least one live match scenario.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Make the reconnect window restart-safe by persisting or deriving reconnect deadlines from match state updates instead of the current process start time, so a server restart cannot grant a fresh full reconnect window.
2. Update MatchManager recovery logic to arm reconnect forfeits from the recovered match activity timeline and only for players who are actually disconnected, while preserving current rejoin behavior for active sockets and bot matches.
3. Extend server reconnect coverage with restart-focused tests for both successful rejoin and expired reconnect windows, including a live WebSocket path where practical.
4. Extend the Go client reconnect tests only as needed to verify the supported rejoin contract still works cleanly with the restart-safe server semantics.
5. Update AGENTS.md so the Current Priority and production-readiness queue reflect the revised release ordering: TASK-160 first, then TASK-171 and TASK-172 ahead of the remaining release tail.
6. Run targeted verification for server reconnect tests, WebSocket tests, and Go client reconnect tests; broaden only if the targeted pass is clean.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
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

2026-04-02: Implemented durable reconnect-window state by recording `player.disconnected` / `player.reconnected` lifecycle events, persisting them through the match event log, and recovering per-player disconnect timestamps from persisted lifecycle history instead of relying solely on process-local recovery time.

2026-04-02: `MatchManager.armRecoveredReconnectTimers()` now preserves the original reconnect deadline for players who were already disconnected before restart, while still granting a fresh bounded reconnect window to players whose sockets were only lost because the server restarted.

2026-04-02: Synced `AGENTS.md` Current Priority to the revised release queue so repo-level guidance matches Backlog ordering (`TASK-160` active, then `TASK-171` and `TASK-172`).

2026-04-02: Implemented durable reconnect-window state by recording `player.disconnected` / `player.reconnected` lifecycle events, persisting them through the match event log, and recovering per-player disconnect timestamps from persisted lifecycle history instead of relying solely on process-local recovery time.

2026-04-02: `MatchManager.armRecoveredReconnectTimers()` now preserves the original reconnect deadline for players who were already disconnected before restart, while still granting a fresh bounded reconnect window to players whose sockets were only lost because the server restarted.

2026-04-02: Synced `AGENTS.md` Current Priority to the revised release queue so repo-level guidance matches Backlog ordering (`TASK-160` active, then `TASK-171` and `TASK-172`).

2026-04-02 verification: `rtk pnpm --filter @phalanxduel/server exec vitest run tests/reconnect.test.ts`; `rtk pnpm --filter @phalanxduel/server exec vitest run tests/ws.test.ts`; `rtk go test ./...` from `clients/go/duel-cli`; `rtk pnpm --filter @phalanxduel/shared build`; `rtk pnpm --filter @phalanxduel/server... build`.

2026-04-02: Implemented durable reconnect-window persistence and recovery via lifecycle disconnect/reconnect events, and verified targeted server, WebSocket, Go client, and build checks.

2026-04-02: Added a real WebSocket integration test that boots one app instance, persists match state through a shared repo double, restarts onto a fresh MatchManager, and proves `rejoinMatch` succeeds against the restarted server using the original `matchId` and `playerId`.

2026-04-02: Verified the cross-client resume contract with browser-style WebSocket restart/rejoin coverage plus existing Go duel-cli reconnect/rejoin tests, so the same persisted resume contract is now exercised from both client surfaces.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented restart-safe reconnect recovery by persisting disconnect/reconnect lifecycle state through the match event log, recovering per-player reconnect deadlines after restart, and adding regression coverage for both successful rejoin and expired reconnect windows. Added a real WebSocket restart integration test plus verification against the Go duel-cli rejoin client so browser and Go clients now exercise the same persisted resume contract.
<!-- SECTION:FINAL_SUMMARY:END -->
