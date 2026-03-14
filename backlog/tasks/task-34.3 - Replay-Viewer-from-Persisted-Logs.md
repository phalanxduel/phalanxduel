---
id: TASK-34.3
title: Replay Viewer from Persisted Logs
status: To Do
assignee: []
created_date: '2026-03-12 13:34'
updated_date: '2026-03-14 03:05'
labels: []
dependencies:
  - TASK-24
references:
  - backlog/tasks/task-24 - Per-Action-Audit-Log-Persistence.md
  - server/src/db/schema.ts
parent_task_id: TASK-34
priority: medium
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Players and support staff need more than an admin replay endpoint; they need a
focused viewer that can step through a completed match from persisted history.
This task creates the player-facing replay surface that turns canonical match
logs into an understandable theater mode.

## Problem Scenario

Given a completed match exists in persistence, when a player or operator wants
to review how it unfolded, then the repo offers admin replay data but not a
dedicated client experience for exploring the recorded turn history.

## Planned Change

Build a replay viewer that reads the canonical persisted match and
transaction-log format instead of inventing a second ad hoc playback model. This
keeps the UI aligned with the same audit data used for verification and support.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A replay/theater experience can render a persisted transaction log for a completed match.
- [ ] #2 The replay viewer uses the canonical persisted match and transaction-log format.
- [ ] #3 The ranked roadmap has a canonical Backlog successor for the replay-viewer item.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Implement after persistent transaction logging is stable. Reuse the persisted match record format from the database layer and expose a focused client replay surface instead of a second ad hoc log format.
<!-- SECTION:PLAN:END -->

## Delivery Steps

- Given canonical persisted match data exists, when the replay surface is built,
  then it can load and render a completed match without requiring live gameplay
  code paths.
- Given the transaction log is the source of truth, when playback advances, then
  the viewer steps through the canonical recorded history rather than derived UI
  state.
- Given support and player review use cases, when the viewer ships, then it is
  clear how to open a match, navigate turns, and inspect key state changes.
