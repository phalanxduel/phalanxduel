---
id: TASK-44.4
title: Operational Runbook Creation
status: Planned
assignee: []
created_date: '2026-03-14 04:00'
updated_date: '2026-03-15 22:19'
labels:
  - docs
  - operations
  - production-readiness
dependencies: []
references:
  - docs/system/DEFINITION_OF_DONE.md
  - docs/system/ADMIN.md
  - docs/system/FEATURE_FLAGS.md
  - scripts/release/deploy-fly.sh
parent_task_id: TASK-44
priority: high
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
No documented procedure exists for production incident response, deployment rollback, stuck match recovery, or common operational troubleshooting. Deployment scripts exist (`scripts/release/deploy-fly.sh`) but operators must read shell scripts to understand procedures. The `DEFINITION_OF_DONE` requires observability to be "accessible, not merely present," but without a runbook, operators lack a single source of truth for supporting the production system.

**Concern sources:**
- **Gordon**: Classified missing operational runbook as **CRITICAL**. Flagged deployment script as **HIGH RISK** ("Deployment script exists but runbook is missing"). Recommended `docs/system/OPERATIONS_RUNBOOK.md` covering health checks, common incidents, deployment/rollback, Sentry/OTEL integration, severity levels, and escalation.
- **Gemini CLI**: Listed "Operational Runbooks (TASK-25)" as necessary for "day 2" operations.
- **Gordon**: Also flagged missing rollback strategy as a gap — "Operators lack explicit rollback playbook."
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `docs/system/OPERATIONS_RUNBOOK.md` exists covering: health check procedures, common failure modes with diagnostic steps, deployment checklist (pre-deploy, deploy, post-deploy validation), and rollback procedure.
- [ ] #2 The runbook documents how to use existing operational scripts (`pnpm diagnostics`, `pnpm deploy:prod`, `pnpm sentry:release`, OTEL console/SigNoz scripts).
- [ ] #3 Incident severity levels and escalation paths are defined.
- [ ] #4 The runbook is linked from `README.md` and `docs/system/ADMIN.md`.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory existing operational tooling: `bin/maint/`, `scripts/release/`, health endpoints, Sentry integration, OTEL pipeline.
2. Read `deploy-fly.sh` and `deploy-fly-with-logs.sh` to extract deployment procedure.
3. Draft `docs/system/OPERATIONS_RUNBOOK.md` with sections for health checks, common incidents, deployment, rollback, Sentry/OTEL, and escalation.
4. Link runbook from `README.md` and `docs/system/ADMIN.md`.
5. Verify all documented commands are runnable against the current repo.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 **Observability (DoD §5)**: Operational runbook makes observability accessible — operators can reach relevant evidence without code archaeology.
- [ ] #2 **Verification (DoD §2)**: All commands documented in the runbook are verified runnable; `pnpm check:quick` passes.
- [ ] #3 **Accessibility (DoD §6)**: A new operator can follow the runbook to diagnose and respond to common production issues without prior tribal knowledge.
<!-- DOD:END -->
