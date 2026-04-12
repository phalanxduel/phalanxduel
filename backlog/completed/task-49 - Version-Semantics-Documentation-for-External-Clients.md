---
id: TASK-49
title: Version Semantics Documentation for External Clients
status: Done
assignee:
  - '@codex'
created_date: '2026-03-17'
updated_date: '2026-04-02 23:58'
labels:
  - docs
  - api
milestone: m-1
dependencies:
  - TASK-48
  - TASK-161
priority: high
ordinal: 88000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
External clients need clear guidance on which version identifier to use
for compatibility checks. `docs/gameplay/rule-amendments.md` RA-002 provides the
basic clarification but a dedicated versioning guide would help.

## Planned Change

1. Add a `docs/VERSIONING.md` explaining the version scheme
2. Add version fields to the `/api/defaults` response metadata
3. Document the compatibility matrix (which `specVersion` works with which
   `SCHEMA_VERSION` ranges)

## Verification

- `docs/VERSIONING.md` exists with clear guidance
- `/api/defaults` response includes version metadata
- `docs/gameplay/rule-amendments.md` RA-002 links to the new doc
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Task objectives are met as described in the mission.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend docs/architecture/versioning.md with an external-client consumption section that tells clients when to use SCHEMA_VERSION versus specVersion, and update docs/gameplay/rule-amendments.md RA-002 to point at that canonical guide.
2. Add additive version metadata to GET /api/defaults inside the existing _meta block in server/src/app.ts so external consumers can discover wire-format and rules-version information without changing the endpoint’s top-level contract.
3. Update automated server coverage for /api/defaults and regenerate the OpenAPI snapshot so the new metadata is part of the published contract.
4. Refresh the web UI and Go reference-client surfaces that consume /api/defaults so they stay aligned with the updated discovery payload and version semantics documentation.
5. Run targeted verification on the touched server tests plus the affected client/SDK surfaces before updating TASK-49 notes and status.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-04-02: Started discovery for external-client version semantics. Confirmed docs/architecture/versioning.md is now the canonical versioning guide, and GET /api/defaults already exposes a _meta block that can carry wire-format and rules-version metadata with minimal surface churn.

2026-04-02: Implemented external-client version semantics across the canonical docs, GET /api/defaults, and the first-party browser/Go defaults consumers. Added _meta.versions metadata to the defaults endpoint, updated the lobby UIs to surface server wire/rules versions, and updated the Go duel CLI to print the discovered schema/rules versions from the generated SDK response.

2026-04-02 verification: rtk pnpm --filter @phalanxduel/server exec vitest run tests/defaults-endpoint.test.ts tests/openapi.test.ts -u; rtk pnpm sdk:gen; rtk pnpm go:clients:check; rtk pnpm --filter @phalanxduel/client build; rtk bin/check.

2026-04-02 verification note: bin/check completed build, lint, typecheck, tests, Go client validation, schema generation, and docs artifact generation, then stopped at the docs-artifact cleanliness gate because docs/system/KNIP_REPORT.md was regenerated against existing line-number drift in already-modified server files. No task-local compile/test failures remained in the touched endpoint, docs, browser UI, or Go client surfaces.

2026-04-02 verification update: Reconciled the generated docs drift by staging the regenerated docs/system/KNIP_REPORT.md artifact and reran rtk bin/check successfully end-to-end. The unified check now passes across build, lint, typecheck, tests, Go client validation, schema generation, docs artifact verification, FSM consistency, event-log coverage, and markdown lint.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Published canonical external-client version semantics, added machine-readable schema/rules version metadata to GET /api/defaults, regenerated the OpenAPI and SDK artifacts, and updated both the browser lobby UIs and the Go duel CLI to surface the discovered server wire/rules versions. Final verification passed with rtk bin/check after reconciling the regenerated KNIP report drift.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 **Spec Alignment (DoD §1)**: Implementation matches canonical rules and architectural constraints.
- [x] #2 **Verification (DoD §2)**: All changes are covered by automated tests and manual verification evidence is recorded.
- [x] #3 **Trust and Safety (DoD §3)**: The server remains authoritative; no secrets or hidden info leaked.
- [x] #4 **Code Quality (DoD §4)**: Code follows project conventions, modularity, and naming standards.
- [x] #5 **Observability (DoD §5)**: Critical paths emit necessary logs and telemetry for operations.
- [x] #6 **Accessibility (DoD §6)**: Changes are documented and understandable for contributors and users.
- [x] #7 **AI-Assisted Work (DoD §7)**: AI changes are reviewed by a human and follow AGENTS.md.
- [x] #8 Code builds without errors (pnpm build)
- [x] #9 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #10 All unit and integration tests pass (pnpm test:run:all)
- [x] #11 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #12 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #13 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
