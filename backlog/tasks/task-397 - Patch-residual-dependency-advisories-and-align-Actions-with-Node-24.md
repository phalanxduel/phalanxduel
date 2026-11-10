---
id: TASK-397
title: Patch residual dependency advisories and align Actions with Node 24
status: Done
assignee:
  - '@codex'
created_date: '2026-10-30T20:04:00Z'
updated_date: '2026-11-10T15:25:00Z'
labels: []
dependencies: []
references:
  - https://github.com/actions/checkout/releases
  - https://github.com/docker/login-action/releases
documentation:
  - docs/agents/backlog-best-practices.md
  - .github/workflows/pipeline.yml
  - package.json
  - docs/system/delivery-pipeline.md
  - docs/system/AI_COLLABORATION.md
priority: high
type: chore
ordinal: 270800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Clear currently reported low and moderate npm advisories using compatible patched versions where possible, and update old GitHub Actions runtime pins that trigger Node 20 deprecation warnings. Keep changes behavior-compatible; document and leave unresolved any package requiring a breaking or otherwise unsafe upgrade.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `pnpm audit --audit-level low` reports no untriaged advisories, with any blocked advisory documented and explicitly scoped.
- [x] #2 GitHub workflow action pins implicated in Node 20 runtime warnings are updated to verified Node 24-compatible releases without changing workflow inputs or deployment behavior.
- [x] #3 Lockfile is consistent with package manifests and overrides.
- [x] #4 Focused validation and the repository quick verification pass; CI results are recorded.
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
1. Read current advisory package versions, dependency paths, and fixed-version metadata from the npm audit report.
2. Apply compatible patch updates and raise existing override floors to patched versions; do not force major dependency or API changes.
3. Update workflow action pins to Node 24-compatible releases while preserving existing inputs.
4. Run audit, lockfile, action pinning, and repository quick verification. Leave any advisory requiring an unsafe/breaking jump documented and incomplete.

5. Review pre-existing audit suppressions; remove any suppression whose advisory was withdrawn or whose risk is no longer present, so the zero-advisory result is not achieved by hiding a finding.

User requested catching the system up after pushing local service fixes. Continue dependency/Actions remediation using GitHub connector logs and current CI. Diagnose PR #130 and independent Gemini failures, validate compatible Actions changes, coordinate Playwright versions, and reconcile landed task status. Shell network failures are execution-context limitations and do not justify declaring the host unhealthy.

Current evidence changes the diagnosis: dedicated GitHub job-log tools are available. PR #130 fails because OpenTelemetry sdk-node 0.300 removes metricReader; upstream migration guide also confirms API 1.10 is incompatible with retained SDK 2.x packages, so renaming one field would mask a mixed-generation upgrade. Preserve the supported SDK 2.x telemetry family while updating compatible dependencies. Separate telemetry in Dependabot and block SDK-3 generation experimental/API versions pending an explicit migration. Resolve Gemini's confirmed missing-auth failure by guarding execution when no supported auth method is configured. Refresh Actions using verified SHA pins; use CI to validate candidates when execution-context networking prevents local installation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Context Hunter micro-brief: nearest patterns are the root package.json `pnpm.overrides` block (minimum patched floors) and full SHA-pinned action references with adjacent version comments in `.github/workflows/`. Use these patterns and regenerate the lockfile with pnpm. Main risk: advisory fixes may require a newer minor/major in a 0.x package; inspect the full dependency path and validate rather than forcing ranges blindly. Workflow action version changes preserve existing `with:` inputs; verify against CI.

At task start, `auditConfig` suppressed GHSA-vfj7-8cjw-p6xm / CVE-2026-93687 for braces. GitHub's advisory database withdrew it on 2026-10-23 as not practically exploitable, with no patched version. The suppression was removed and the full audit then returned no known vulnerabilities.

