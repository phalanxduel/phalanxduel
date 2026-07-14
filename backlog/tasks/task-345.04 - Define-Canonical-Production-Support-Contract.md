---
id: TASK-345.04
title: Define Canonical Production Support Contract
status: Done
assignee:
  - codex
created_date: '2026-07-14 00:17'
updated_date: '2026-07-14 00:37'
labels:
  - production
  - documentation
  - architecture
dependencies:
  - TASK-345.10
documentation:
  - docs/ops/runbook.md
  - docs/deployment.md
  - docs/architecture/principles.md
modified_files:
  - docs/ops/production-support-contract.md
  - docs/architecture/principles.md
  - docs/deployment.md
  - docs/ops/deployment-checklist.md
  - docs/ops/runbook.md
  - scripts/ci/verify-production-contract.ts
  - package.json
parent_task_id: TASK-345
priority: high
ordinal: 203800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the authoritative production-only service inventory for Phalanx Duel. Classify browser client, REST/WebSocket server, PostgreSQL persistence, admin, OTel/LGTM, public/private MCP, transactional email, marketing site/wiki, SDKs, replay, spectator, reconnect, and recovery surfaces as required, optional, or retired. Record production endpoints, ownership, health semantics, release path, and verification evidence. Staging is retired and must not remain an active prerequisite or target.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 One canonical support matrix classifies every known subsystem as required, optional, or retired
- [x] #2 Each required subsystem lists its production endpoint or private access path and health/verification contract
- [x] #3 The immutable GHCR image promotion path is recorded as canonical
- [x] #4 Staging is explicitly retired and excluded from active deployment semantics
- [x] #5 The contract is referenced by operator documentation and tests validate critical endpoint constants
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approved first slice:
1. Use context discovery to inventory existing endpoint constants, deployment semantics, service definitions, and documentation conventions.
2. Add one canonical production support contract covering required/optional/retired services, endpoints, health semantics, ownership, and verification evidence.
3. Update canonical operator/architecture documents to reference that contract and state production-only immutable-image promotion semantics.
4. Add automated regression coverage for critical production endpoint constants and retired staging assumptions.
5. Run targeted documentation/configuration tests, then the repository playability and unified verification gates before committing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Context Hunter classification: L2. Reviewed .github/workflows/pipeline.yml, fly.production.toml, docs/ops/runbook.md, docs/ops/deployment-checklist.md, docs/deployment.md, docs/architecture/principles.md, docs/reference/client-compatibility.md, docs/ops/slo.md, scripts/ci/verify.sh, scripts/ci/verify-doc-artifacts.sh, scripts/ci/verify-contracts.ts, package.json, and recent release commits. Chosen pattern: canonical front-matter reference document plus a TypeScript drift verifier wired into verify:contracts. Primary risk: prose/executable topology divergence. Scope excludes production mutation and service deployment.

Implemented docs/ops/production-support-contract.md with 12 required, 1 optional, and 3 retired subsystem rows; each required row includes production path, owner, and direct proof.

Updated canonical architecture, deployment, runbook, and deployment checklist documents to reference the contract and describe production-only tested-GHCR-image promotion.

Added scripts/ci/verify-production-contract.ts and wired it into pnpm verify:contracts. The verifier checks subsystem classification, canonical-doc references, retired staging job semantics, immutable image promotion, Fly app identity, /health and /ready checks, and OpenAPI/AsyncAPI production origins.

Targeted verification passed: pnpm verify:production-contract; pnpm verify:contracts; markdownlint on changed docs and Backlog tasks; Prettier check; git diff --check; pnpm verify:quick (build, lint, DB isolation, typecheck, generated docs, repository-wide Markdown lint, formatting).

Unified verification blocker: `pnpm check` passed build, lint, DB isolation, typecheck, docs generation, repository Markdown lint, formatting, shared tests (153), and engine tests (418). The server suite passed all 56 files and 382 assertions but exited 1 with Vitest EnvironmentTeardownError: closing RPC while `onUserConsoleLog` was pending, attributed to tests/reconnect.test.ts. Re-running the isolated reconnect test passed 1 file / 14 tests. Re-running the complete server suite reproduced the same post-assertion teardown error. No server or reconnect code is modified by TASK-345.04. Task remains In Progress pending an explicit scope decision for this newly discovered baseline test-runner defect.

Verification blocker is now tracked in approved child TASK-345.10. This slice is queued until the server-suite teardown defect is resolved and the unified gate can be rerun.

TASK-345.10 is complete. Unified verification was rerun successfully after the test-runner fix: `pnpm check`, schema generation/check, rules/FSM/event-log evidence, and exhaustive combat-reference verification all pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Established the canonical production-only support contract for Phalanx Duel. The new matrix classifies every declared subsystem as required, optional, or retired; records ownership, production access paths, health semantics, and direct evidence; defines PASS/DEGRADED/FAIL/NOT_TESTED; and explicitly retires staging, Sentry, and source-based Fly deploys. Updated architecture and operator docs to reference the contract and the immutable GHCR promotion path. Added a TypeScript drift verifier wired into `verify:contracts` for classifications, endpoint origins, Fly identity/readiness, retired staging workflow semantics, and immutable-image promotion. Verification passed: contract verifier, contract suite, formatting/Markdown/diff checks, `pnpm check`, schema generation/check, rules/FSM/event-log evidence, and exhaustive combat-reference verification.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
