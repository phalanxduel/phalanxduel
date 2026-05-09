---
id: TASK-286
title: 'TASK-286 - Hardening: Semantic Business Invariant Assertions in Truth Gate'
status: Done
assignee:
  - '@gemini'
created_date: '2026-05-08 02:07'
updated_date: '2026-05-08 11:11'
labels: []
dependencies:
  - TASK-285
ordinal: 139000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend fast-check property tests to assert business invariants (e.g. Lifepoints conservation, deck count stability).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
- [x] #1 verify:property asserts semantic truths beyond deterministic hashes

## Definition of Done
- [x] #1 Code builds without errors (pnpm build)
- [x] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [x] #3 All unit and integration tests pass (pnpm test:run:all)
- [x] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [x] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [x] #6 Automated verification scripts pass (FSM consistency and event log coverage)

## Implementation Notes
Extended fast-check property tests in engine/tests/property-fastcheck.test.ts to assert semantic business invariants, including card count conservation (52 cards), HP boundary checks, and non-increasing lifepoints.
<!-- DOD:END -->
