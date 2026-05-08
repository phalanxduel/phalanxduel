---
id: TASK-288
title: 'TASK-288 - Operational: Operational Fairness Dashboard and Drift Alerting'
status: To Do
assignee: []
created_date: '2026-05-08 02:07'
updated_date: '2026-05-08 02:08'
labels: []
dependencies:
  - TASK-286
ordinal: 141000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Establish a unified Grafana dashboard to visualize State Hash Drift and Action Rejection rates from OTel traces.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Dashboard is provisioned and reflects live match health
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
