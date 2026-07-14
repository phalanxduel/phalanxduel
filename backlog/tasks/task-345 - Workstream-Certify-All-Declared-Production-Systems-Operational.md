---
id: TASK-345
title: 'Workstream: Certify All Declared Production Systems Operational'
status: In Progress
assignee:
  - codex
created_date: '2026-07-14 00:16'
updated_date: '2026-07-14 00:17'
labels:
  - production
  - operations
  - observability
  - reliability
dependencies: []
references:
  - 'https://fly.io/docs/launch/processes/'
  - 'https://fly.io/docs/networking/private-networking/'
  - 'https://fly.io/docs/apps/app-availability/'
documentation:
  - docs/ops/runbook.md
  - docs/ops/deployment-checklist.md
  - docs/deployment.md
  - docs/reference/environment-variables.md
  - docs/reference/admin.md
  - docs/architecture/principles.md
priority: high
ordinal: 199800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remediate the production gaps discovered during the Phalanx Duel v1.4.0 operational audit. The core browser game, REST API, WebSocket transport, database persistence, deterministic event log, TLS, and release pipeline are healthy. The audit found an unreachable/stopped OTel topology with a false-positive health signal, an ambiguous stopped admin process, absent documented MCP apps, stale staging and deployment contracts, an invalid OpenAPI production URL, legacy Sentry secrets, unverified transactional email/admin paths, and no complete production-wide assurance gate. This workstream establishes a production-only support contract and delivers independently verifiable remediation slices until every required subsystem is PASS or explicitly retired.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every declared production subsystem is classified as required, optional, or retired in one canonical support contract
- [ ] #2 Every required subsystem has a truthful machine-readable health or assurance check
- [ ] #3 Production observability, admin, MCP, email, gameplay, persistence, replay, reconnect, spectator, TLS, and release evidence are verified or explicitly scoped out
- [ ] #4 Staging is removed from active operational contracts and tooling
- [ ] #5 A final production assurance report contains no required subsystem in DEGRADED, FAIL, or NOT_TESTED state
- [ ] #6 Canonical game, site, and wiki documentation describe the same deployed topology
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approved workstream sequence:
1. TASK-345.04 defines the canonical production-only support contract.
2. TASK-345.02 repairs the private collector-first OTel topology.
3. TASK-345.03 makes liveness, readiness, and dependency assurance truthful.
4. TASK-345.01 canonicalizes the production admin architecture and TASK-345.05 resolves MCP service boundaries after the support contract.
5. TASK-345.06 removes OpenAPI, staging, Sentry, deployment, and documentation drift after service decisions land.
6. TASK-345.07 builds the unified production assurance suite.
7. TASK-345.08 proves multi-machine correctness before scaling.
8. TASK-345.09 performs final certification and synchronizes game/site/wiki status.

Execution is sequential where dependencies require it. No production mutations occur without locally verified configuration/code and an explicit operator-safe release step. Owners: Codex begins TASK-345.04; remaining subtasks are unassigned until active.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
