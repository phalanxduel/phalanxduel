---
id: TASK-21
title: Ranked Matchmaking Queue
status: Planned
assignee: []
created_date: ''
updated_date: '2026-03-14 03:00'
labels: []
dependencies:
  - TASK-20
priority: medium
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The ranked stack can compute ratings and show leaderboards, but players still
have to arrange matches manually. This task adds the missing queue-based entry
point for ranked play so players can ask for an opponent and be paired through
server-side rating rules instead of side-channel coordination.

## Problem Scenario

Given a player wants a ranked match, when they enter the lobby today, then
there is no canonical queue or pairing flow that uses Elo or match mode to find
an opponent automatically.

## Planned Change

Introduce a server-owned matchmaking queue that stores waiting players, applies
rating-band rules, and notifies matched clients through the existing real-time
channel. The queue should live on the server because pairing needs a single
authoritative view of waiting players and acceptable Elo deltas.

## Delivery Steps

- Given a ranked player opts into matchmaking, when the request reaches the
  server, then the player is added to a queue with the data needed for
  eligibility and timeout handling.
- Given compatible players are waiting, when the server finds a pair within the
  current Elo rules, then it creates a match and notifies both clients.
- Given a player cancels, disconnects, or waits too long, when queue state is
  refreshed, then stale entries are removed safely.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

- Given a ranked queue request, when a player joins, then the server tracks the
  waiting entry until match, cancellation, or timeout.
- Given two compatible waiting players, when their Elo bands overlap under the
  pairing rules, then they receive a match-found signal and a new match is
  created.
- Given no compatible opponent exists immediately, when the player keeps
  waiting, then the queue behavior is deterministic and documented for widening
  or timeout rules.

## References

- `server/src/app.ts`
- `server/src/match.ts`
- `server/src/ladder.ts`
