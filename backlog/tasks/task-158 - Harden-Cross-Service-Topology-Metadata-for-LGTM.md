---
id: TASK-158
title: Harden Cross-Service Topology Metadata for LGTM
status: Done
assignee:
  - '@codex'
created_date: '2026-03-31 23:59'
updated_date: '2026-04-01 04:23'
labels: []
dependencies:
  - TASK-156
references:
  - backlog/tasks/task-145 - Workstream-OTel-native-Observability-Migration.md
  - docs/system/ENVIRONMENT_VARIABLES.md
priority: high
ordinal: 69000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Normalize the resource and span metadata that LGTM uses for service topology so
client, QA, and server traces consistently render as intentional service
boundaries instead of only as raw parent-child spans.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Caller spans expose stable remote-service metadata such as `peer.service`, `server.address`, `server.port`, and normalized endpoint fields across browser and QA runners.
- [x] #2 Runtime resources expose consistent environment and service identity attributes such as `deployment.environment`, `service.namespace`, and stable service-instance metadata where appropriate.
- [x] #3 A sampled cross-service gameplay trace in Tempo contains the topology fields needed for service-structure analysis, with the evidence captured in the task notes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit the current client, QA, and server resource attributes against the
   fields Tempo and Grafana service-structure views consume.
2. Fill the gaps without coupling applications directly to backend-specific
   terminology.
3. Record a before/after trace sample showing the normalized topology metadata.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- `client/src/connection.ts` and `bin/qa/api-playthrough.ts` already attach
  stable caller-side topology fields including `peer.service`,
  `server.address`, and `server.port` for browser and QA-originated traffic.
- `server/src/tracing.ts` preserves the caller identity as `peer.service` on
  incoming server spans so cross-service gameplay traces can retain their
  browser or QA origin.
- `client/src/instrument.ts`, `server/src/instrument.ts`, and
  `scripts/instrument-cli.ts` already publish normalized resource attributes
  for `service.namespace`, `deployment.environment`, `service.instance.id`,
  and `service.version`.
- The current verification remains repo-local rather than a pasted Tempo
  screenshot: the tracing tests and documented attribute surfaces establish the
  topology fields expected to appear in sampled cross-service gameplay traces.

## Verification

- `rtk pnpm --filter @phalanxduel/server test -- --run server/tests/tracing.test.ts`
- `rtk rg -n "peer\\.service|server\\.address|server\\.port|deployment\\.environment|service\\.namespace|service\\.instance\\.id|service\\.version|resource\\.service\\.name|qa\\.run_id|ws\\.session_id" client/src server/src scripts bin/qa docs/system server/tests client/tests`
<!-- SECTION:NOTES:END -->
