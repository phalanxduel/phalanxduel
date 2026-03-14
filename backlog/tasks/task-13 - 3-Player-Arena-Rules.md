---
id: TASK-13
title: 3+ Player Arena Rules
status: Planned
assignee: []
created_date: ''
updated_date: '2026-03-14 03:00'
labels: []
dependencies: []
priority: medium
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Phalanx governance already names Arena as the multiplayer format, but the
backlog still lacks a concrete rules and board-definition task for how 3+
players should actually work. This task defines the first implementable Arena
slice so multiplayer stops being a slogan and becomes a scoped game mode.

## Problem Scenario

Given Arena is supposed to support more than two players, when implementation is
considered, then there is no defined battlefield layout, turn order, victory
condition, or queueing model for that mode.

## Planned Change

Document the first official Arena rules slice, including board topology, player
order, and win condition, before any engine or UI code is attempted. The plan
is design-first because multiplayer affects the core state model and would force
wide refactors if the product rules changed mid-implementation.

## Delivery Steps

- Given Arena is a named governance format, when this task is complete, then the
  mode's board shape and player interaction model are explicit.
- Given the engine currently assumes duel-oriented flows, when Arena planning is
  reviewed, then the required engine/client/server surfaces are identified.
- Given future implementation work, when follow-up tasks are created, then they
  can be split by board model, turn order, and UX without duplicating product
  discovery.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

- Given Arena mode, when the design slice is approved, then it defines player
  count, turn order, battlefield topology, and win condition.
- Given the current Duel-focused implementation, when Arena planning is done,
  then the main engine and UI gaps are identified clearly enough for scoped
  child tasks.
- Given ranked concerns, when Arena is reviewed, then it is clear whether the
  mode is casual-only or expected to support competitive play later.

## References

- `docs/legal/GOVERNANCE.md`

## Open Questions

- Is Arena a shared battlefield, a radial layout, or multiple fronts?
- Does elimination happen one player at a time, or is there a score objective?
- Should bots and spectators be supported in the first slice?
