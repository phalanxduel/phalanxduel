---
id: TASK-19
title: Player Match History and Lifetime Stats
status: To Do
assignee: []
created_date: ''
updated_date: '2026-03-13 14:50'
labels: []
dependencies:
  - TASK-18
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Authenticated players can already see rolling ladder badges, but they still do
not have a clear lifetime record or a browsable recent-match history. This task
turns the current ranked summary into a player-facing history feature that helps
users understand progress, forfeits, and recent opponents.

## Problem Scenario

Given a returning authenticated player, when they open the lobby, then they can
see current rolling Elo by category but they cannot inspect recent completed
matches or view a lifetime wins/losses/forfeits record derived from their
account history.

## Planned Change

Extend the stats and lobby flows to expose recent match history plus lifetime
record totals for authenticated users. The planned approach builds on the
existing `matches` table, authenticated user ids, and `/api/stats/:userId`
pattern instead of introducing a second source of truth for player history.

## Delivery Steps

- Given the persisted matches table, when a history query is added, then it
  returns recent completed matches with opponent, outcome, mode, and timestamp.
- Given authenticated user data in the lobby, when the stats UI renders, then
  it shows lifetime W/L/F totals and a recent-match history view.
- Given guest players, when they use the lobby, then the history UI stays tied
  to authenticated accounts and does not leak private match data.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

- Given an authenticated user, when they request their stats history, then the
  response includes lifetime wins, losses, forfeits, and recent completed
  matches.
- Given the lobby profile area, when it renders for an authenticated user, then
  it shows more than rolling Elo badges by exposing recent match history or a
  clear entry point to it.
- Given a completed match, when it ends in a forfeit, then the lifetime record
  distinguishes that result from a normal win/loss where applicable.

## References

- `client/src/lobby.ts`
- `server/src/routes/ladder.ts`
- `server/src/db/schema.ts`
