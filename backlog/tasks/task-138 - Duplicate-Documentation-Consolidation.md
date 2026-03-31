---
id: TASK-138
title: Duplicate Documentation Consolidation
status: Human Review
assignee:
  - '@codex'
created_date: '2026-03-31 17:37'
updated_date: '2026-03-31 21:05'
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
- [x] #1 Duplicate operational, deployment, glossary, and process-doc clusters are reduced to one canonical source per topic.
- [x] #2 Any retained mirrors are explicitly marked as generated or secondary.
- [x] #3 Backlinks and indexes are updated so humans and agents land on the canonical doc first.
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
- Reduced `backlog/docs/doc-1 - Phalanx Duel Glossary.md` to a thin pointer to
  `docs/system/GLOSSARY.md`, leaving one canonical glossary surface while
  preserving older backlog links during the cleanup tranche.
- Moved the active prompt content from `docs/review/HARDENING.md` and
  `docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md` into
  `backlog/docs/doc-4 - Repository Hardening Audit Prompt.md` and
  `backlog/docs/doc-5 - Production Path Review Guideline.md`.
- Reduced the old `docs/review/` prompt paths to compatibility pointers so the
  active process docs now live in the Backlog-managed surface instead of the
  reference-doc tree.
- Consolidated the deployment duplicate cluster around three distinct canonical
  surfaces:
  `docs/deployment/DEPLOYMENT_CHECKLIST.md` for operator deployment steps,
  `docs/operations/CI_CD_PIPELINE.md` for automation truth, and
  `docs/system/OPERATIONS_RUNBOOK.md` for rollback/incident response.
- Reduced the older staging/Fly deployment notes to compatibility pointers so
  they no longer compete as normative deployment docs.
- Corrected `docs/operations/CI_CD_PIPELINE.md` to match the actual workflow:
  Fly.io deploys currently happen from source via `flyctl --remote-only`, not
  via strict immutable GHCR artifact promotion.

## Verification

- `pnpm exec markdownlint-cli2 AGENTS.md docs/system/OPERATIONS_RUNBOOK.md docs/operations/INCIDENT_RUNBOOKS.md "backlog/tasks/task-138 - Duplicate-Documentation-Consolidation.md" "backlog/tasks/task-139 - Stale-and-Superseded-Documentation-Review.md" --config .markdownlint-cli2.jsonc`
- `rg -n "Incident Runbooks|Deployment Rollback|Database Migration Triage|Secret Exposure Response" docs/system/OPERATIONS_RUNBOOK.md docs/operations/INCIDENT_RUNBOOKS.md`
- `pnpm exec markdownlint-cli2 "backlog/docs/doc-1 - Phalanx Duel Glossary.md" "backlog/docs/doc-2 - Documentation Consolidation Audit.md" "backlog/docs/doc-3 - Canonical Documentation Map.md" "backlog/docs/doc-4 - Repository Hardening Audit Prompt.md" "backlog/docs/doc-5 - Production Path Review Guideline.md" docs/review/HARDENING.md docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md "backlog/tasks/task-138 - Duplicate-Documentation-Consolidation.md" --config .markdownlint-cli2.jsonc`
- `rg -n "Repository Hardening Audit Prompt|Production Path Review Guideline|compatibility pointer|canonical active" backlog/docs docs/review`
- `pnpm exec markdownlint-cli2 docs/operations/CI_CD_PIPELINE.md docs/operations/STABILITY_DEPLOYMENT_GUIDE.md docs/deployment/DEPLOYMENT_CHECKLIST.md docs/deployment/STAGING_SETUP_GUIDE.md docs/deployment/STAGING_DEPLOYMENT.md docs/deployment/FLYIO_PRODUCTION_GUIDE.md docs/deployment/FLYIO_CONFIG_FIX.md docs/system/OPERATIONS_RUNBOOK.md "backlog/docs/doc-2 - Documentation Consolidation Audit.md" "backlog/docs/doc-3 - Canonical Documentation Map.md" "backlog/tasks/task-138 - Duplicate-Documentation-Consolidation.md" --config .markdownlint-cli2.jsonc`
- `rg -n "remote-only|deploy:run:staging|deploy:run:production|compatibility pointer|canonical" docs/operations docs/deployment docs/system package.json .github/workflows/pipeline.yml fly.staging.toml fly.production.toml`

## Do Not Break

- Do not remove unique operational detail without merging it first.
- Do not break generated doc publishing surfaces accidentally.
