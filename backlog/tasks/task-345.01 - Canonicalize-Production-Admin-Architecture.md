---
id: TASK-345.01
title: Canonicalize Production Admin Architecture
status: Verification
assignee:
  - '@codex'
created_date: '2026-07-14 00:17'
updated_date: '2026-07-20 19:22'
labels:
  - production
  - admin
  - security
dependencies:
  - TASK-345.04
documentation:
  - docs/reference/admin.md
  - docs/ops/production-support-contract.md
  - admin/fly.toml
  - fly.production.toml
  - .github/workflows/pipeline.yml
parent_task_id: TASK-345
priority: high
ordinal: 200800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolve the ambiguity between the authenticated admin routes hosted by the web server and the stopped dedicated Fly admin process. Establish exactly one supported architecture, preserve least-privilege authentication and auditability, and remove or correctly service redundant process definitions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Exactly one canonical production admin architecture is documented and deployed
- [ ] #2 Anonymous and invalid authentication are rejected
- [ ] #3 A valid operator can perform a harmless authenticated read
- [ ] #4 Admin mutations remain explicitly authorized and auditable
- [ ] #5 No production fallback credentials exist
- [ ] #6 Redundant or dead admin process configuration is removed or made independently healthy with private routing
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Canonicalize the dedicated admin application as the sole production admin architecture: remove the legacy web-server admin UI/API registration and remove the dead admin process from the main Fly application.
2. Make the dedicated admin service fail closed in production: require explicit JWT and internal-service secrets/URLs, reject non-admin login attempts, and expose safe health/readiness probes with release identity.
3. Preserve least privilege and durable auditability: keep mutations behind the private game-server internal boundary, verify administrator authorization, and test durable admin_audit_log writes.
4. Encode the architecture in deployment configuration, release automation, static contracts, and canonical operator/reference documentation.
5. Verify gameplay before UI-adjacent work, then run targeted admin/server tests, quick/full contract checks, and database-isolated verification.
6. During a zero-active-match window, provision and deploy the dedicated admin application, verify health/readiness/authenticated harmless read/audited mutation behavior, confirm legacy web-admin surfaces are absent, and record release evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Execution resumed 2026-07-20 after handoff validation. Human approved the recommended dedicated-admin architecture and sequencing.

Pre-change production evidence: game /health and /ready are healthy; /api/stats reports zero active matches; the main Fly app's unrouted admin process is stopped; no separate phalanxduel-admin Fly app currently exists. OTel remains deliberately disabled because the configured LGTM endpoint is unreachable; that independent issue is deferred to TASK-345.02.

Risk classification: L2 cross-package architecture. High-signal surfaces include server route registration, admin authentication/configuration, Fly process topology, release automation, and production support documentation.

Local verification evidence 2026-07-20: mandatory playability matrix passed 12/12 with zero warnings/errors; targeted admin tests passed 15/15; targeted server trust-boundary tests passed 30/30; full workspace tests passed (shared 153, engine 418, server 378 + migrations 4, client 231, admin 15, MCP 5).

Compiled-runtime smoke: built admin/dist/server, started it in NODE_ENV=production with explicit secrets through the isolated test-Postgres wrapper, observed OTel disabled, GET /health=200 with version/build/SHA, GET /ready=200 database=ok, and anonymous GET /admin-api/matches=401.

Generated OpenAPI, route inventory, schema, dependency graph, and snapshot were refreshed. The published game OpenAPI no longer includes Basic Auth or /api/admin/*; new server-side replay and A/B operations are hidden behind the bearer-protected /internal boundary.

Release-gate follow-up 2026-07-20: the first containerized `rtk bin/dock pnpm verify:full` passed all build/lint/type/package-test/rules/architecture/contract/property phases, then exposed a pre-existing Stryker sandbox packaging defect: `engine/tests/calculation-provenance.test.ts` resolved the canonical rule registry relative to the normal repository layout and failed after Stryker relocated the test. The test now resolves the same canonical `docs/gameplay/rule-evidence.json` in both layouts; its normal Vitest case passes and Stryker's isolated dry run now succeeds (396 tests). Cross-checking the executable release flow also found and removed a dead commented staging job, corrected stale production/staging and Husky-gate descriptions in canonical delivery docs, and extended `verify-production-contract.ts` to prevent staging target/documentation regression. Full mutation scoring and the complete container rerun remain in progress.

Final isolated release gate passed 2026-07-20 via the automation container after restoring the already-tracked `oxc-parser@0.133.0` patch mapping removed by a dependency-maintenance regression. Evidence: full lint/type/package suite green; DB isolation 24/24; production contract; 2,355,388-case combat reference digest; mutation 74.32% with zero errors (threshold 50); performance p99 1.086 ms (limit 10 ms); replay 20/20; playthrough 12/12 with zero warnings/errors; visual QA 3/3; docs/Markdown/Prettier clean. Task moved to Verification pending immutable-image deployment and live operator/read boundary evidence.
<!-- SECTION:NOTES:END -->
