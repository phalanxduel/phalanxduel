---
id: TASK-159
title: Verify LGTM Gameplay Topology and Operator Queries
status: To Do
assignee: []
created_date: '2026-03-31 23:59'
updated_date: '2026-04-01 03:51'
labels: []
dependencies:
  - TASK-157
  - TASK-158
references:
  - backlog/tasks/task-145 - Workstream-OTel-native-Observability-Migration.md
  - docs/system/DEVELOPER_GUIDE.md
  - docs/system/OPERATIONS_RUNBOOK.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Run the final LGTM verification pass for gameplay telemetry and document the
operator queries needed to investigate service structure, game health, and
simulation anomalies using the new OTel semantics.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Verification evidence includes sampled Tempo trace data proving that gameplay traces carry the expected cross-service, session, and run-level attributes.
- [ ] #2 Operator docs describe how to query gameplay traces by `qa.run_id`, `match.id`, and session-level reconnect or anomaly attributes.
- [ ] #3 The final verification explains any remaining limitations of Grafana service-structure views so operators know which trace selections and dashboards are authoritative.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Sample live Tempo traces after the preceding tasks land and record the key
   attributes present in stored data.
2. Update operator-facing docs with the supported LGTM queries and caveats.
3. Record the final verification evidence for the gameplay telemetry tranche.
<!-- SECTION:PLAN:END -->
