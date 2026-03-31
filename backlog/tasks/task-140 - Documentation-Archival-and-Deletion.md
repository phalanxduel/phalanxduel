---
id: TASK-140
title: Documentation Archival and Deletion
status: Done
assignee:
  - '@codex'
created_date: '2026-03-31 17:37'
updated_date: '2026-03-31 19:25'
labels: []
dependencies:
  - TASK-138
  - TASK-139
  - TASK-141
references:
  - backlog/docs/doc-2 - Documentation Consolidation Audit.md
  - docs/system/ARCHIVAL_POLICY.md
priority: medium
ordinal: 56000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Execute the approved archival and deletion actions from the documentation audit
in small, reviewable units.

## Rationale

Cleanup only becomes real when obsolete material leaves active surfaces.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Historical or superseded docs are archived or deleted according to the approved matrix.
- [x] #2 Active directories no longer contain clearly dead or historical process material that belongs in completed-history surfaces.
- [x] #3 Any retained historical files are clearly labeled or located in archival surfaces.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Start with pointer-only docs that no longer need to stay in active
   directories after duplicate consolidation.
2. Move those files into an archival surface with stable filenames.
3. Update any active references that would otherwise break or still imply the
   archived path is canonical.
4. Keep broader historical-review surfaces for later slices if they still have
   active workflow references that need more careful rewiring.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- First archival tranche: moved the old deployment/Fly pointer docs plus the
  old incident-runbook pointer out of active `docs/` and into a dated
  historical bucket that was later retired along with the root `archive/`
  directory.
- Archived in this tranche:
  `docs/operations/INCIDENT_RUNBOOKS.md`,
  `docs/operations/STABILITY_DEPLOYMENT_GUIDE.md`,
  `docs/deployment/STAGING_SETUP_GUIDE.md`,
  `docs/deployment/STAGING_DEPLOYMENT.md`,
  `docs/deployment/FLYIO_PRODUCTION_GUIDE.md`, and
  `docs/deployment/FLYIO_CONFIG_FIX.md`.
- Updated the remaining active system env reference to point at the canonical
  deployment checklist instead of the archived Fly-specific guide.
- Archived the superseded Backlog glossary pointer
  (`doc-1 - Phalanx Duel Glossary.md`) once the canonical glossary routing was
  fully stable.
- Archived the `docs/review/HARDENING.md` and
  `docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md` shims after updating the
  active backlog docs to point directly at `backlog/docs/doc-4` and
  `backlog/docs/doc-5`.
- Archived the remaining historical `docs/review/META_ANALYSIS.md` synthesis
  and the `docs/research/DHI_*` corpus into the same dated archive bucket so
  the active `docs/review/` and `docs/research/` surfaces no longer compete
  with canonical docs.
- The root `archive/` directory was deleted later under `TASK-150`. The
  archive-path references below are preserved as execution history for this
  task, not as current placement guidance.

## Verification

- Historical at the time this task was executed:
  `test -f archive/docs/2026-03-31/INCIDENT_RUNBOOKS.md`
- Historical at the time this task was executed:
  `test -f archive/docs/2026-03-31/STABILITY_DEPLOYMENT_GUIDE.md`
- Historical at the time this task was executed:
  `test -f archive/docs/2026-03-31/STAGING_SETUP_GUIDE.md`
- Historical at the time this task was executed:
  `test -f archive/docs/2026-03-31/STAGING_DEPLOYMENT.md`
- Historical at the time this task was executed:
  `test -f archive/docs/2026-03-31/FLYIO_PRODUCTION_GUIDE.md`
- Historical at the time this task was executed:
  `test -f archive/docs/2026-03-31/FLYIO_CONFIG_FIX.md`
- Historical at the time this task was executed:
  `test -f "archive/docs/2026-03-31/doc-1 - Phalanx Duel Glossary.md"`
- Historical at the time this task was executed:
  `test -f archive/docs/2026-03-31/HARDENING.md`
- Historical at the time this task was executed:
  `test -f archive/docs/2026-03-31/PRODUCTION_PATH_REVIEW_GUIDELINE.md`
- Historical at the time this task was executed:
  `test -f archive/docs/2026-03-31/META_ANALYSIS.md`
- Historical at the time this task was executed:
  `test -f archive/docs/2026-03-31/DHI_ARTIFACT_INDEX.md`
- Historical at the time this task was executed:
  `test -f archive/docs/2026-03-31/DHI_EVALUATION_REPORT.md`
- Historical at the time this task was executed:
  `test -f archive/docs/2026-03-31/DHI_EVALUATION_RESEARCH.md`
- Historical at the time this task was executed:
  `test -f archive/docs/2026-03-31/DHI_EVALUATION_SUMMARY.md`
- Historical at the time this task was executed:
  `test -f archive/docs/2026-03-31/DHI_vs_ALPINE_COMPARISON.md`
- `! test -f docs/operations/INCIDENT_RUNBOOKS.md`
- `! test -f docs/operations/STABILITY_DEPLOYMENT_GUIDE.md`
- `! test -f docs/deployment/STAGING_SETUP_GUIDE.md`
- `! test -f docs/deployment/STAGING_DEPLOYMENT.md`
- `! test -f docs/deployment/FLYIO_PRODUCTION_GUIDE.md`
- `! test -f docs/deployment/FLYIO_CONFIG_FIX.md`
- `! test -f "backlog/docs/doc-1 - Phalanx Duel Glossary.md"`
- `! test -f docs/review/HARDENING.md`
- `! test -f docs/review/PRODUCTION_PATH_REVIEW_GUIDELINE.md`
- `! test -f docs/review/META_ANALYSIS.md`
- `pnpm exec markdownlint-cli2 docs/system/ENVIRONMENT_VARIABLES.md "backlog/tasks/task-140 - Documentation-Archival-and-Deletion.md" --config .markdownlint-cli2.jsonc`
- `rg -n "DEPLOYMENT_CHECKLIST.md|FLYIO_PRODUCTION_GUIDE.md" docs/system/ENVIRONMENT_VARIABLES.md`

## Do Not Break

- Do not remove release-critical, legal, onboarding-critical, or generated-public artifacts without explicit verification.
<!-- SECTION:NOTES:END -->

## Expected Outputs

- Archived files
- Deleted dead files
- Updated references
