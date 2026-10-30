---
id: TASK-138
title: Duplicate Documentation Consolidation
status: Done
assignee:
  - '@codex'
created_date: '2026-03-31 17:37'
updated_date: '2026-03-31 19:25'
labels: []
dependencies:
  - TASK-137
  - TASK-139
  - TASK-141
references:
  - docs/archive/doc-2 - Documentation Consolidation Audit.md
priority: high
ordinal: 54000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Consolidate duplicate or overlapping documentation clusters into one canonical
surface per topic.

## Rationale

Duplicate docs are the primary source of AI confusion, stale guidance, and
pre-release ambiguity.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Duplicate operational, deployment, glossary, and process-doc clusters are reduced to one canonical source per topic.
- [x] #2 Any retained mirrors are explicitly marked as generated or secondary.
- [x] #3 Backlinks and indexes are updated so humans and agents land on the canonical doc first.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Start with the operational duplicate cluster because the canonical home is
   already clear: `docs/ops/runbook.md`.
2. Merge any unique incident-response detail from
   `docs/operations/INCIDENT_RUNBOOKS.md` into the canonical runbook.
3. Convert duplicate or secondary surfaces into explicit pointer/history docs so
   humans and agents land on the canonical source first.
4. Continue with the next duplicate clusters only after the first one is
   structurally stable and verified.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- `TASK-139` established that the runbook should be the canonical operational
  surface and that the old incident runbooks file should be reduced or retired.
- This task is intentionally starting with a narrow consolidation slice rather
  than trying to collapse the full deployment/process duplicate cluster in one
  pass.
- Merged the unique incident-recovery, rollback, migration-triage, and
  secret-exposure procedures into `docs/ops/runbook.md`.
- Reduced `docs/operations/INCIDENT_RUNBOOKS.md` to a thin pointer surface so
  humans and agents now land on the canonical runbook first without losing a
  compatibility path during the broader cleanup.
- Reduced `docs/archive/doc-1 - Phalanx Duel Glossary.md` to a thin pointer to
  `docs/reference/glossary.md`, leaving one canonical glossary surface while
  preserving older backlog links during the cleanup tranche.
- Moved the active prompt content from `docs/review/HARDENING.md` and
  `docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md` into
  `docs/archive/doc-4 - Repository Hardening Audit Prompt.md` and
  `docs/archive/doc-5 - Production Path Review Guideline.md`.
- Reduced the old `docs/review/` prompt paths to compatibility pointers so the
  active process docs now live in the Backlog-managed surface instead of the
  reference-doc tree.
- Consolidated the deployment duplicate cluster around three distinct canonical
  surfaces:
  `docs/ops/deployment-checklist.md` for operator deployment steps,
  `docs/ops/ci-cd.md` for automation truth, and
  `docs/ops/runbook.md` for rollback/incident response.
- Reduced the older staging/Fly deployment notes to compatibility pointers so
  they no longer compete as normative deployment docs.
- Corrected `docs/ops/ci-cd.md` to match the actual workflow:
  Fly.io deploys currently happen from source via `flyctl --remote-only`, not
  via strict immutable GHCR artifact promotion.

## Verification

- `pnpm exec markdownlint-cli2 AGENTS.md docs/ops/runbook.md docs/operations/INCIDENT_RUNBOOKS.md "backlog/tasks/task-138 - Duplicate-Documentation-Consolidation.md" "backlog/tasks/task-139 - Stale-and-Superseded-Documentation-Review.md" --config .markdownlint-cli2.jsonc`
- `rg -n "Incident Runbooks|Deployment Rollback|Database Migration Triage|Secret Exposure Response" docs/ops/runbook.md docs/operations/INCIDENT_RUNBOOKS.md`
- `pnpm exec markdownlint-cli2 "docs/archive/doc-1 - Phalanx Duel Glossary.md" "docs/archive/doc-2 - Documentation Consolidation Audit.md" "docs/archive/doc-3 - Canonical Documentation Map.md" "docs/archive/doc-4 - Repository Hardening Audit Prompt.md" "docs/archive/doc-5 - Production Path Review Guideline.md" docs/review/HARDENING.md docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md "backlog/tasks/task-138 - Duplicate-Documentation-Consolidation.md" --config .markdownlint-cli2.jsonc`
- `rg -n "Repository Hardening Audit Prompt|Production Path Review Guideline|compatibility pointer|canonical active" backlog/docs docs/review`
- `pnpm exec markdownlint-cli2 docs/ops/ci-cd.md docs/operations/STABILITY_DEPLOYMENT_GUIDE.md docs/ops/deployment-checklist.md docs/deployment/STAGING_SETUP_GUIDE.md docs/deployment/STAGING_DEPLOYMENT.md docs/deployment/FLYIO_PRODUCTION_GUIDE.md docs/deployment/FLYIO_CONFIG_FIX.md docs/ops/runbook.md "docs/archive/doc-2 - Documentation Consolidation Audit.md" "docs/archive/doc-3 - Canonical Documentation Map.md" "backlog/tasks/task-138 - Duplicate-Documentation-Consolidation.md" --config .markdownlint-cli2.jsonc`
- `rg -n "remote-only|deploy:run:staging|deploy:run:production|compatibility pointer|canonical" docs/operations docs/deployment docs/system package.json .github/workflows/pipeline.yml fly.staging.toml fly.production.toml`

## Do Not Break

- Do not remove unique operational detail without merging it first.
- Do not break generated doc publishing surfaces accidentally.
<!-- SECTION:NOTES:END -->

## Expected Outputs

- Consolidated docs
- Retired duplicate surfaces
- Updated links and indexes
