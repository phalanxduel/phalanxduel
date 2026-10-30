---
id: TASK-384
title: Remediate CI dependency audit vulnerabilities
status: Done
assignee:
  - '@codex'
created_date: 2026-08-30 22:59
updated_date: '2026-10-30T13:42:00Z'
labels:
  - security
  - dependencies
  - ci
dependencies: []
references:
  - https://github.com/phalanxduel/phalanxduel/security/dependabot
documentation:
  - docs/development.md
  - docs/testing.md
modified_files:
  - package.json
  - pnpm-lock.yaml
  - shared/schemas/client-messages.schema.json
  - shared/schemas/event.schema.json
  - shared/schemas/game-state.schema.json
  - shared/schemas/gameplay-trajectory.schema.json
  - shared/schemas/match-event-log.schema.json
  - shared/schemas/run-evidence.schema.json
  - shared/schemas/server-messages.schema.json
  - shared/schemas/turn-result.schema.json
  - server/tests/__snapshots__/openapi.test.ts.snap
  - docs/system/KNIP_REPORT.md
priority: high
type: chore
ordinal: 258800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolve the dependency vulnerabilities currently failing the GitHub Actions audit. Prefer lockfile/package upgrades that reach patched versions without bypassing audit; validate runtime/build compatibility and document any unavoidable transitive exceptions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 CI dependency audit passes at --audit-level=high
- [x] #2 find-my-way, @fastify/static, undici, fast-uri, js-yaml, nanoid, postcss, and all other reported high-severity paths are upgraded or explicitly remediated
- [x] #3 Full repository verification and affected package tests pass
- [x] #4 Lockfile and dependency documentation remain consistent
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
1. Raise the package.json direct undici version and pnpm overrides to patched ranges for Vite, markdown-it, follow-redirects, Zod, and body-parser; regenerate pnpm-lock.yaml.
2. Regenerate shared JSON Schema artifacts and refresh the OpenAPI snapshot where Zod's patched ISO datetime generation changed the documented regex. Confirm the regex matches runtime parsing.
3. Run pnpm audit --audit-level high, pnpm check, and the schema consistency check after committing generated artifacts.
4. Push the remediation, inspect current Dependabot alerts and the new Actions pipeline, then close only after CI confirms the audit and required checks pass.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Investigating the patched-version paths reported by the CI audit. Will update direct dependencies and root overrides together, then run focused package checks and the full repository gate.

Updated direct @fastify/static dependencies to ^10.1.1 and added a scoped @fastify/swagger-ui static override; patched fast-uri, find-my-way, nanoid, postcss, and js-yaml constraints; pinned undici to patched 7.29.0 for jsdom compatibility.

Verification: pnpm check passed after narrowing js-yaml to 4.3.1 and undici to 7.29.0. Targeted client suite passed 27 files / 237 tests. Registry pnpm audit could not complete because registry.npmjs.org DNS was unavailable in the environment; remote CI audit remains the authoritative confirmation.

Remote workflow 33341346452 reduced the audit from 9 high findings to one high finding: ip-address <=10.3.0 via the OpenAPI generator proxy chain. Added ip-address >=10.3.1 override.

After the final override: pnpm check passed, including 163 shared, 422 engine, 402 server plus migrations, 237 client, 15 admin, and 8 MCP tests.

Finalization: all four acceptance criteria are supported by remote audit workflow 33341657092 and local full verification. All Definition of Done checks completed.

2026-10-30 health follow-up: GitHub Dependabot initially showed six high alerts (Vite 8.1.2, markdown-it 14.3.0, follow-redirects 1.16.0, plus a stale direct undici declaration). Updated constraints and direct undici to 7.30.1. Registry audit then exposed two current high paths: Zod <4.6.6 and body-parser <2.4.0; raised overrides to patched ranges. Resolved versions: Vite 8.3.5, markdown-it 15.0.3, follow-redirects 1.16.2, undici 7.30.1, Zod 4.6.7. Registry audit: 32 findings, 0 high/critical (4 low, 28 moderate).

Verification after security updates: pnpm check passed quick build/lint/typecheck/docs plus 1,280 tests (163 shared, 422 engine, 401 server, 4 migrations, 267 client, 15 admin, 8 MCP). pnpm rules:check passed FSM consistency, event-log coverage, evidence for 71 rules, and exhaustive combat reference verification (2,355,388 cases). pnpm docs:artifacts completed under with-tooling-postgres.sh; only KNIP_REPORT.md changed. Registry pnpm audit --audit-level high exited 0 with 0 high/critical (32 total: 4 low, 28 moderate). OpenAPI snapshot and 8 shared schema artifacts regenerated; updated Zod date-time pattern matches runtime z.iso.datetime() (without seconds rejected, with seconds accepted).

Remote CI evidence: https://github.com/phalanxduel/phalanxduel/actions/runs/41035729412 — Test and Lint success (dependency audit success), Adversarial Security Tests success, Build and Push success; Promote: Production failed with Fly.io 403 overdue invoices. Dependabot now reports no open high-severity alerts.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated package metadata and lockfile to patched Vite, markdown-it, follow-redirects, undici, Zod, and body-parser versions, eliminating all high/critical registry audit findings. Regenerated shared JSON schemas, OpenAPI snapshot, and the affected docs artifact. Local `pnpm check` passed with 1,280 tests; `pnpm rules:check`, schema consistency, docs artifacts, and registry audit passed. GitHub run 41035729412 passed Test and Lint (including dependency audit), Adversarial Security Tests, and Build and Push. Production promotion failed with Fly.io HTTP 403 due overdue invoices; existing production remains healthy on build 445-1. 32 low/moderate advisories remain.
<!-- SECTION:FINAL_SUMMARY:END -->
