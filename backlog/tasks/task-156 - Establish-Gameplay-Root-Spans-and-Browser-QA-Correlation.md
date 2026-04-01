---
id: TASK-156
title: Establish Gameplay Root Spans and Browser QA Correlation
status: Done
assignee:
  - '@codex'
created_date: '2026-03-31 23:59'
updated_date: '2026-04-01 04:23'
labels: []
dependencies:
  - TASK-154
references:
  - backlog/tasks/task-145 - Workstream-OTel-native-Observability-Migration.md
  - docs/system/DEVELOPER_GUIDE.md
priority: high
ordinal: 67000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Introduce a stable gameplay root span and browser-visible QA correlation so a
single simulated game can be queried as one coherent unit in LGTM instead of as
loosely related WebSocket action traces.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Browser-driven playthroughs propagate `qa.run_id` and `match.id` into the real client runtime rather than only into the headless and API runners.
- [x] #2 Gameplay traces expose a stable root span such as `game.match` or `qa.match.run` that is easier to select in Grafana than per-action spans alone.
- [x] #3 A single simulated browser game can be queried in Tempo/Grafana by one root span or one shared run identifier with verification evidence captured in the task notes.
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- `bin/qa/simulate-ui.ts` already injects the shared `qaRunId` query parameter
  into both browser windows, binds the observed `match.id` into the QA span,
  and records per-game correlation details from the browser and server logs.
- `client/src/main.ts` reads `qaRunId` from the browser URL and passes it into
  `createConnection`, so browser-driven runs carry the QA run identifier inside
  the real client runtime rather than only in the outer harness.
- `client/src/connection.ts` creates a stable `game.match` client span once the
  match is known and attaches both `qa.run_id` and `match.id` so Tempo/Grafana
  queries can pivot on either key for one simulated game.
- Operator docs in `docs/system/DEVELOPER_GUIDE.md` and
  `docs/system/PNPM_SCRIPTS.md` already document the supported browser QA
  filters: `resource.service.name="phx-qa-simulate-ui"`,
  `qa.run_id="<playthrough-id>"`, `name="game.match"`, and
  `match.id="<match-id>"`.

## Verification

- `rtk pnpm --filter @phalanxduel/client test -- --run client/tests/connection.test.ts`
- `rtk rg -n "qa.run_id|game.match|match.id" client/src/main.ts client/src/connection.ts bin/qa/simulate-ui.ts docs/system/DEVELOPER_GUIDE.md docs/system/PNPM_SCRIPTS.md`
<!-- SECTION:NOTES:END -->
