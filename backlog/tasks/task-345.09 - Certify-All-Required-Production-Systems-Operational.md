---
id: TASK-345.09
title: Certify All Required Production Systems Operational
status: To Do
assignee: []
created_date: 2026-07-14 00:17
updated_date: '2026-10-30T13:43:00Z'
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

## Comments

<!-- COMMENTS:BEGIN -->
author: Codex
created: 2026-10-30T13:43:00Z

---

2026-10-30 operations audit: the production support contract still records PD-PROD-006 (OTel) as FAIL and requires all 14 required subsystems to pass before whole-system certification. The required MCP endpoint `https://phalanxduel-mcp-public.fly.dev/health` could not resolve during this audit; Fly app status inspection was blocked because the Fly CLI session has expired. Production game and dedicated admin `/health` and `/ready` passed on release 445-1; production site returned 200. The pipeline for the current source passed Test and Lint, Adversarial Security Tests, and Build and Push, but production promotion failed with Fly.io 403 overdue invoices. The task's dependency tree also contains multiple unfinished prerequisites. Reopening this certification task to To Do; no certification criteria were demonstrated. See docs/ops/production-support-contract.md and TASK-345.05.

---

author: Codex
created: 2026-10-30T13:43:00Z

---

Correction to the audit note above: the support matrix currently has 11 Required rows (PD-PROD-001 through PD-PROD-010, plus PD-PROD-012), not 14. The certification gap and task status are unchanged.

---
<!-- COMMENTS:END -->
