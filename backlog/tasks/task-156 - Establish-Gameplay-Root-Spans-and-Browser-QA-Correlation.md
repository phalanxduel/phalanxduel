---
id: TASK-156
title: Establish Gameplay Root Spans and Browser QA Correlation
status: In Progress
assignee:
  - '@codex'
created_date: '2026-03-31 23:59'
updated_date: '2026-04-01 01:35'
labels: []
dependencies:
  - TASK-154
references:
  - backlog/tasks/task-145 - Workstream-OTel-native-Observability-Migration.md
  - docs/system/DEVELOPER_GUIDE.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Introduce a stable gameplay root span and browser-visible QA correlation so a
single simulated game can be queried as one coherent unit in LGTM instead of as
loosely related WebSocket action traces.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Browser-driven playthroughs propagate `qa.run_id` and `match.id` into the real client runtime rather than only into the headless and API runners.
- [ ] #2 Gameplay traces expose a stable root span such as `game.match` or `qa.match.run` that is easier to select in Grafana than per-action spans alone.
- [ ] #3 A single simulated browser game can be queried in Tempo/Grafana by one root span or one shared run identifier with verification evidence captured in the task notes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the browser playthrough harness so both client windows inherit the
   same `qa.run_id`.
2. Add a gameplay root span in the browser and/or server path that stays active
   across the match lifecycle.
3. Update QA docs so operators know how to query a single browser simulation in
   LGTM by root span or run identifier.
<!-- SECTION:PLAN:END -->
