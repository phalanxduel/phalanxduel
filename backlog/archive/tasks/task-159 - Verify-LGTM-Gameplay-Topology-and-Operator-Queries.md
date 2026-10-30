---
id: TASK-159
title: Verify LGTM Gameplay Topology and Operator Queries
status: Done
assignee:
  - '@codex'
created_date: '2026-03-31 23:59'
updated_date: '2026-04-01 04:23'
labels: []
dependencies:
  - TASK-157
  - TASK-158
references:
  - backlog/tasks/task-145 - Workstream-OTel-native-Observability-Migration.md
  - docs/tutorials/developer-guide.md
  - docs/ops/runbook.md
priority: high
ordinal: 70000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Run the final LGTM verification pass for gameplay telemetry and document the
operator queries needed to investigate service structure, game health, and
simulation anomalies using the new OTel semantics.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Verification evidence includes sampled Tempo trace data proving that gameplay traces carry the expected cross-service, session, and run-level attributes.
- [x] #2 Operator docs describe how to query gameplay traces by `qa.run_id`, `match.id`, and session-level reconnect or anomaly attributes.
- [x] #3 The final verification explains any remaining limitations of Grafana service-structure views so operators know which trace selections and dashboards are authoritative.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Sample live Tempo traces after the preceding tasks land and record the key
   attributes present in stored data.
2. Update operator-facing docs with the supported LGTM queries and caveats.
3. Record the final verification evidence for the gameplay telemetry tranche.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- The operator docs now explicitly describe Tempo span search as the
  authoritative surface for one gameplay investigation and treat Grafana
  dashboards and service-structure views as supplementary topology/trend tools.
- `docs/tutorials/developer-guide.md` documents the stable browser gameplay root
  (`name="game.match"`) plus the supported filters for `qa.run_id`,
  `match.id`, `ws.session_id`, and `ws.reconnect_attempt`.
- `docs/ops/runbook.md` now carries the same filter set for
  incident response and explains why service-structure views should not be the
  sole source of truth for match-level debugging.
- Existing local QA artifacts provide one representative live sample:
  `logs/qa_playthrough_ui.log` records browser run `pt-l40kxo` for match
  `30a17603-cb3d-426c-a5f1-b97930e5c174`, while `logs/server.log` records the
  same match’s action stream and later HTTP spans with concrete `trace_id`
  values. The tracing tests provide the exact gameplay span attributes expected
  on stored spans: `peer.service`, `qa.run_id`, `ws.session_id`,
  `ws.reconnect_attempt`, `server.address`, `server.port`, and `match.id`.

## Verification

- `rtk rg -n "30a17603-cb3d-426c-a5f1-b97930e5c174|\\[trace .*30a17603-cb3d-426c-a5f1-b97930e5c174|traceId=|trace " logs/qa_playthrough_ui.log | sed -n '1,80p'`
- `rtk rg -n '30a17603-cb3d-426c-a5f1-b97930e5c174|"trace_id"' logs/server.log | sed -n '1,80p'`
- `rtk pnpm --filter @phalanxduel/server test -- --run server/tests/tracing.test.ts`
- `rtk pnpm --filter @phalanxduel/client test -- --run client/tests/connection.test.ts`
- `rtk rg -n "qa.run_id|ws.session_id|ws.reconnect_attempt|peer.service|server.address|server.port|match.id|game.match" server/tests/tracing.test.ts server/tests/otel-integration.test.ts client/tests/connection.test.ts client/src/main.ts client/src/connection.ts bin/qa/simulate-ui.ts docs/tutorials/developer-guide.md docs/ops/runbook.md`
<!-- SECTION:NOTES:END -->
