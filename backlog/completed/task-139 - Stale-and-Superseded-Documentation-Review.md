---
id: TASK-139
title: Stale and Superseded Documentation Review
status: Done
assignee:
  - '@codex'
created_date: '2026-03-31 17:37'
updated_date: '2026-03-31 19:25'
labels: []
dependencies:
  - TASK-136
  - TASK-137
references:
  - backlog/docs/doc-2 - Documentation Consolidation Audit.md
priority: high
ordinal: 55000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Review stale, superseded, and ambiguous documentation and determine whether
each item should be archived, merged, rewritten, or explicitly retained.

## Rationale

This is the human-safety buffer between “looks old” and “safe to remove.”
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every `STALE_REVIEW`, `SUPERSEDED_BY_CODE`, and `SUPERSEDED_BY_DOC` candidate receives a documented disposition.
- [x] #2 Ambiguous cases prefer quarantine/archive over silent deletion.
- [x] #3 Any docs still needed for current behavior are either refreshed or reclassified as canonical.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Start from the stale, superseded, and dead-candidate clusters already listed
   in the audit.
2. Review each ambiguous family against current repo behavior and the canonical
   documentation map.
3. Separate likely archive candidates from merge candidates and from items that
   still need to remain active.
4. Update the audit and record exact recommended dispositions for the later
   archival/deletion and duplicate-consolidation tasks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- This task follows the inventory and canonical-map gates. It should reduce
  ambiguity for `TASK-138` and `TASK-140`, not create it.
- The highest-signal families to review first are `docs/plans/`,
  `docs/superpowers/`, `docs/review/`, `docs/research/`, duplicated glossary
  surfaces, and overlapping deployment/runbook docs.
- First-pass dispositions:
  `docs/plans/*.md` reads like active-looking planning material that should be
  moved under Backlog-managed plan surfaces if still useful, otherwise archived.
  `docs/superpowers/plans/*.md` and `docs/superpowers/specs/*.md` read like
  completed implementation guidance and should not remain in the active docs
  tree.
- `docs/review/HARDENING.md` and
  `docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md` are process prompts rather
  than user/reference docs; if they remain active, they belong in
  `backlog/docs/`, not `docs/review/`.
- `docs/research/DHI_*` is clearly historical research/evaluation material and
  should be retained only as archived context.
- The deployment cluster (`docs/deployment/*.md` plus
  `docs/operations/STABILITY_DEPLOYMENT_GUIDE.md`) is heavily point-in-time and
  overlaps the canonical operations runbook; it should be consolidated before
  any deletion.
- Second-pass concrete dispositions:
  `docs/plans/api-completeness-dag.md` should move into Backlog-managed
  completed planning history because its scope is now owned by shipped and
  active `TASK-113` through `TASK-121`, not by an active `docs/` reference
  surface.
  `docs/plans/2026-03-21-stability-playability-dag.md` should be archived as
  historical planning context because it references branch/worktree recovery
  state that should not compete with current workflow docs.
  `docs/plans/gameplay-scenarios.md` is the ambiguous case: it still has
  product-shape value, but it is currently milestone-plan material, not a
  canonical runtime spec. Recommended disposition is move to `backlog/docs/`
  unless a later validation task promotes a refined scenario set into canonical
  reference docs.
- `docs/superpowers/plans/*.md` and `docs/superpowers/specs/*.md` are
  implementation-plan/spec artifacts for already-tracked task waves (event log,
  admin console, integration gaps). They should move to completed-plan or
  archive surfaces, not remain in active `docs/`.
- `docs/review/HARDENING.md` and
  `docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md` should only survive if
  moved into `backlog/docs/` as reusable process prompts. `docs/review/`
  itself should not remain an active canonical directory.
- `docs/review/META_ANALYSIS.md` and the `docs/research/DHI_*` corpus are
  historical analysis, not current operator/contributor truth, and should be
  archived.
- `docs/operations/INCIDENT_RUNBOOKS.md` should merge into
  `docs/system/OPERATIONS_RUNBOOK.md`. `docs/operations/STABILITY_DEPLOYMENT_GUIDE.md`
  plus the `docs/deployment/*.md` set should collapse into one canonical
  deployment reference plus the runbook, with one-off fix notes archived.
- `backlog/docs/doc-1 - Phalanx Duel Glossary.md` is fully superseded by
  `docs/system/GLOSSARY.md` and is ready for retirement once the duplicate-doc
  consolidation task executes.
- `CHANGELOG.md` was materially behind the current `0.5.0-rc.1` repo state.
  Refreshed it with a bounded top-level release entry so the release-critical
  root docs are not obviously stale while the broader cleanup continues.
- The active observability docs and helper commands still used legacy
  backend-specific naming even though the supported path is a local collector
  forwarding to the centralized LGTM stack. Normalized the active
  script/config/doc/env surfaces to LGTM terminology.

## Verification

- `pnpm exec markdownlint-cli2 CHANGELOG.md AGENTS.md "backlog/docs/doc-2 - Documentation Consolidation Audit.md" "backlog/tasks/task-139 - Stale-and-Superseded-Documentation-Review.md" "backlog/tasks/task-141 - AI-Agent-Instruction-Cleanup.md" --config .markdownlint-cli2.jsonc`
- `rg --files docs/plans docs/superpowers docs/review docs/research docs/deployment docs/operations`
- `sed -n '1,120p' docs/deployment/STAGING_SETUP_GUIDE.md docs/deployment/STAGING_DEPLOYMENT.md docs/deployment/FLYIO_PRODUCTION_GUIDE.md docs/deployment/FLYIO_CONFIG_FIX.md docs/operations/STABILITY_DEPLOYMENT_GUIDE.md docs/operations/INCIDENT_RUNBOOKS.md`
- `sed -n '1,120p' docs/superpowers/plans/2026-03-15-event-log-verification.md docs/superpowers/plans/2026-03-16-admin-console.md docs/superpowers/specs/2026-03-16-admin-console-design.md docs/research/DHI_EVALUATION_SUMMARY.md docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md`
- `sed -n '1,200p' docs/plans/api-completeness-dag.md docs/plans/gameplay-scenarios.md docs/plans/2026-03-21-stability-playability-dag.md docs/review/HARDENING.md docs/review/META_ANALYSIS.md docs/research/DHI_ARTIFACT_INDEX.md docs/research/DHI_EVALUATION_REPORT.md backlog/docs/doc-1 - Phalanx Duel Glossary.md docs/system/GLOSSARY.md`
- `rg -n "infra:otel:lgtm|LGTM_OTLP_ENDPOINT|collector-lgtm|run-otel-lgtm" README.md AGENTS.md .env.example package.json docker-compose.yml otel-collector-config.yaml otel-collector-config.deploy.yaml bin/maint docs`

## Do Not Break

- Do not delete solely because a file is old.
- Do not trust filename recency over repo behavior and code evidence.
<!-- SECTION:NOTES:END -->

## Expected Outputs

- Reviewed stale/superseded list
- Human-review flags where evidence is insufficient
- Exact archive/delete/merge recommendations
