---
id: TASK-23
title: Seasonal Ladder Resets and Archives
status: To Do
assignee: []
created_date: ''
updated_date: '2026-03-13 14:50'
labels: []
dependencies:
  - TASK-20
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The rolling ladder exists, but there is still no season model for resetting
competition windows, freezing historical standings, or communicating season
boundaries to players. This task adds that missing lifecycle so ranked play can
run as a recurring program instead of one never-ending ladder.

## Problem Scenario

Given the current ladder is always-on and rolling, when operators want to start
a new competitive season, then there is no first-class way to archive the
previous season's results or reset the visible ladder with explicit season
metadata.

## Planned Change

Add season-aware ladder metadata, archival behavior, and reset tooling that can
preserve historical results before a new season begins. This plan keeps the
existing ladder and snapshot work intact while layering season boundaries on top
of the current ranked system.

## Delivery Steps

- Given the current ladder schema, when season support is introduced, then
  season identifiers and archival rules are defined without losing existing
  snapshot history.
- Given an operator starts a new season, when the reset runs, then prior-season
  results are archived and the new ladder opens with clear season metadata.
- Given players view the ranked surface, when a season changes, then the UI or
  API can distinguish current standings from archived seasons.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

- Given a season transition, when the reset is executed, then the previous
  season's standings remain queryable as historical data.
- Given the new season starts, when players access ranked views, then the
  ladder clearly identifies the active season.
- Given season logic is introduced, when rolling Elo or leaderboard code runs,
  then current-season behavior stays deterministic and testable.

## References

- `server/src/ladder.ts`
- `server/src/routes/ladder.ts`
- `client/src/lobby.ts`
