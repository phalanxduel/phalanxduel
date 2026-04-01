---
id: TASK-157
title: Add Session and Reconnect Telemetry Semantics
status: Human Review
assignee:
  - '@codex'
created_date: '2026-03-31 23:59'
updated_date: '2026-04-01 04:12'
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
- [x] #1 Gameplay telemetry carries a stable socket or gameplay session identifier in addition to `match.id`.
- [x] #2 Browser and QA runners emit explicit reconnect, stall, disconnect, and anomaly events or counters with consistent attribute names.
- [x] #3 Operators can distinguish repeated reconnect loops from healthy match progress in Grafana or Tempo using the documented telemetry fields alone.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Define the canonical session-level attribute names for gameplay and socket
   lifecycles.
2. Emit structured reconnect and anomaly events from the browser connection
   layer and QA harnesses.
3. Document the resulting gameplay-health query patterns for operators.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- `client/src/connection.ts` already attaches `ws.session_id`,
  `game.session_id`, and `ws.reconnect_attempt` to browser gameplay telemetry
  and emits structured session events such as
  `game.session.opponent_disconnected`, `game.session.opponent_reconnected`,
  `game.session.disconnected`, `game.session.reconnect_scheduled`, and
  `game.session.error`.
- `server/src/tracing.ts` already preserves the incoming browser/QA telemetry
  envelope as server-side span attributes, including `qa.run_id`,
  `ws.session_id`, `game.session_id`, `ws.reconnect_attempt`, and
  `peer.service`.
- `bin/qa/telemetry.ts` and `bin/qa/simulate-ui.ts` already emit explicit QA
  reconnect and anomaly signals, including the `qa.reconnect.total` metric,
  `qa.reconnect` events, and stall-pattern annotations keyed by `match.id` and
  `qa.run_id`.
- `docs/system/DEVELOPER_GUIDE.md` and `docs/system/OPERATIONS_RUNBOOK.md`
  already document the operator query filters for `qa.run_id`,
  `ws.session_id`, and `ws.reconnect_attempt` so reconnect loops can be
  separated from healthy match progress.

## Verification

- `rtk pnpm --filter @phalanxduel/server test -- --run server/tests/tracing.test.ts`
- `rtk rg -n "ws\\.session_id|game\\.session_id|ws\\.reconnect_attempt|qa\\.reconnect|ui_turn_stall|game\\.session" client/src bin/qa docs/system server/src server/tests client/tests`
<!-- SECTION:NOTES:END -->
