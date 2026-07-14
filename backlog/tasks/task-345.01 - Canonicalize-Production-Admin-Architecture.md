---
id: TASK-345.01
title: Canonicalize Production Admin Architecture
status: To Do
assignee: []
created_date: '2026-07-14 00:17'
updated_date: '2026-07-14 00:17'
labels:
  - production
  - admin
  - security
dependencies:
  - TASK-345.04
documentation:
  - docs/reference/admin.md
  - fly.production.toml
  - server/src/adminDashboard.ts
  - admin/
parent_task_id: TASK-345
priority: high
ordinal: 200800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolve the ambiguity between the authenticated admin routes hosted by the web server and the stopped dedicated Fly admin process. Establish exactly one supported architecture, preserve least-privilege authentication and auditability, and remove or correctly service redundant process definitions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Exactly one canonical production admin architecture is documented and deployed
- [ ] #2 Anonymous and invalid authentication are rejected
- [ ] #3 A valid operator can perform a harmless authenticated read
- [ ] #4 Admin mutations remain explicitly authorized and auditable
- [ ] #5 No production fallback credentials exist
- [ ] #6 Redundant or dead admin process configuration is removed or made independently healthy with private routing
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
