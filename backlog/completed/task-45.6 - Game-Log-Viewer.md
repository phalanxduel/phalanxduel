---
id: TASK-45.6
title: Game Log Viewer
status: Done
assignee: ['@claude']
created_date: '2026-03-15 18:09'
updated_date: '2026-03-15 20:46'
labels:
  - event-log
  - client
  - ui
dependencies:
  - TASK-45.5
references:
  - client/src/game-over.ts
  - client/src/match-history.ts
  - client/src/lobby.ts
  - client/tests/game-over.test.ts
  - client/tests/match-history.test.ts
  - client/tests/lobby.test.ts
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
completed matches sourced from `GET /matches/completed`. Each row shows match
summary metadata (date, players, outcome, turn count) with a link to the match log.

Both human players and spectators should see the "View Log" link at game-over.
The match history browser is accessible even before joining a match.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The game-over screen displays a "View Log" link that navigates to the
  match log for the completed game.
- [x] #2 A match history screen is reachable from the lobby that lists completed
  matches (paginated) with metadata: date, outcome, players, turn count.
- [x] #3 Clicking a match in the history list navigates to its log
  (`GET /matches/:id/log`).
- [x] #4 Both the "View Log" link and the match history list are accessible to
  screen readers (proper `<a>` semantics, descriptive link text).
- [x] #5 Client tests cover the "View Log" link render on the game-over screen.
- [x] #6 `pnpm --filter @phalanxduel/client test` passes.
<!-- AC:END -->

## Implementation Notes

**Committed 2026-03-15 via 4 incremental commits:**

1. `feat(client): add View Log link to game-over screen (TASK-45.6 AC#1)` — anchor added
   to `game-over.ts` with `matchId` guard, `target="_blank"`, `rel="noopener noreferrer"`,
   `data-testid="view-log-link"`. 4 new tests.
2. `feat(client): add renderMatchHistory component with tests (TASK-45.6 AC#2-5)` — new
   `client/src/match-history.ts` fetching `GET /matches/completed`, renders match rows
   with player names, outcome, View Log anchor. 6 tests covering loading/empty/error/rows.
3. `feat(client): add Past Games panel to lobby (TASK-45.6 AC#2-3)` — toggle button +
   collapsible `match-history-panel` in `renderLobby`, lazy-loaded on first open via
   `historyLoaded` guard. 4 lobby tests.
4. `fix(client): suppress match-history-panel animation for prefers-reduced-motion` — CSS
   accessibility fix in `@media (prefers-reduced-motion)` block.

**Notable:** New source file `match-history.ts` required regenerating `docs/system/dependency-graph.svg`
and `docs/system/KNIP_REPORT.md` — both committed alongside the source changes.

**207 client tests pass. `pnpm check:ci` passes end to end.**
