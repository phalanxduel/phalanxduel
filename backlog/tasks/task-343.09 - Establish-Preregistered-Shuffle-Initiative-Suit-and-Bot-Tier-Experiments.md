---
id: TASK-343.09
title: Establish Preregistered Shuffle Initiative Suit and Bot-Tier Experiments
status: To Do
assignee: []
created_date: '2026-07-13 14:00'
updated_date: '2026-07-13 14:00'
labels:
  - assurance
  - statistics
  - balance
dependencies:
  - TASK-343.02
  - TASK-343.03
  - TASK-343.04
  - TASK-343.07
  - TASK-343.08
documentation:
  - docs/gameplay/rules.md
  - docs/reference/test-constitution.md
  - docs/architecture/principles.md
parent_task_id: TASK-343
priority: high
ordinal: 194800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create reproducible statistical assurance for claims that cannot be formally proved, including shuffle behavior, player initiative, suit contribution, bot-tier ordering, and actual-engine ladder signal.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each experiment records hypothesis seed corpus sample size primary metric effect threshold confidence method and stopping rule
- [ ] #2 Shuffle experiments detect relevant position and cross-player correlations
- [ ] #3 Paired seat-reversal experiments quantify initiative advantage
- [ ] #4 Suit contribution is reported with interactions and uncertainty
- [ ] #5 Adjacent bot tiers meet or explicitly fail preregistered strength and style expectations
- [ ] #6 Actual engine outcomes validate ladder signal independently of synthetic Elo-generated outcomes
- [ ] #7 Artifacts record rules engine and adapter versions
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
