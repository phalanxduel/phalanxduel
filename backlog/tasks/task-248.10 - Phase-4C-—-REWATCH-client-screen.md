---
id: TASK-248.10
title: Phase 4C — REWATCH client screen
status: Planned
assignee: []
created_date: '2026-04-29 02:09'
labels:
  - phase-4
  - client
  - ui
  - rewatch
milestone: m-3
dependencies:
  - TASK-248.08
  - TASK-248.09
  - TASK-248.07
references:
  - client/src/state.ts
  - client/src/lobby.tsx
  - client/src/renderer.ts
  - server/src/routes/matches.ts
parent_task_id: TASK-248
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add the REWATCH screen — a step-by-step match replay viewer accessible from the SPECTATOR_LOBBY's historical matches section and from public player profiles.

## Screen structure

Add `'rewatch'` to `AppScreen` in `client/src/state.ts`, with a `rewatchMatchId` and `rewatchStep` in the screen params (or URL query params for deep-linking).

### Controls

- **Step scrubber** — slider from 0 to `totalActions`. Dragging or clicking a position fetches state at that step via `GET /api/matches/:id/replay?step=N`.
- **Prev / Next** buttons — step one action back or forward.
- **Play / Pause** — auto-advance one step every 1.5 seconds (configurable via a speed picker: 0.5×, 1×, 2×).

### Game state display

Render the game board using the existing game renderer (`client/src/renderer.ts`) in read-only mode (no action buttons). Display the action that produced this state above the board (e.g., "Turn 4 — Player 1 played REINFORCE").

### Match header

Shows player names, current step / total steps, and the action at this step.

### Entry points

- SPECTATOR_LOBBY historical section (TASK-248.07) — REWATCH button per row
- Public player profile — links to rewatch for that player's completed matches (using `?playerId` on history endpoint)

## Key files

- `client/src/state.ts` — add `'rewatch'` screen, step state
- `client/src/lobby.tsx` — REWATCH render, scrubber, controls
- `client/src/renderer.ts` — confirm read-only rendering works with an external state snapshot
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 REWATCH screen renders a completed match at any step via scrubber
- [ ] #2 Prev / Next buttons step through actions one at a time
- [ ] #3 Play / Pause auto-advances at the selected speed
- [ ] #4 Game board is read-only (no action input while rewatching)
- [ ] #5 Current action description shown above board
- [ ] #6 Step 0 shows initial state; final step shows match-end state
- [ ] #7 Screen is reachable from SPECTATOR_LOBBY historical section and public player profiles
- [ ] #8 Deep-link via URL params (matchId + step) navigates directly to that state
- [ ] #9 pnpm check passes
<!-- AC:END -->