After the first push, GitHub Dependabot's dependency snapshot identified one additional stale path missed by the npm audit endpoint: brace-expansion 5.0.9 (<5.0.12) through minimatch. Raised the override floor to >=5.0.12 and refreshed/installed the lockfile; `pnpm why brace-expansion` confirms 5.0.12 and a fresh `pnpm audit --audit-level low` remains clean. Final commit and CI verification for this last patch are pending.

After the brace-expansion patch, `pnpm verify:quick` passed build, lint/actionlint, database isolation, typecheck, docs verification, and formatting. The first pushed revision's remote adversarial job passed; its pipeline Test and Lint job was still queued when the final brace-expansion fix was prepared. A fresh pipeline run for the final commit will provide authoritative remote verification.

Final pushed revision `887912bc` CI: Dependency Audit and GHA Pinning Audit passed; Test and Lint passed in 6m39s; Adversarial Security Tests passed; GHCR Build and Push passed. Production promotion alone failed at Fly release creation due the account overdue-invoice 403, so no Fly release was created. The current GitHub dependency graph SBOM reports brace-expansion 5.0.12 (the first patched version) and `pnpm audit --audit-level low` reports no known vulnerabilities. Dependabot alert #249 remains open with its 2026-10-18 update timestamp despite the graph reporting the patched version; treating it as stale metadata, not dismissing it manually. Game and admin readiness rechecked after CI and both returned ready/database OK. Task is ready for review.

2026-11-09 agenda review: GitHub connector confirmed main package.json already pins Vitest 4.1.12. Closed obsolete PR #105 proposing 4.1.11 (conflicting/downgrade). Remaining open PRs: Actions #96–100, Docker #128 (collector), #129 (Playwright), and npm group #130. Shell DNS fails for api.github.com and registry.npmjs.org (curl exit 6; pnpm audit ENOTFOUND), so current advisory status and new package installs cannot be verified. Do not infer a clean current security scan from the historical audit. #129 must be coordinated with npm Playwright versions, and large #130 needs install/build/test validation before merging. No advisory was dismissed and no unverified dependency update merged.

Remote CI inspection: PR #130 Pipeline run https://github.com/phalanxduel/phalanxduel/actions/runs/42616901893 installed locked dependencies successfully, then failed Sanity Checks / Run lightweight verification (job 129158899307). The connector cannot fetch actions job logs (URL rejected as unsupported), so the failure's underlying code cause remains unconfirmed. PR #128 Pipeline run 42614341466 and PR #129 run 42614361781 succeeded, but this lightweight gate does not validate collector image/runtime or Playwright browser compatibility. Older Actions PRs #96–100 have failed historical runs and need current-base validation. Gemini review additionally fails independently on PR #130 (run 42616901838, Run Gemini pull request review); no credential changes attempted.

Confirmed PR #130 build failure from dedicated job logs: admin/src/server/instrument.ts:89 metricReader removed by sdk-node 0.300. Upstream SDK 3 migration guide also explicitly says SDK 2 cannot be combined with API 1.10. Prepared compatible manifests by retaining every directly declared @opentelemetry dependency from main, merging existing lock snapshots, then successfully regenerating/validating the lockfile offline with pnpm install --lockfile-only --offline --ignore-scripts. Published candidate f5f495ac to the existing Dependabot PR #130 branch with an expected-head lease; this is review/CI work, not a main merge. CI will install and verify the actual updated packages. Dedicated log tools supersede earlier claim that logs were unavailable.

Fresh candidate audit run 42756166723 found GHSA-gg6h-894w-4m9c (re2js <2.8.7), GHSA-3g3m-2fjr-6pw4 (glob <=14.0.1), and GHSA-g3hv-75wg-m249 (minimatch <11.0.1). All three have reachable tooling dependency paths; do not dismiss them as merely stale snapshots. Candidate now uses re2js 2.8.7, glob 14.0.4, and minimatch 11.0.5 with explicit override floors. Lock graph traversal prunes unreachable snapshots; pnpm offline lockfile consistency passes. Retained OTel family is additionally bounded by API <1.10, core <3, and propagator-jaeger <3 overrides. Pending remote install, fresh audit, and tests before AC #1 can be rechecked. Exact collector-image config validation and Gemini auth regression checks already passed remotely.

