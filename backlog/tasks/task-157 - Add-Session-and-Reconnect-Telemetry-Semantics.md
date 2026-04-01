---
id: TASK-157
title: Add Session and Reconnect Telemetry Semantics
status: To Do
assignee: []
created_date: '2026-03-31 23:59'
updated_date: '2026-04-01 03:51'
labels: []
dependencies:
  - TASK-156
references:
  - backlog/tasks/task-145 - Workstream-OTel-native-Observability-Migration.md
  - docs/system/OPERATIONS_RUNBOOK.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make reconnects, socket lifecycles, and gameplay anomalies first-class OTel
signals so match health can be analyzed by session behavior instead of only by
match identifier or free-form logs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Gameplay telemetry carries a stable socket or gameplay session identifier in addition to `match.id`.
- [ ] #2 Browser and QA runners emit explicit reconnect, stall, disconnect, and anomaly events or counters with consistent attribute names.
- [ ] #3 Operators can distinguish repeated reconnect loops from healthy match progress in Grafana or Tempo using the documented telemetry fields alone.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Define the canonical session-level attribute names for gameplay and socket
   lifecycles.
2. Emit structured reconnect and anomaly events from the browser connection
   layer and QA harnesses.
3. Document the resulting gameplay-health query patterns for operators.
<!-- SECTION:PLAN:END -->
