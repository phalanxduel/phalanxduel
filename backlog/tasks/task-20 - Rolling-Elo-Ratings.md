---
id: TASK-20
title: Rolling Elo Ratings
status: Done
assignee: []
created_date: ''
updated_date: '2026-03-15 15:35'
labels: []
dependencies:
  - TASK-18
priority: medium
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ranked experiences need a deterministic rating model that can be recomputed from
the canonical match record instead of drifting through ad hoc counters. This
task is complete: the repo now computes rolling Elo from persisted match data
and writes ladder snapshots for ranked categories.

## Historical Outcome

Given an authenticated player finishes a ranked match, when the match is saved,
then the ladder service computes the player's rolling Elo for the appropriate
category and persists a fresh snapshot for leaderboard queries.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given completed matches, when the ladder service computes a player's
  rating, then it applies the configured Elo formula deterministically.
- [x] #2 Given bot and PvP categories, when ratings are computed, then the service
  derives the correct ladder category and phantom-opponent handling.
- [x] #3 Given match completion, when authenticated users are present, then Elo
  snapshots are written for later leaderboard reads.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- `server/src/elo.ts` implements the Elo math.
- `server/src/ladder.ts` computes rolling windows and writes snapshot rows.
- `server/src/db/schema.ts` and `server/drizzle/0002_bent_talkback.sql` persist
  `elo_snapshots`.
- `server/tests/elo.test.ts` and `server/tests/ladder.test.ts` cover the
  calculation paths.

## Verification

- `pnpm -C server test -- elo.test.ts ladder.test.ts`
<!-- SECTION:NOTES:END -->
