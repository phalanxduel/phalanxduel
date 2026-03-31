---
id: TASK-138
title: Duplicate Documentation Consolidation
status: In Progress
assignee:
  - '@codex'
created_date: '2026-03-31 17:37'
updated_date: '2026-03-31 20:13'
labels: []
dependencies:
  - TASK-137
  - TASK-139
  - TASK-141
references:
  - backlog/docs/doc-2 - Documentation Consolidation Audit.md
priority: high
---

## Description

Consolidate duplicate or overlapping documentation clusters into one canonical
surface per topic.

## Rationale

Duplicate docs are the primary source of AI confusion, stale guidance, and
pre-release ambiguity.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Duplicate operational, deployment, glossary, and process-doc clusters are reduced to one canonical source per topic.
- [ ] #2 Any retained mirrors are explicitly marked as generated or secondary.
- [ ] #3 Backlinks and indexes are updated so humans and agents land on the canonical doc first.
<!-- AC:END -->

## Expected Outputs

- Consolidated docs
- Retired duplicate surfaces
- Updated links and indexes

## Implementation Plan

1. Start with the operational duplicate cluster because the canonical home is
   already clear: `docs/system/OPERATIONS_RUNBOOK.md`.
2. Merge any unique incident-response detail from
   `docs/operations/INCIDENT_RUNBOOKS.md` into the canonical runbook.
3. Convert duplicate or secondary surfaces into explicit pointer/history docs so
   humans and agents land on the canonical source first.
4. Continue with the next duplicate clusters only after the first one is
   structurally stable and verified.

## Implementation Notes

- `TASK-139` established that the runbook should be the canonical operational
  surface and that the old incident runbooks file should be reduced or retired.
- This task is intentionally starting with a narrow consolidation slice rather
  than trying to collapse the full deployment/process duplicate cluster in one
  pass.
- Merged the unique incident-recovery, rollback, migration-triage, and
  secret-exposure procedures into `docs/system/OPERATIONS_RUNBOOK.md`.
- Reduced `docs/operations/INCIDENT_RUNBOOKS.md` to a thin pointer surface so
  humans and agents now land on the canonical runbook first without losing a
  compatibility path during the broader cleanup.

## Verification

- `pnpm exec markdownlint-cli2 AGENTS.md docs/system/OPERATIONS_RUNBOOK.md docs/operations/INCIDENT_RUNBOOKS.md "backlog/tasks/task-138 - Duplicate-Documentation-Consolidation.md" "backlog/tasks/task-139 - Stale-and-Superseded-Documentation-Review.md" --config .markdownlint-cli2.jsonc`
- `rg -n "Incident Runbooks|Deployment Rollback|Database Migration Triage|Secret Exposure Response" docs/system/OPERATIONS_RUNBOOK.md docs/operations/INCIDENT_RUNBOOKS.md`

## Do Not Break

- Do not remove unique operational detail without merging it first.
- Do not break generated doc publishing surfaces accidentally.
