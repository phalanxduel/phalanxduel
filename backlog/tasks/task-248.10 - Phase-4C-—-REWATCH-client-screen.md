---
id: TASK-248.10
title: Phase 4C — REWATCH client screen
status: Done
assignee:
  - '@codex'
created_date: '2026-04-29 02:09'
updated_date: '2026-04-30 19:21'
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
ordinal: 117000
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
- [x] #1 REWATCH screen renders a completed match at any step via scrubber
- [x] #2 Prev / Next buttons step through actions one at a time
- [x] #3 Play / Pause auto-advances at the selected speed
- [x] #4 Game board is read-only (no action input while rewatching)
- [x] #5 Current action description shown above board
- [x] #6 Step 0 shows initial state; final step shows match-end state
- [x] #7 Screen is reachable from SPECTATOR_LOBBY historical section and public player profiles
- [x] #8 Deep-link via URL params (matchId + step) navigates directly to that state
- [x] #9 pnpm check passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
2026-04-30 implementation plan: add `rewatch` screen state plus URL params (`matchId`, `step`), expose the existing `GameApp` for read-only embedding, add history fetching to `SpectatorLobbyScreen` with REWATCH buttons, add profile recent-match REWATCH entry points, implement `RewatchScreen` with action log fetch, replay-state fetch, scrubber, Prev/Next, Play/Pause and speed picker, render snapshots through `GameApp` with `isSpectator=true` and `validActions=[]`, add focused lobby tests for deep-link/render/controls/entry points, then run the UI playability gate already completed, targeted client typecheck/tests, and `rtk pnpm check`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-30: Implemented in commit 4489714a (`feat(client): add rewatch screen`). Added `rewatch` screen state and URL params, spectator lobby historical REWATCH entries, public profile REWATCH entry points, replay action log/state fetching, scrubber, Prev/Next, Play/Pause, speed selector, and read-only board rendering via the existing game renderer with spectator state.

Verification: `rtk pnpm qa:playthrough:verify` passed before UI work (12/12, 0 warnings/errors). Focused proof passed: `rtk pnpm --filter @phalanxduel/client exec tsc --noEmit`; `rtk pnpm --filter @phalanxduel/client exec vitest run tests/lobby.test.ts tests/renderer-helpers.test.ts tests/game.test.ts` (67/67); `rtk pnpm --filter @phalanxduel/client exec vitest run` (195/195). Final unified proof passed after commit: `rtk pnpm check` (lint, typecheck, all tests, Go client check, schema/rules/event-log checks, replay verify 20/20, playthrough verify 12/12, docs check, markdownlint, Prettier).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added the REWATCH client screen and entry points. Completed matches can now be opened from the spectator lobby history or public profile recent matches, deep-linked with `screen=rewatch&matchId=...&step=...`, scrubbed by step, advanced with Prev/Next, and auto-played at 0.5x/1x/2x. Replay snapshots render through the existing game board in spectator/read-only mode with no valid actions. Verification passed with focused client checks and final `rtk pnpm check`.
<!-- SECTION:FINAL_SUMMARY:END -->
