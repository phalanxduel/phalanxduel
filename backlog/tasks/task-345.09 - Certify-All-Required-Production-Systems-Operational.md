---
id: TASK-345.09
title: Certify All Required Production Systems Operational
status: To Do
assignee: []
created_date: '2026-07-14 00:17'
updated_date: '2026-07-14 00:17'
labels:
  - production
  - release
  - verification
dependencies:
  - TASK-345.08
documentation:
  - docs/ops/runbook.md
  - docs/ops/deployment-checklist.md
parent_task_id: TASK-345
priority: high
ordinal: 208800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Run the final operational certification after all remediation slices land. Produce evidence that every required subsystem is PASS, execute rollback/reconnect and controlled external-service smoke tests, observe the release through a settling period, and synchronize the status across canonical documentation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Unified production assurance reports PASS for every required subsystem
- [ ] #2 Controlled authenticated admin and transactional email smoke tests pass
- [ ] #3 Public/private MCP boundaries pass
- [ ] #4 A correlated gameplay trace is found in LGTM
- [ ] #5 Rollback and reconnect drill passes without state loss
- [ ] #6 Post-deployment observation finds no critical alert or error spike
- [ ] #7 Canonical game, site, and wiki status pages are synchronized with the certified release
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
