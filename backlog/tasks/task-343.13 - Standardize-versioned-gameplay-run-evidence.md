---
id: TASK-343.13
title: Standardize versioned gameplay run evidence
status: To Do
assignee: []
created_date: '2026-08-04 22:39'
labels:
  - assurance
  - qa
  - gameplay
dependencies:
  - TASK-383
documentation:
  - docs/testing.md
  - docs/reference/qa-runners.md
  - docs/architecture/type-ownership.md
  - docs/adr/ADR-008-official-outputs-verifiable-offline.md
parent_task_id: TASK-343
priority: high
type: task
ordinal: 254800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace incompatible QA runner manifests and permissive evidence readers with one validated, replay-aware run-evidence contract. The contract must let local, CI, cross-client, and controlled production automation prove what actually ran without leaking credentials or hidden player state. This is the evidence foundation for subsequent trajectory, browser-adapter, and capability-gate work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A versioned machine-readable contract records runner and release identity, scenario and seed, client and transport adapters, match and player correlation, ordered actions and events, visited phases, authoritative hashes, terminal outcome, assertion results, and artifact references
- [ ] #2 Engine, live API or WebSocket, and browser run producers can round-trip their evidence through the same validator without consumer-specific shape guessing
- [ ] #3 Evidence readers return nonzero for missing, malformed, empty, skipped, or internally inconsistent required proof instead of silently passing
- [ ] #4 Transaction-log and replay evidence is either embedded or referenced explicitly so tactical and replay analyzers consume data that producers actually emit
- [ ] #5 Publicly shareable artifacts exclude credentials, private player data, and hidden state beyond the viewer policy recorded by the run
- [ ] #6 Migration and operator documentation identifies canonical producers, readers, retention behavior, and compatibility handling for historical artifacts
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
