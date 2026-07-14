---
id: TASK-345.02
title: Repair Production OTel Collector Topology
status: To Do
assignee: []
created_date: '2026-07-14 00:17'
updated_date: '2026-07-14 00:17'
labels:
  - production
  - observability
  - fly
dependencies:
  - TASK-345.04
references:
  - 'https://fly.io/docs/launch/processes/'
  - 'https://fly.io/docs/networking/private-networking/'
documentation:
  - fly.production.toml
  - otel-collector.fly.yaml
  - docs/architecture/principles.md
  - docs/reference/environment-variables.md
parent_task_id: TASK-345
priority: high
ordinal: 201800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the invalid localhost assumption between separate Fly Machines with a supported collector-first production topology. The web runtime must reach a private collector boundary, and the collector must export to LGTM without exposing OTLP publicly. Preserve gameplay availability when telemetry is degraded and provide direct trace evidence using stable gameplay correlation identifiers.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Production application exporters target a reachable private collector endpoint rather than cross-machine localhost
- [ ] #2 At least one collector machine is running with an explicit health check and restart policy
- [ ] #3 OTLP receiver is not publicly exposed
- [ ] #4 A synthetic correlated trace reaches LGTM and is searchable by stable gameplay identifiers
- [ ] #5 Collector/export failure produces an observable degraded signal without making core gameplay unavailable
- [ ] #6 Topology has automated configuration tests and updated operator documentation
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
