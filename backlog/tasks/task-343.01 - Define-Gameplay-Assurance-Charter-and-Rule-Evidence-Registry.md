---
id: TASK-343.01
title: Define Gameplay Assurance Charter and Rule Evidence Registry
status: Verification
assignee:
  - codex
created_date: '2026-07-13 14:00'
updated_date: '2026-07-13 14:30'
labels:
  - gameplay
  - assurance
  - documentation
dependencies: []
documentation:
  - docs/gameplay/rules.md
  - docs/reference/test-constitution.md
  - docs/architecture/principles.md
modified_files:
  - docs/reference/gameplay-assurance.md
  - docs/gameplay/rule-evidence.json
  - docs/quality/gameplay-rule-evidence.md
  - scripts/ci/verify-rule-evidence.ts
  - docs/README.md
  - docs/quality/README.md
  - docs/reference/pnpm-scripts.md
  - package.json
  - pnpm-lock.yaml
  - client/vitest.config.ts
  - client/tests/setup.ts
  - client/tests/pizzazz.test.ts
parent_task_id: TASK-343
priority: high
ordinal: 186800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Define the scope, proof vocabulary, stable rule identifiers, evidence hierarchy, gap lifecycle, and generated traceability expectations for scientific gameplay assurance. Preserve the explicit authority model: gameplay rules are normative, shared schemas are contract authority, and the engine state machine is runtime transition authority.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The assurance scope distinguishes formal proof exhaustive evidence generated-property evidence statistical evidence and operational evidence
- [x] #2 Every normative gameplay rule has a stable identifier and a formalizable predicate equation transition or explicit non-formal classification
- [x] #3 The gap lifecycle defines severity evidence disposition compatibility impact and closure evidence
- [x] #4 Current rule traceability can be generated without relying on stale archived status declarations
- [x] #5 Documentation states which claims are and are not proved
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Create the versioned gameplay assurance charter using the repository authority model and Test Constitution. Define the evidence hierarchy, assurance claim taxonomy, stable rule-ID scheme, gap lifecycle, and completion semantics. Inventory every normative rule in docs/gameplay/rules.md into a current machine-readable registry with formalizable classification and source references. Add deterministic validation/generation that detects missing duplicate or stale rule evidence without using archived status as authority. Document what is proved, exhaustively checked, property-tested, statistically assessed, operationally observed, or intentionally outside scope. Verify documentation, registry validation, and existing rules checks before handoff.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented a versioned gameplay assurance charter and machine-readable registry covering all 54 normative rule claims. Generated evidence summary: 40 aligned, 10 partial, 3 divergent, 1 unverified. Registry validation is now part of `pnpm rules:check` and rejects missing, duplicate, stale, or invalid evidence records.

Verification surfaced and resolved two independent harness defects: the broad `undici >=7.28.0` override selected incompatible major 8 for jsdom, and jsdom lacked a shared `matchMedia` test stub. Pinned undici 7.28.0 and centralized the browser API stub.

Verification passed: `pnpm rules:check`; `pnpm schema:check`; `pnpm check` (build, lint, DB isolation, typecheck, docs artifacts, markdown, formatting, and all workspace tests). Full test counts include shared 145, engine 353, server 381, client 209, admin 7, MCP 5.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