Verification on merged candidate: Pipeline run 42825745928 passed sanity and isolated server tests (400 passed; OpenAPI snapshot passed after normalizing unordered JSON Schema type arrays). Pipeline run 42826429786 and Code Quality run 42826428062 passed on main at 134e3b0. Audit reported no known vulnerabilities; the later 6-update group was closed after its server gate reproduced the @fastify/swagger 9.9.3 schema mismatch.

2026-11-10 fresh Dependabot follow-up: OpenTelemetry group PR #138 failed in Pipeline because @opentelemetry/api 1.9.1 does not export `logs` while the group upgrades instrumentation/exporter packages to 0.223. Closed it and deferred OTel 0.217+ and SDK 2.8+ until the API/SDK line is coordinated. TypeScript 7 PR #141 also failed CI; coverage-v8 5 is deferred until it can move with the matching Vitest major. Dependabot config now records these boundaries.

2026-11-10 audit correction: the generic Definition of Done items for full unit/integration suite, schema regeneration/verification, and FSM/event-log verification had been checked, but recorded evidence only proves `pnpm verify:quick`, the isolated server suite (400 tests plus OpenAPI snapshot), audit, and relevant CI. Unchecked those three items and returned the task to Verification so the record matches evidence. Follow-up: run the full test suite, schema generation/verification, and FSM/event-log checks before restoring Done. Accountability: Mike (human maintainer) is Accountable for acceptance and release/security decisions; Codex is Responsible for implementation and evidence; consult CI/security or release maintainers when changing coordinated dependency lines; inform through this task and canonical delivery-pipeline/dependency docs.

2026-11-10 verification closure: local `pnpm check` passed its complete quick gate, then stopped at server tests because `with-test-postgres.sh` found no test Postgres on localhost:5432. Completed all remaining non-server suites separately: shared 163, engine 422, client 267, admin 15, MCP 8 tests passed (875 total). The isolated server CI run 42825745928 passed 400 tests and the OpenAPI snapshot. Ran `pnpm schema:gen` and `pnpm schema:check` successfully (8 schemas/81 types, artifacts current); `pnpm rules:check` passed FSM consistency, event-log coverage (7 action types), rule evidence (71 rules), and combat-reference verification (2,355,388 cases). Combined evidence covers the full package test set and the outstanding DoD items; the monolithic local `pnpm check` remains unable to complete solely because local test Postgres is unavailable.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Codex
created: 2026-10-30T20:33:00Z

---

Verification note: CI checks for dependency audit and action SHA pinning passed on `887912bc`; no package audit findings remain and the dependency graph reports patched brace-expansion 5.0.12. Dependabot alert #249 remains open against stale metadata and was not manually dismissed. The unrelated production promotion step failed due Fly billing; no release was created.

---

created: 2026-11-10T15:22:00Z

---

Audit found the project-wide `docs/agents/raci.md` is specifically scoped to local-system observability/PVL, so it does not own dependency-maintenance work. Initiative accountability is now explicit here, consistent with `docs/system/AI_COLLABORATION.md`: human maintainer accountable, agent responsible, with cross-functional consultation when a dependency line or release gate requires it.

---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Merged the compatible npm catch-up, zero-finding audit, Node 24 action pin refresh, collector validation, and authenticated Gemini skip guard. Dependabot PR #130 merged to main at 134e3b0; follow-up collector and setup-node updates also merged. Kept @fastify/swagger below 9.8.2 because 9.8.2+ changes the generated nullable schema and fails the OpenAPI contract; Dependabot now defers that version line until an explicit contract/SDK review.
<!-- SECTION:FINAL_SUMMARY:END -->
