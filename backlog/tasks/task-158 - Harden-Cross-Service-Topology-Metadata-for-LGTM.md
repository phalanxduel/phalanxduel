---
id: TASK-158
title: Harden Cross-Service Topology Metadata for LGTM
status: To Do
assignee: []
created_date: '2026-03-31 23:59'
updated_date: '2026-04-01 03:51'
labels: []
dependencies:
  - TASK-156
references:
  - backlog/tasks/task-145 - Workstream-OTel-native-Observability-Migration.md
  - docs/system/ENVIRONMENT_VARIABLES.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Normalize the resource and span metadata that LGTM uses for service topology so
client, QA, and server traces consistently render as intentional service
boundaries instead of only as raw parent-child spans.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Caller spans expose stable remote-service metadata such as `peer.service`, `server.address`, `server.port`, and normalized endpoint fields across browser and QA runners.
- [ ] #2 Runtime resources expose consistent environment and service identity attributes such as `deployment.environment`, `service.namespace`, and stable service-instance metadata where appropriate.
- [ ] #3 A sampled cross-service gameplay trace in Tempo contains the topology fields needed for service-structure analysis, with the evidence captured in the task notes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit the current client, QA, and server resource attributes against the
   fields Tempo and Grafana service-structure views consume.
2. Fill the gaps without coupling applications directly to backend-specific
   terminology.
3. Record a before/after trace sample showing the normalized topology metadata.
<!-- SECTION:PLAN:END -->
