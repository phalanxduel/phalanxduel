---
id: TASK-142
title: Release-facing Documentation Validation
status: Done
assignee:
  - '@codex'
created_date: '2026-03-31 17:38'
updated_date: '2026-03-31 19:25'
labels: []
dependencies:
  - TASK-138
  - TASK-140
  - TASK-141
references:
  - README.md
  - docs/README.md
  - docs/ops/runbook.md
priority: high
ordinal: 57000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Validate that release-facing, onboarding-critical, and externally expected docs
remain accessible and accurate after consolidation work.

## Rationale

Pre-release cleanup fails if it hides or breaks the docs that humans actually
need to ship, operate, and assess the repo.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Release-critical docs remain easy to locate from root and docs indexes.
- [x] #2 Onboarding, legal, API, and operational entry points still work after consolidation.
- [x] #3 Consolidation does not strand users behind Backlog-only navigation for docs that should remain standard repo artifacts.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Review the repo-facing entry points (`README.md`, `docs/README.md`,
   `.github/CONTRIBUTING.md`, `.github/SECURITY.md`) after the consolidation
   and archival passes.
2. Add or correct any missing links so release-facing artifacts remain easy to
   locate without requiring Backlog navigation.
3. Record verification evidence that the canonical entry points still point at
   active docs instead of archived or superseded surfaces.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Release-facing and onboarding-critical surfaces were already structurally
  healthy after `TASK-138` and `TASK-140`; this pass focused on discoverability
  rather than another large content move.
- Added explicit links to `CHANGELOG.md` and `.github/SECURITY.md` from the
  root `README.md` so pre-release milestones and the vulnerability-reporting
  path remain visible from the main repo entry point.
- Expanded `docs/README.md` root-level resources to include the changelog,
  security policy, and license so the canonical docs index still exposes the
  standard repo artifacts humans expect to find outside Backlog-managed docs.
- Updated `.github/CONTRIBUTING.md` to include direct links to the changelog
  and security policy alongside the existing canonical contributor references.
- Confirmed the active root and docs indexes do not strand users behind
  Backlog-only navigation after the archive pass.
- The verification grep below targeted the now-retired archive and review paths
  that still existed when this task ran. Those paths are historical
  verification context, not current navigation targets.

## Verification

- `pnpm exec markdownlint-cli2 README.md docs/README.md .github/CONTRIBUTING.md AGENTS.md "backlog/tasks/task-142 - Release-facing-Documentation-Validation.md" --config .markdownlint-cli2.jsonc`
- `rg -n "CHANGELOG.md|SECURITY.md|LICENSE" README.md docs/README.md .github/CONTRIBUTING.md`
- `rg -n "archive/docs/2026-03-31|docs/review/|docs/research/" README.md docs/README.md .github/CONTRIBUTING.md AGENTS.md`

## Do Not Break

- Do not sacrifice normal contributor expectations for internal cleanup convenience.
<!-- SECTION:NOTES:END -->

## Expected Outputs

- Validated release-facing doc map
- Updated indexes and root pointers
- Confirmed externally expected doc locations
