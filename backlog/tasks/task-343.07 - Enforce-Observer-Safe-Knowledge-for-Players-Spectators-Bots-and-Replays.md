---
id: TASK-343.07
title: Enforce Observer-Safe Knowledge for Players Spectators Bots and Replays
status: To Do
assignee: []
created_date: '2026-07-13 14:00'
updated_date: '2026-07-13 14:00'
labels:
  - gameplay
  - security
  - bots
dependencies:
  - TASK-343.01
  - TASK-343.02
  - TASK-343.05
documentation:
  - docs/gameplay/rules.md
  - docs/reference/test-constitution.md
  - docs/architecture/principles.md
parent_task_id: TASK-343
priority: high
ordinal: 192800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Unify observer-relative projection so players, spectators, bots, narration, previews, and replay viewers receive only authorized knowledge. Competitive bots use information-set-safe inputs; omniscient adapters remain explicitly internal and unranked.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Equivalent states differing only in hidden information produce identical observer projections
- [ ] #2 Competitive bot decisions cannot directly inspect unauthorized hands or draw piles
- [ ] #3 Narration and calculation traces do not leak hidden card identity
- [ ] #4 Spectator and replay visibility follow documented lifecycle rules
- [ ] #5 Omniscient research adapters are explicit isolated and excluded from competitive ratings
- [ ] #6 Negative noninterference tests cover every observer role
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
