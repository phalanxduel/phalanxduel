---
id: TASK-345.11
title: Contain Production OTel Failure Without Affecting Gameplay
status: In Progress
assignee:
  - '@codex'
created_date: '2026-07-14 00:52'
updated_date: '2026-07-14 00:55'
labels:
  - production
  - observability
  - reliability
dependencies:
  - TASK-345.04
documentation:
  - fly.production.toml
  - server/src/instrument.ts
  - server/src/routes/health.ts
  - docs/ops/runbook.md
  - docs/ops/production-support-contract.md
modified_files:
  - backlog/tasks/task-345.02 - Repair-Production-OTel-Collector-Topology.md
  - >-
    backlog/tasks/task-345.11 -
    Contain-Production-OTel-Failure-Without-Affecting-Gameplay.md
  - docs/ops/deployment-checklist.md
  - docs/ops/production-support-contract.md
  - docs/ops/runbook.md
  - docs/reference/environment-variables.md
  - docs/system/dependency-graph.svg
  - fly.production.toml
  - scripts/ci/verify-production-contract.ts
  - server/src/instrument.ts
  - server/src/otel-config.ts
  - server/src/routes/health.ts
  - server/tests/health.test.ts
parent_task_id: TASK-345
priority: high
ordinal: 210800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Production OTel failed live validation on 2026-07-14: the collector image rejected the deprecated logging exporter, the configured LGTM upstream was unreachable from Fly, and the collector entered a restart loop. Establish an explicit temporary telemetry-disabled production posture so gameplay remains stable while the full collector repair stays separately tracked. The disable must be truthful, fail-open for gameplay, persistent across deployments, and reversible only after the restoration prerequisites are satisfied.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Production gameplay liveness and database readiness remain passing while OTel is deliberately disabled
- [x] #2 The production deployment contract cannot recreate a collector process or activate application exporters unintentionally
- [ ] #3 The production health response reports observability as disabled rather than active and exposes no endpoint or secret data
- [x] #4 Automated tests cover the disabled health signal and production deployment configuration
- [x] #5 Operator documentation records the temporary disabled posture, direct failure evidence, and explicit restoration prerequisites
- [ ] #6 The production-only pipeline deploys the containment change and live verification confirms the expected release identity, healthy gameplay surface, and absent collector group
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Encode the temporary production posture in `fly.production.toml`: disable the application SDK explicitly and remove the production collector process so a normal deploy cannot recreate it.
2. Add a focused regression for `/health` and update the implementation so `otel_active` is false when `OTEL_SDK_DISABLED=true`, without coupling gameplay liveness to telemetry.
3. Add a static production-contract verifier for the disabled topology and wire it into the existing contract gate using repo-native TypeScript verification patterns.
4. Update canonical operator/environment/support documentation with the 2026-07-14 evidence, current disabled posture, and measurable prerequisites for re-enabling OTel.
5. Run targeted tests and contract checks, then the unified check and disk-conscious container verification required by the repository.
6. Commit and push the focused change on `main`, monitor the production-only pipeline, approve/complete the production promotion if required, and verify release identity, health, readiness, zero active matches before rollout, and absence of an OTel process group.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Live containment completed before repository edits under explicit user authorization: `otel` was scaled from one crash-looping Machine to zero, then the production secret `OTEL_SDK_DISABLED=true` was set during a zero-active-match window. Post-rollout evidence: web started with 2/2 Fly checks passing, `/health` HTTP 200, `/ready` returned `database=ok`, `/api/stats` returned `activeMatches=0`, and an in-Machine boolean probe returned `OTEL_DISABLED`. The current health payload still falsely reports `otel_active=true`, which this task will correct.

Repository containment implemented: `fly.production.toml` explicitly disables the SDK and no longer declares an `otel` process; SDK startup and `/health` share `isOtelSdkDisabled`; health regressions cover disabled and enabled endpoint states; the existing production-contract verifier rejects collector resurrection or kill-switch removal; runbook, support contract, deployment checklist, and environment reference document the temporary posture and restoration gates.

Targeted verification: guarded `phalanxduel_test` health suite passed 11/11; server TypeScript check passed; `pnpm verify:production-contract` passed; Prettier check passed for all touched supported file types.

The documentation artifact checker generated the expected dependency-graph update for the new shared OTel config module. Because this checker compares generated files to `HEAD`, the focused change must be committed before the full check can prove the artifact is stable.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
