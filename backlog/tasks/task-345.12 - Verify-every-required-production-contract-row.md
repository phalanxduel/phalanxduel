---
id: TASK-345.12
title: Verify every required production contract row
status: Done
assignee:
  - '@codex'
created_date: '2026-10-30T21:16:00Z'
updated_date: '2026-10-30T21:36:00Z'
labels: []
dependencies: []
documentation:
  - docs/ops/production-support-contract.md
  - scripts/ci/verify-production-contract.ts
parent_task_id: TASK-345
priority: high
type: chore
ordinal: 271800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The production support contract classifies the immutable release, rollback, and recovery path as required, but the executable verifier currently validates only PD-PROD-001 through PD-PROD-010. A clean verifier run can therefore miss a required production subsystem, weakening release assurance.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The production contract verifier validates all 11 Required rows, including PD-PROD-012.
- [x] #2 A regression check fails if a required row is omitted from verifier coverage.
- [x] #3 The focused production contract verification passes.
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
1. Inspect the verifier's row inventory and its direct assertions against the canonical production support matrix.
2. Derive the expected Required IDs from the stated contract or encode the complete reviewed set, including PD-PROD-012; ensure the test fails when any required row is omitted from verification.
3. Run the focused production contract verifier and the repository quick verification.
4. Record exact results and leave production deployment/health claims unchanged.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Context Hunter L1 micro-brief: the nearest pattern is the explicit OPTIONAL_IDS/RETIRED_IDS inventory and classification loop in scripts/ci/verify-production-contract.ts; no independent parser test exists. The contract's Required rows are 001-010 and 012. Main risk was another silent count/list omission, so the verifier now compares its explicit expected IDs with IDs parsed from Required matrix rows.

Local validation: pnpm verify:production-contract passes and reports 11 required subsystems; pnpm exec prettier --check scripts/ci/verify-production-contract.ts passes; pnpm verify:quick passes build, lint/actionlint, DB isolation, typecheck, docs validation, Markdown lint, and formatting. git diff --check passes. Awaiting remote CI for this commit.

Hosted pipeline 41130866249: Test and Lint, Adversarial Security Tests, and Build and Push passed; SDK publication skipped. Promote: Production failed at the known Fly billing gate. No production release was created.

Additional validation passed: schema:gen produced 8 schemas/81 types and schema:check reported up to date; docs:artifacts completed through with-tooling-postgres.sh without changing tracked files; rules:check passed FSM/event/rule checks and all 2,355,388 combat reference cases.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-10-30T21:19:00Z

---

The production-contract verifier now explicitly covers PD-PROD-012 and asserts its required-ID inventory exactly matches Required rows parsed from docs/ops/production-support-contract.md. Local focused and quick checks pass. No production config changed; production OTel/MCP remain blocked on Fly/account operations.

---

created: 2026-10-30T21:36:00Z

---

Final verification: hosted run 41130866249 passed Test and Lint, Adversarial Security Tests, and Build and Push. Production promotion alone failed at Fly. Local production-contract verifier covers all 11 Required rows and the repository quick, schema, documentation artifact, and rules checks pass.

---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the production-contract verifier to cover all 11 required rows, including PD-PROD-012, and compare the expected inventory against Required rows parsed from the canonical contract. Focused verification, quick checks, schema/doc/rules validation, and hosted Test and Lint, Adversarial Security, and Build and Push passed. Production promotion remains blocked by the known Fly billing 403; no production configuration changed.
<!-- SECTION:FINAL_SUMMARY:END -->
