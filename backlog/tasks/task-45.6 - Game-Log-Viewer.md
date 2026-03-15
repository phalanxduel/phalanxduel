---
id: TASK-45.6
title: Game Log Viewer
status: To Do
assignee: []
created_date: '2026-03-15 18:09'
updated_date: '2026-03-15 18:18'
labels:
  - event-log
  - client
  - ui
dependencies:
  - TASK-45.5
references:
  - client/src/game-over.ts
  - client/src/renderer.ts
  - client/src/lobby.ts
parent_task_id: TASK-45
priority: medium
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-45.5 provides the HTTP endpoint for event logs. This task surfaces it in
the client so players can navigate to their game's log after a match ends, and
so any visitor can browse past games and select one to inspect.

Two additions to the client:

### 1. "View Log" link on the game-over screen

After a match ends, the game-over screen (`client/src/game-over.ts`) adds a
"View Log" link that opens `GET /matches/:id/log` in a new tab (or navigates
to the HTML view). This is a minimal change — one anchor element.

### 2. Match history / log browser

A new route or screen (accessible from the lobby) shows a paginated list of
completed matches sourced from `GET /matches`. Each row shows match summary
metadata (date, players, outcome, turn count) with a link to the match log.

Both human players and spectators should see the "View Log" link at game-over.
The match history browser is accessible even before joining a match.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The game-over screen displays a "View Log" link that navigates to the
  match log for the completed game.
- [ ] #2 A match history screen is reachable from the lobby that lists completed
  matches (paginated) with metadata: date, outcome, players, turn count.
- [ ] #3 Clicking a match in the history list navigates to its log
  (`GET /matches/:id/log`).
- [ ] #4 Both the "View Log" link and the match history list are accessible to
  screen readers (proper `<a>` semantics, descriptive link text).
- [ ] #5 Client tests cover the "View Log" link render on the game-over screen.
- [ ] #6 `pnpm --filter @phalanxduel/client test` passes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. In `client/src/game-over.ts`, after rendering the outcome, append:
   ```typescript
   const logLink = el('a', {
     href: `/matches/${matchId}/log`,
     target: '_blank',
     rel: 'noopener',
   }, 'View Match Log');
   ```

2. Add a new `renderMatchHistory` function (new file `client/src/match-history.ts`
   or inline in `lobby.ts` if small enough):
   - `GET /matches?page=1&limit=20` on load
   - Render a `<table>` or `<ul>` of match summaries
   - Each row: date, P1 vs P2 (or "vs Bot"), outcome, turns, "View Log" link

3. Add a "Past Games" button to the lobby screen in `client/src/lobby.ts`
   that triggers `renderMatchHistory`.

4. Write client tests for the game-over "View Log" link and the match history
   table render using existing jsdom + vitest patterns.
<!-- SECTION:PLAN:END -->

## Risks and Unknowns

- The match history list may show matches from all players, not just the current
  user (since there is no auth yet). This is acceptable for now; scope to
  current-user filtering when auth matures.
- The HTML log view from TASK-45.5 is a full-page server-rendered response.
  Navigating there leaves the SPA. Ensure the browser back button returns the
  player to the game client correctly.
- The `matchId` is available on the game-over screen via the `GameState` or
  `PhalanxTurnResult` — confirm the client stores it before implementing.

## Verification

```bash
pnpm --filter @phalanxduel/client test
pnpm typecheck
pnpm lint
# Manual: play a full match to game-over, verify "View Log" link appears and works
# Manual: open lobby, click "Past Games", verify match history loads
```
