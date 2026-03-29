---
id: TASK-23
title: Seasonal Ladder Resets and Archives
status: Planned
assignee: []
created_date: ''
updated_date: '2026-03-29 22:33'
labels:
  - ranked
  - platform
  - architecture
milestone: v0.5.0 - Stability & Playability
dependencies:
  - TASK-21
priority: medium
ordinal: 8000
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
<!-- AC:BEGIN -->
- Given a season transition, when the reset is executed, then the previous
  season's standings remain queryable as historical data.
- Given the new season starts, when players access ranked views, then the
  ladder clearly identifies the active season.
- Given season logic is introduced, when rolling Elo or leaderboard code runs,
  then current-season behavior stays deterministic and testable.

<!-- AC:END -->

## References

- `server/src/ladder.ts`
- `server/src/routes/ladder.ts`
- `client/src/lobby.ts`

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [ ] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [ ] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [ ] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [ ] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [ ] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [ ] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
<!-- DOD:END -->
