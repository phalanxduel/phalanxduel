---
id: TASK-248.07
title: Phase 3B — Spectator lobby client screen
status: Planned
assignee: []
created_date: '2026-04-29 02:07'
labels:
  - phase-3
  - client
  - ui
  - spectator
milestone: m-3
dependencies:
  - TASK-248.06
references:
  - client/src/state.ts
  - client/src/lobby.tsx
  - server/src/routes/matchmaking.ts
parent_task_id: TASK-248
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add the SPECTATOR_LOBBY screen to the client. Shows all watchable matches with filter controls. Links into the REWATCH screen (TASK-248.08) for completed matches once that is built.

## Screen structure

Add `'spectator_lobby'` to `AppScreen` in `client/src/state.ts`. Reachable from the main lobby nav.

### Filter bar

Three toggle options (can combine):
- `WAITING` — matches with one player seated
- `ACTIVE` — in-progress matches with two players
- `ALL` (default)

(REWATCH / historical matches filter is a stub here — marked "Coming soon" until TASK-248.08 is done.)

### Match list

Each row:
- Player 1 name vs Player 2 name (or "Waiting for opponent" if waiting)
- Current phase + turn number (if active)
- Spectator count with an eye icon
- Created-at
- WATCH button — connects the client as a spectator via the existing `watchMatch` WebSocket path
- For waiting matches: show "Will open when both players join"

### Refresh

Poll `GET /api/spectator/matches` every 15 seconds.

## Key files

- `client/src/state.ts` — add `'spectator_lobby'` screen
- `client/src/lobby.tsx` — SPECTATOR_LOBBY render, match row, watch handler
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 SPECTATOR_LOBBY screen is reachable from the main lobby
- [ ] #2 Filter bar toggles between ALL / WAITING / ACTIVE and updates the list
- [ ] #3 Each row shows player names, phase/turn (if active), spectator count, created-at, and WATCH button
- [ ] #4 WATCH button initiates a spectator WebSocket connection to the selected match
- [ ] #5 Waiting matches show informational text instead of a WATCH button
- [ ] #6 List auto-refreshes every 15 seconds
- [ ] #7 pnpm check passes
<!-- AC:END -->
