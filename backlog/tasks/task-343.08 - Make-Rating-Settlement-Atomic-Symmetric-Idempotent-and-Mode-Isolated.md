---
id: TASK-343.08
title: Make Rating Settlement Atomic Symmetric Idempotent and Mode-Isolated
status: To Do
assignee: []
created_date: '2026-07-13 14:00'
updated_date: '2026-07-13 14:00'
labels:
  - ratings
  - fairness
  - server
dependencies:
  - TASK-343.01
documentation:
  - docs/gameplay/rules.md
  - docs/reference/test-constitution.md
  - docs/architecture/principles.md
parent_task_id: TASK-343
priority: high
ordinal: 193800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Correct rating settlement so both participant outcomes are computed from one immutable pre-match snapshot and committed once without order dependence or cross-mode contamination. Official ratings remain human competitive PvP only, with honest naming for supported rating models.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Both player deltas are computed from the same pre-match rating snapshot
- [ ] #2 Settlement result is independent of participant processing order
- [ ] #3 Duplicate completion cannot apply rating changes twice
- [ ] #4 PvP bot and other rating modes do not contaminate one another
- [ ] #5 Equal-rating decisive Elo settlement is symmetric under the documented policy
- [ ] #6 Unsupported Glicko terminology is removed or backed by a complete documented implementation
- [ ] #7 Database and property tests cover failure rollback and idempotency
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
