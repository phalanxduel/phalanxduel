---
id: TASK-136
title: Documentation Inventory and Audit Finalization
status: Done
assignee:
  - '@codex'
created_date: '2026-03-31 17:36'
updated_date: '2026-03-31 15:02'
labels: []
dependencies:
  - TASK-135
references:
  - backlog/docs/doc-2 - Documentation Consolidation Audit.md
priority: high
ordinal: 50000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Finalize the documentation inventory and validate that the audit accurately
captures every meaningful documentation surface, duplicate cluster, and risky
stale artifact relevant to pre-release cleanup.

## Rationale

Broad cleanup is unsafe until the inventory is trustworthy. This task is the
quality gate for all later consolidation work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The audit covers root docs, `docs/`, Backlog doc surfaces, agent instructions, historical archive/research/review materials, and generated artifact families.
- [x] #2 Each inventoried item has a purpose, audience, canonicality assessment, and recommended action label.
- [x] #3 Duplicate clusters, stale-doc candidates, superseded-doc candidates, and release-critical surfaces are explicitly listed.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Cross-check the current audit against remaining documentation surfaces not
   yet sampled deeply: `.github` markdown/instructions, generated `docs/api`
   artifacts, root/archive summaries, and active `docs/system` supporting docs.
2. Tighten the duplicate-cluster and canonicality assessments where repo
   evidence shows overlap or ambiguity.
3. Update the audit report with any missing surfaces, clarified labels, and
   refined recommendations.
4. Verify markdown integrity and return the task for review.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Started from the first-pass audit created under `TASK-135`.
- This task is intentionally the gate before canonical mapping and broad cleanup
  so later tasks do not churn on an incomplete inventory.
- Began the second-pass audit sweep across `.github` markdown/instructions,
  narrow `docs/system` references, and generated-doc boundaries.
- Confirmed that `.github/CONTRIBUTING.md`, `.github/SECURITY.md`,
  `.github/CODE_OF_CONDUCT.md`, and `.github/PULL_REQUEST_TEMPLATE.md` should be
  treated as repo-facing artifacts outside Backlog-managed consolidation rather
  than as candidates for relocation into `backlog/`.
- Confirmed that `docs/system/MATCH-DB-VERIFICATION.md` is a narrow operational
  reference rather than an obvious dead artifact, while
  `docs/system/DEPENDENCY_VULNERABILITY_REPORT.md` looks more like a generated
  or audit-era report that should be reviewed for archival.
- Confirmed that `docs/review/HARDENING.md` is a process prompt rather than a
  canonical active reference doc, and that the former root `archive/*.md`
  corpus was historical execution-summary material that should not compete with
  active documentation surfaces.

- Root `archive/` references in this task and the linked audit are historical
  inventory context only. The live repo now uses `backlog/completed/`,
  `backlog/archive/`, `docs/history/`, and git history instead of a root
  `archive/` directory.

## Verification

- `find .github -maxdepth 3 -type f \( -name '*.md' -o -name '*.instructions.md' \) | sort`
- `sed -n '1,200p' docs/system/MATCH-DB-VERIFICATION.md docs/system/DEPENDENCY_VULNERABILITY_REPORT.md docs/operations/CI_CD_PIPELINE.md`
- `rg -n "generated|auto-generated|do not edit|generated artifact|typedoc|openapi|asyncapi" docs/api docs/system docs -g '!node_modules'`
- `sed -n '1,160p' docs/review/HARDENING.md docs/review/META_ANALYSIS.md docs/research/DHI_ARTIFACT_INDEX.md docs/research/DHI_EVALUATION_REPORT.md docs/plans/api-completeness-dag.md docs/plans/gameplay-scenarios.md docs/plans/2026-03-21-stability-playability-dag.md`
- Historical at the time this task was executed: `find archive -maxdepth 2 -type f -name '*.md' | sort`
- `sed -n '1,160p' docs/system/ADMIN.md docs/system/EXTERNAL_REFERENCES.md docs/system/RISKS.md docs/system/README.md .github/SECURITY.md .github/PULL_REQUEST_TEMPLATE.md .github/CODE_OF_CONDUCT.md`

## Do Not Break

- Do not perform broad deletion in the audit-finalization step.
- Do not silently treat generated artifacts or legal/release docs as disposable.
<!-- SECTION:NOTES:END -->

## Expected Outputs

- Finalized audit inventory
- Resolved gaps or missing clusters
- Updated recommendations where repo evidence changed
